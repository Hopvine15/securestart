mod auth;
mod routes;

use axum::{
    http::{header::AUTHORIZATION, HeaderValue, Method},
    routing::get,
    Router,
};
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string());

    let cors_origin = std::env::var("CORS_ORIGIN")
        .unwrap_or_else(|_| "http://localhost:5173".to_string());

    let addr: SocketAddr = format!("0.0.0.0:{port}")
        .parse()
        .expect("valid address");

    let cors = CorsLayer::new()
        .allow_origin(
            cors_origin
                .parse::<HeaderValue>()
                .expect("valid CORS origin"),
        )
        .allow_methods([Method::GET])
        .allow_headers([AUTHORIZATION]);

    let app = Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/api/auth-test", get(routes::auth_test::auth_test))
        .layer(cors);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind");

    println!("backend listening on {addr}");

    axum::serve(listener, app)
        .await
        .expect("server error");
}