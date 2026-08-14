//! seed command for the training modules
//!
//! Run from `backend/` with `cargo run --bin seed_modules` after setting
//! `MONGODB_URI` in `.env`.

#[path = "../database.rs"]
mod database;
#[path = "../models/mod.rs"]
mod models;

use mongodb::{
    bson::{doc, to_document},
    options::UpdateOptions,
};

use crate::models::training_module::TrainingModule;

fn initial_modules() -> Vec<TrainingModule> {
    serde_json::from_str(include_str!("seed_modules.json"))
        .expect("embedded training modules must contain valid JSON")
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let mongodb_uri = std::env::var("MONGODB_URI").expect("MONGODB_URI must be set");
    let client = database::create_client(&mongodb_uri).await;
    database::setup_indexes(&client).await;

    let modules = client
        .database("securestart")
        .collection::<TrainingModule>("modules");
    let upsert_options = UpdateOptions::builder().upsert(true).build();

    for module in initial_modules() {
        let document = to_document(&module).expect("training module must serialize to BSON");
        modules
            .update_one(doc! { "id": &module.id }, doc! { "$set": document })
            .with_options(upsert_options.clone())
            .await
            .expect("failed to seed training module");
        println!("Seeded module: {}", module.title);
    }

    println!("Training module seed complete.");
}
