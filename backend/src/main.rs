use axum::{
    Router,
    http::{
        HeaderValue, Method,
        header::{AUTHORIZATION, CONTENT_TYPE},
    },
    routing::{get, post},
};
use std::{net::SocketAddr, sync::Arc};
use tower_http::cors::CorsLayer;
use utoipa::{
    Modify, OpenApi,
    openapi::{
        Components,
        security::{Http, HttpAuthScheme, SecurityScheme},
    },
};
use utoipa_swagger_ui::SwaggerUi;

mod auth;
mod database;
mod models;
mod repositories;
mod routes;

#[cfg(test)]
mod tests;

#[derive(Clone)]
pub struct AppState {
    pub users: Arc<dyn repositories::user_repository::UserRepository>,
    pub modules: Arc<dyn repositories::module_repository::ModuleRepository>,
    pub quiz_attempts: Arc<dyn repositories::quiz_attempt_repository::QuizAttemptRepository>,
}

/// The OpenAPI contract exposed at `/api-docs/openapi.json`.
#[derive(OpenApi)]
#[openapi(
    paths(
        routes::auth_test::auth_test,
        routes::modules::get_modules,
        routes::modules::get_module_by_id,
        routes::modules::get_module_questions,
        routes::progress::get_progress,
        routes::quiz_attempts::create_quiz_attempt
    ),
    tags(
        (name = "Authentication", description = "Endpoints that require an Auth0 bearer token"),
        (name = "Training Modules", description = "Available cybersecurity training modules"),
        (name = "Learner Progress", description = "Completed training modules and scores"),
        (name = "Quiz Attempts", description = "Scored quiz submissions")
    ),
    modifiers(&SecurityAddon)
)]
struct ApiDoc;

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        openapi
            .components
            .get_or_insert_with(Components::new)
            .add_security_scheme(
                "bearer_auth",
                SecurityScheme::Http(Http::new(HttpAuthScheme::Bearer)),
            );
    }
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());

    let cors_origin =
        std::env::var("CORS_ORIGIN").unwrap_or_else(|_| "http://localhost:5173".to_string());

    let mongodb_uri = std::env::var("MONGODB_URI").expect("MONGODB_URI must be set");

    let mongo = database::create_client(&mongodb_uri).await;
    database::setup_indexes(&mongo).await;

    let state = AppState {
        users: Arc::new(repositories::user_repository::MongoUserRepository::new(
            mongo.clone(),
        )),
        modules: Arc::new(repositories::module_repository::MongoModuleRepository::new(
            mongo.clone(),
        )),
        quiz_attempts: Arc::new(
            repositories::quiz_attempt_repository::MongoQuizAttemptRepository::new(mongo.clone()),
        ),
    };

    let addr: SocketAddr = format!("0.0.0.0:{port}").parse().expect("valid address");

    let cors = CorsLayer::new()
        .allow_origin(
            cors_origin
                .parse::<HeaderValue>()
                .expect("valid CORS origin"),
        )
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([AUTHORIZATION, CONTENT_TYPE]);

    let app = Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/api/auth-test", get(routes::auth_test::auth_test))
        .route("/api/modules", get(routes::modules::get_modules))
        .route("/api/modules/{id}", get(routes::modules::get_module_by_id))
        .route("/api/progress", get(routes::progress::get_progress))
        .route(
            "/api/modules/{id}/questions",
            get(routes::modules::get_module_questions),
        )
        .route(
            "/api/quiz-attempts",
            post(routes::quiz_attempts::create_quiz_attempt),
        )
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind");

    println!("backend listening on {addr}");

    axum::serve(listener, app).await.expect("server error");
}
