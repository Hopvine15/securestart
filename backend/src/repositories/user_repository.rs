use async_trait::async_trait;
use mongodb::{
    Client,
    bson::{DateTime, doc},
};

use crate::models::user::User;

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_auth0_sub(&self, auth0_sub: &str) -> Result<Option<User>, String>;
    async fn create_user(&self, auth0_sub: &str, email: &str) -> Result<User, String>;
}

#[derive(Clone)]
pub struct MongoUserRepository {
    client: Client,
}

impl MongoUserRepository {
    pub fn new(client: Client) -> Self {
        Self { client }
    }
}

#[async_trait]
impl UserRepository for MongoUserRepository {
    async fn find_by_auth0_sub(&self, auth0_sub: &str) -> Result<Option<User>, String> {
        let users = self
            .client
            .database("securestart")
            .collection::<User>("users");

        users
            .find_one(doc! { "auth0_sub": auth0_sub })
            .await
            .map_err(|error| error.to_string())
    }

    async fn create_user(&self, auth0_sub: &str, email: &str) -> Result<User, String> {
        let users = self
            .client
            .database("securestart")
            .collection::<User>("users");
        let user = User {
            id: None,
            auth0_sub: auth0_sub.to_string(),
            email: email.to_string(),
            created_at: DateTime::now(),
        };

        users
            .insert_one(user.clone())
            .await
            .map_err(|error| error.to_string())?;

        Ok(user)
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum UserProvisioning {
    Existing,
    Created,
}

pub async fn find_or_create_user<R: UserRepository>(
    repository: &R,
    auth0_sub: &str,
    email: &str,
) -> Result<UserProvisioning, String> {
    if repository.find_by_auth0_sub(auth0_sub).await?.is_some() {
        return Ok(UserProvisioning::Existing);
    }

    repository.create_user(auth0_sub, email).await?;

    Ok(UserProvisioning::Created)
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use super::*;

    #[derive(Default)]
    struct InMemoryUserRepository {
        users: Mutex<Vec<User>>,
        fail_find: bool,
        fail_create: bool,
    }

    impl InMemoryUserRepository {
        fn with_user(auth0_sub: &str, email: &str) -> Self {
            Self {
                users: Mutex::new(vec![User {
                    id: None,
                    auth0_sub: auth0_sub.to_string(),
                    email: email.to_string(),
                    created_at: DateTime::now(),
                }]),
                ..Default::default()
            }
        }

        fn failing_on_create() -> Self {
            Self {
                fail_create: true,
                ..Default::default()
            }
        }

        fn len(&self) -> usize {
            self.users.lock().expect("repository lock poisoned").len()
        }
    }

    #[async_trait]
    impl UserRepository for InMemoryUserRepository {
        async fn find_by_auth0_sub(&self, auth0_sub: &str) -> Result<Option<User>, String> {
            if self.fail_find {
                return Err("find failed".to_string());
            }

            Ok(self
                .users
                .lock()
                .map_err(|_| "repository lock poisoned".to_string())?
                .iter()
                .find(|user| user.auth0_sub == auth0_sub)
                .cloned())
        }

        async fn create_user(&self, auth0_sub: &str, email: &str) -> Result<User, String> {
            if self.fail_create {
                return Err("create failed".to_string());
            }

            let user = User {
                id: None,
                auth0_sub: auth0_sub.to_string(),
                email: email.to_string(),
                created_at: DateTime::now(),
            };
            self.users
                .lock()
                .map_err(|_| "repository lock poisoned".to_string())?
                .push(user.clone());

            Ok(user)
        }
    }

    #[tokio::test]
    async fn creates_user_when_user_does_not_exist() {
        let repository = InMemoryUserRepository::default();

        let result = find_or_create_user(&repository, "auth0|new-user", "new@example.com").await;

        assert_eq!(result, Ok(UserProvisioning::Created));
        assert_eq!(repository.len(), 1);
    }

    #[tokio::test]
    async fn returns_existing_when_user_already_exists() {
        let repository =
            InMemoryUserRepository::with_user("auth0|existing", "existing@example.com");

        let result =
            find_or_create_user(&repository, "auth0|existing", "existing@example.com").await;

        assert_eq!(result, Ok(UserProvisioning::Existing));
        assert_eq!(repository.len(), 1);
    }

    #[tokio::test]
    async fn repeated_calls_do_not_create_duplicate_users() {
        let repository = InMemoryUserRepository::default();

        let first = find_or_create_user(&repository, "auth0|repeat", "repeat@example.com").await;
        let second = find_or_create_user(&repository, "auth0|repeat", "repeat@example.com").await;

        assert_eq!(first, Ok(UserProvisioning::Created));
        assert_eq!(second, Ok(UserProvisioning::Existing));
        assert_eq!(repository.len(), 1);
    }

    #[tokio::test]
    async fn repository_error_is_returned() {
        let repository = InMemoryUserRepository::failing_on_create();

        let result = find_or_create_user(&repository, "auth0|error", "error@example.com").await;

        assert_eq!(result, Err("create failed".to_string()));
    }
}
