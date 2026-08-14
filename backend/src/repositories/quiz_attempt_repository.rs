use async_trait::async_trait;

use crate::models::quiz_attempt::QuizAttempt;

/// Storage boundary for completed quiz attempts.
#[async_trait]
pub trait QuizAttemptRepository: Send + Sync {
    async fn create(&self, attempt: QuizAttempt) -> Result<(), String>;
}

/// Keeps the application bootable while the quiz-attempt persistence adapter is
/// intentionally deferred until the GREEN implementation.
#[derive(Default)]
pub struct UnavailableQuizAttemptRepository;

#[async_trait]
impl QuizAttemptRepository for UnavailableQuizAttemptRepository {
    async fn create(&self, _attempt: QuizAttempt) -> Result<(), String> {
        Err("Quiz attempt repository is not configured".to_string())
    }
}
