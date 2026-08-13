use mongodb::{Client, IndexModel, bson::doc, options::IndexOptions};

use crate::models::{training_module::TrainingModule, user::User};

pub async fn create_client(uri: &str) -> Client {
    let client = Client::with_uri_str(uri)
        .await
        .expect("failed to create MongoDB client");

    client
        .database("admin")
        .run_command(doc! { "ping": 1 })
        .await
        .expect("failed to connect to MongoDB");

    println!("Connected to MongoDB");

    client
}

pub async fn setup_indexes(client: &Client) {
    let users = client.database("securestart").collection::<User>("users");
    let modules = client
        .database("securestart")
        .collection::<TrainingModule>("modules");

    let options = IndexOptions::builder().unique(true).build();

    let index = IndexModel::builder()
        .keys(doc! { "auth0_sub": 1 })
        .options(options)
        .build();

    users
        .create_index(index)
        .await
        .expect("failed to create auth0_sub unique index");

    let module_id_index = IndexModel::builder()
        .keys(doc! { "id": 1 })
        .options(IndexOptions::builder().unique(true).build())
        .build();

    modules
        .create_index(module_id_index)
        .await
        .expect("failed to create module id unique index");
}
