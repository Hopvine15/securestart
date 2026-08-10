use mongodb::{Client, IndexModel, bson::doc, options::IndexOptions};

use crate::models::user::User;

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

    let options = IndexOptions::builder().unique(true).build();

    let index = IndexModel::builder()
        .keys(doc! { "auth0_sub": 1 })
        .options(options)
        .build();

    users
        .create_index(index)
        .await
        .expect("failed to create auth0_sub unique index");
}
