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

/// A training module suitable for sending to a learner.
///
/// Questions are deliberately fetched through their own answer-safe endpoint.
#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct TrainingModuleResponse {
    pub id: String,
    pub title: String,
    pub description: String,
    pub learning_objective: String,
    pub estimated_minutes: u32,
    pub content: String,
}

impl From<&TrainingModule> for TrainingModuleResponse {
    fn from(module: &TrainingModule) -> Self {
        Self {
            id: module.id.clone(),
            title: module.title.clone(),
            description: module.description.clone(),
            learning_objective: module.learning_objective.clone(),
            estimated_minutes: module.estimated_minutes,
            content: module.content.clone(),
        }
    }
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

/// A quiz question suitable for sending to a learner.
///
/// The answer key remains in `QuizQuestion` for persistence and scoring, but
/// is deliberately not part of this HTTP response type.
#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct QuizQuestionResponse {
    pub id: String,
    pub question: String,
    pub options: Vec<QuestionOption>,
}

impl From<&QuizQuestion> for QuizQuestionResponse {
    fn from(question: &QuizQuestion) -> Self {
        Self {
            id: question.id.clone(),
            question: question.question.clone(),
            options: question.options.clone(),
        }
    }
}
