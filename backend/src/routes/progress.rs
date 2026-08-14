use std::collections::HashMap;

use axum::{Json, extract::State, http::StatusCode};
use mongodb::bson::DateTime;
use serde::Serialize;

use crate::{AppState, auth::AuthenticatedUser};

#[derive(Debug, Serialize)]
pub struct ModuleProgress {
    pub module_id: String,
    pub best_score: u8,
    pub completed_at: DateTime,
}

#[derive(Debug, Serialize)]
pub struct ProgressResponse {
    pub completed_modules: Vec<ModuleProgress>,
    pub completed_count: usize,
}

/// Returns the authenticated learner's completed modules.
///
/// A module is listed once: `best_score` is the learner's highest result across
/// all attempts, while `completed_at` is the most recent completion time.
#[utoipa::path(
    get,
    path = "/api/progress",
    tag = "Learner Progress",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Learner progress returned"),
        (status = 401, description = "Missing or invalid bearer token"),
        (status = 500, description = "Database error")
    )
)]
pub async fn get_progress(
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<Json<ProgressResponse>, (StatusCode, &'static str)> {
    let attempts = state
        .quiz_attempts
        .find_by_user(&user.sub)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Database error"))?;

    let mut progress_by_module: HashMap<String, ModuleProgress> = HashMap::new();

    for attempt in attempts {
        progress_by_module
            .entry(attempt.module_id.clone())
            .and_modify(|progress| {
                progress.best_score = progress.best_score.max(attempt.score);
                progress.completed_at = progress.completed_at.max(attempt.completed_at);
            })
            .or_insert(ModuleProgress {
                module_id: attempt.module_id,
                best_score: attempt.score,
                completed_at: attempt.completed_at,
            });
    }

    let mut completed_modules: Vec<_> = progress_by_module.into_values().collect();
    completed_modules.sort_unstable_by(|left, right| left.module_id.cmp(&right.module_id));
    let completed_count = completed_modules.len();

    Ok(Json(ProgressResponse {
        completed_modules,
        completed_count,
    }))
}
