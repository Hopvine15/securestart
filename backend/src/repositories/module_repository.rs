use async_trait::async_trait;

use crate::models::training_module::TrainingModule;

/// Storage boundary for training modules.
#[async_trait]
pub trait ModuleRepository: Send + Sync {
    async fn find_all(&self) -> Result<Vec<TrainingModule>, String>;
}
