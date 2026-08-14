use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};

/// A completed quiz attempt retained for a learner.
///
/// `user_id` is the authenticated Auth0 subject, matching the identity already
/// used by the application's user provisioning flow.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QuizAttempt {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: String,
    pub module_id: String,
    pub score: u8,
    pub completed_at: DateTime,
}

#[derive(Clone, Debug, Deserialize)]
pub struct QuizAttemptRequest {
    pub module_id: String,
    pub answers: Vec<SubmittedAnswer>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct SubmittedAnswer {
    pub question_id: String,
    pub selected_answer: String,
}
