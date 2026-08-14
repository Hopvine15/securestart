use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};

use crate::{
    AppState,
    auth::AuthenticatedUser,
    models::training_module::{QuizQuestionResponse, TrainingModuleResponse},
};

#[utoipa::path(
    get,
    path = "/api/modules",
    tag = "Training Modules",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Available training modules", body = [TrainingModuleResponse]),
        (status = 401, description = "Missing or invalid bearer token"),
        (status = 500, description = "Database error")
    )
)]
pub async fn get_modules(
    State(state): State<AppState>,
    _user: AuthenticatedUser,
) -> Result<Json<Vec<TrainingModuleResponse>>, (StatusCode, &'static str)> {
    let modules = state
        .modules
        .find_all()
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Database error"))?;

    Ok(Json(
        modules.iter().map(TrainingModuleResponse::from).collect(),
    ))
}

#[utoipa::path(
    get,
    path = "/api/modules/{id}",
    tag = "Training Modules",
    params(("id" = String, Path, description = "Application-facing module identifier")),
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Training module", body = TrainingModuleResponse),
        (status = 401, description = "Missing or invalid bearer token"),
        (status = 404, description = "Training module not found"),
        (status = 500, description = "Database error")
    )
)]
pub async fn get_module_by_id(
    State(state): State<AppState>,
    _user: AuthenticatedUser,
    Path(id): Path<String>,
) -> Result<Json<TrainingModuleResponse>, (StatusCode, &'static str)> {
    let module = state
        .modules
        .find_by_id(&id)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Database error"))?
        .ok_or((StatusCode::NOT_FOUND, "Module not found"))?;

    Ok(Json(TrainingModuleResponse::from(&module)))
}

#[utoipa::path(
    get,
    path = "/api/modules/{id}/questions",
    tag = "Training Modules",
    params(("id" = String, Path, description = "Application-facing module identifier")),
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Quiz questions without answer keys", body = [QuizQuestionResponse]),
        (status = 401, description = "Missing or invalid bearer token"),
        (status = 404, description = "Training module not found"),
        (status = 500, description = "Database error")
    )
)]
pub async fn get_module_questions(
    State(state): State<AppState>,
    _user: AuthenticatedUser,
    Path(id): Path<String>,
) -> Result<Json<Vec<QuizQuestionResponse>>, (StatusCode, &'static str)> {
    let module = state
        .modules
        .find_by_id(&id)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Database error"))?
        .ok_or((StatusCode::NOT_FOUND, "Module not found"))?;

    Ok(Json(
        module
            .questions
            .iter()
            .map(QuizQuestionResponse::from)
            .collect(),
    ))
}
