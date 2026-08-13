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
    vec![
        TrainingModule {
            id: "ai-phishing-risks".to_string(),
            title: "AI Phishing Risks".to_string(),
            description: "Spot convincing phishing messages made more persuasive with AI.".to_string(),
            learning_objective: "Identify common signs of AI-assisted phishing and safely verify suspicious requests.".to_string(),
            estimated_minutes: 10,
            content: "AI can help attackers create believable phishing emails, messages and fake websites.\n\nPause before acting on urgent requests. Check the sender and links independently, and report anything suspicious.".to_string(),
        },
        TrainingModule {
            id: "secure-ai-assisted-coding".to_string(),
            title: "Secure AI-Assisted Coding".to_string(),
            description: "Review AI-generated code before it reaches your project.".to_string(),
            learning_objective: "Review AI-generated code for common security risks before it is committed or deployed.".to_string(),
            estimated_minutes: 10,
            content: "Treat AI-generated code as a draft, not trusted source code.\n\nCheck authentication, input validation, secrets handling and dependencies before committing. Test the code and use your team's review process.".to_string(),
        },
        TrainingModule {
            id: "protecting-sensitive-data-with-ai".to_string(),
            title: "Protecting Sensitive Data When Using AI".to_string(),
            description: "Keep customer, company and personal data out of unsafe prompts.".to_string(),
            learning_objective: "Recognise sensitive data and use approved AI tools without exposing confidential information.".to_string(),
            estimated_minutes: 8,
            content: "Do not paste passwords, API keys, customer records or confidential business information into AI tools unless your organisation has approved that use.\n\nRemove identifying details and follow your data-handling policy.".to_string(),
        },
        TrainingModule {
            id: "authentication-and-password-security".to_string(),
            title: "Authentication and Password Security".to_string(),
            description: "Use strong sign-in habits to protect your work accounts.".to_string(),
            learning_objective: "Use strong authentication habits to protect work accounts and respond safely to suspicious sign-in activity.".to_string(),
            estimated_minutes: 8,
            content: "Use a password manager to create unique passwords, enable multi-factor authentication and never share verification codes.\n\nReport unexpected sign-in prompts and change a password immediately if you suspect compromise.".to_string(),
        },
    ]
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
