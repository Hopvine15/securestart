use mongodb::bson::{ oid::ObjectId, DateTime };
use serde::{ Deserialize, Serialize };

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    pub auth0_sub: String,
    pub email: String,
    pub created_at: DateTime,
}
