use async_trait::async_trait;
use mongodb::Client;

use crate::models::quiz_attempt::QuizAttempt;

/// Storage boundary for completed quiz attempts.
#[async_trait]
pub trait QuizAttemptRepository: Send + Sync {
    async fn create(&self, attempt: QuizAttempt) -> Result<(), String>;
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
}
