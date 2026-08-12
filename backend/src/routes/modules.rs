use axum::{ Json, extract::State, http::StatusCode };

use crate::{ AppState, auth::AuthenticatedUser, models::training_module::TrainingModule };

#[utoipa::path(
    get,
    path = "/api/modules",
    tag = "Training Modules",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Available training modules", body = [TrainingModule]),
        (status = 401, description = "Missing or invalid bearer token"),
        (status = 500, description = "Database error")
    )
)]
pub async fn get_modules(
    State(state): State<AppState>,
    _user: AuthenticatedUser
) -> Result<Json<Vec<TrainingModule>>, (StatusCode, &'static str)> {
    let modules = state.modules
        .find_all().await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Database error"))?;

    Ok(Json(modules))
}
