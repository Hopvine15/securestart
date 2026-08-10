use axum::{extract::State, http::StatusCode};

use crate::{
    AppState,
    auth::AuthenticatedUser,
    repositories::user_repository::{self, UserProvisioning},
};

pub async fn auth_test(
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<String, (StatusCode, &'static str)> {
    let outcome = user_repository::find_or_create_user(&state.users, &user.sub, &user.email)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Database error"))?;

    match outcome {
        UserProvisioning::Existing => Ok("Existing user found".to_string()),
        UserProvisioning::Created => Ok("New user created".to_string()),
    }
}
