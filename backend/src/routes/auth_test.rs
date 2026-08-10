use axum::{ extract::State, http::StatusCode };

use mongodb::bson::{ doc, DateTime };

use crate::{ auth::AuthenticatedUser, models::user::User, AppState };

pub async fn auth_test(
    State(state): State<AppState>,
    user: AuthenticatedUser
) -> Result<String, (StatusCode, &'static str)> {
    let users = state.mongo.database("securestart").collection::<User>("users");

    let existing_user = users
        .find_one(doc! {
            "auth0_sub": &user.sub
        }).await
        .map_err(|_| { (StatusCode::INTERNAL_SERVER_ERROR, "Database error") })?;

    if existing_user.is_some() {
        return Ok("Existing user found".to_string());
    }

    // Temporary email until we decide how the backend receives it securely.
    let new_user = User {
        id: None,
        auth0_sub: user.sub,
        email: "temporary@example.com".to_string(),
        created_at: DateTime::now(),
    };

    users
        .insert_one(new_user).await
        .map_err(|_| { (StatusCode::INTERNAL_SERVER_ERROR, "Database error") })?;

    Ok("New user created".to_string())
}
