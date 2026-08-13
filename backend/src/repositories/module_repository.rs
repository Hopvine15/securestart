use async_trait::async_trait;
use mongodb::{Client, bson::doc};

use crate::models::training_module::TrainingModule;

/// Storage boundary for training modules.
#[async_trait]
pub trait ModuleRepository: Send + Sync {
    async fn find_all(&self) -> Result<Vec<TrainingModule>, String>;
    async fn find_by_id(&self, id: &str) -> Result<Option<TrainingModule>, String>;
}

#[derive(Clone)]
pub struct MongoModuleRepository {
    client: Client,
}

impl MongoModuleRepository {
    pub fn new(client: Client) -> Self {
        Self { client }
    }
}

#[async_trait]
impl ModuleRepository for MongoModuleRepository {
    async fn find_all(&self) -> Result<Vec<TrainingModule>, String> {
        let modules = self
            .client
            .database("securestart")
            .collection::<TrainingModule>("modules");
        let mut cursor = modules
            .find(doc! {})
            .await
            .map_err(|error| error.to_string())?;
        let mut results = Vec::new();

        while cursor.advance().await.map_err(|error| error.to_string())? {
            results.push(
                cursor
                    .deserialize_current()
                    .map_err(|error| error.to_string())?,
            );
        }

        Ok(results)
    }

    async fn find_by_id(&self, id: &str) -> Result<Option<TrainingModule>, String> {
        let modules = self
            .client
            .database("securestart")
            .collection::<TrainingModule>("modules");

        modules
            .find_one(doc! { "id": id })
            .await
            .map_err(|error| error.to_string())
    }
}
