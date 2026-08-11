use serde::{ Deserialize, Serialize };
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
    pub content: String,
}
