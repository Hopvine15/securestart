use mongodb::{
    Client,
    bson::{DateTime, doc},
    error::Result,
};

use crate::models::user::User;

pub enum UserProvisioning {
    Existing,
    Created,
}

pub async fn find_or_create_user(
    client: &Client,
    auth0_sub: &str,
    email: &str,
) -> Result<UserProvisioning> {
    let users = client.database("securestart").collection::<User>("users");

    if users
        .find_one(doc! { "auth0_sub": auth0_sub })
        .await?
        .is_some()
    {
        return Ok(UserProvisioning::Existing);
    }

    let user = User {
        id: None,
        auth0_sub: auth0_sub.to_string(),
        email: email.to_string(),
        created_at: DateTime::now(),
    };

    users.insert_one(user).await?;

    Ok(UserProvisioning::Created)
}
