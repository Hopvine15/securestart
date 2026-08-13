use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// A training module exposed by my API
///
/// The identifier is deliberately application-facing rather than a MongoDB
/// `ObjectId`, keeping the HTTP contract independent of the database
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct TrainingModule {
    pub id: String,
    pub title: String,
    pub description: String,
    pub learning_objective: String,
    pub estimated_minutes: u32,
    pub content: String,
    #[serde(default)]
    pub questions: Vec<QuizQuestion>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct QuizQuestion {
    pub id: String,
    pub question: String,
    pub options: Vec<QuestionOption>,
    pub correct_answer: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct QuestionOption {
    pub id: String,
    pub text: String,
}
