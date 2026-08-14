use async_trait::async_trait;
use futures_util::TryStreamExt;
use mongodb::{Client, bson::doc};

use crate::models::quiz_attempt::QuizAttempt;

/// Storage boundary for completed quiz attempts.
#[async_trait]
pub trait QuizAttemptRepository: Send + Sync {
    async fn create(&self, attempt: QuizAttempt) -> Result<(), String>;
    async fn find_by_user(&self, user_id: &str) -> Result<Vec<QuizAttempt>, String>;
}

#[derive(Clone)]
pub struct MongoQuizAttemptRepository {
    client: Client,
}

impl MongoQuizAttemptRepository {
    pub fn new(client: Client) -> Self {
        Self { client }
    }
}

#[async_trait]
impl QuizAttemptRepository for MongoQuizAttemptRepository {
    async fn create(&self, attempt: QuizAttempt) -> Result<(), String> {
        self.client
            .database("securestart")
            .collection::<QuizAttempt>("quiz_attempts")
            .insert_one(attempt)
            .await
            .map_err(|error| error.to_string())?;

        Ok(())
    }

    async fn find_by_user(&self, user_id: &str) -> Result<Vec<QuizAttempt>, String> {
        self.client
            .database("securestart")
            .collection::<QuizAttempt>("quiz_attempts")
            .find(doc! { "user_id": user_id })
            .await
            .map_err(|error| error.to_string())?
            .try_collect()
            .await
            .map_err(|error| error.to_string())
    }
}

/// Used only by route tests that do not exercise quiz-attempt persistence.
#[cfg(test)]
pub struct UnavailableQuizAttemptRepository;

#[cfg(test)]
#[async_trait]
impl QuizAttemptRepository for UnavailableQuizAttemptRepository {
    async fn create(&self, _attempt: QuizAttempt) -> Result<(), String> {
        Err("Quiz attempt repository is not configured".to_string())
    }

    async fn find_by_user(&self, _user_id: &str) -> Result<Vec<QuizAttempt>, String> {
        Err("Quiz attempt repository is not configured".to_string())
    }
}
