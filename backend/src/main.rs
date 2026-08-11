use axum::{
    Router,
    http::{HeaderValue, Method, header::AUTHORIZATION},
    routing::get,
};
use std::net::SocketAddr;
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
mod module_list_red_tests {
    use std::sync::atomic::{AtomicUsize, Ordering};

    use axum::{
        Router,
        body::Body,
        http::{Request, StatusCode, header},
    };
    use tower::ServiceExt;

    use crate::{
        models::training_module::TrainingModule, repositories::module_repository::ModuleRepository,
    };

    /// This fake documents the dependency required by the eventual route.
    /// The application is intentionally not wired to it until the GREEN step.
    struct InMemoryModuleRepository {
        modules: Vec<TrainingModule>,
        find_all_calls: AtomicUsize,
        failure: Option<String>,
    }

    impl InMemoryModuleRepository {
        fn with_modules(modules: Vec<TrainingModule>) -> Self {
            Self {
                modules,
                find_all_calls: AtomicUsize::new(0),
                failure: None,
            }
        }

        fn failing() -> Self {
            Self {
                modules: Vec::new(),
                find_all_calls: AtomicUsize::new(0),
                failure: Some("MongoDB connection refused".to_string()),
            }
        }

        fn find_all_call_count(&self) -> usize {
            self.find_all_calls.load(Ordering::SeqCst)
        }
    }

    #[async_trait::async_trait]
    impl ModuleRepository for InMemoryModuleRepository {
        async fn find_all(&self) -> Result<Vec<TrainingModule>, String> {
            self.find_all_calls.fetch_add(1, Ordering::SeqCst);
            match &self.failure {
                Some(error) => Err(error.clone()),
                None => Ok(self.modules.clone()),
            }
        }
    }

    fn modules() -> Vec<TrainingModule> {
        vec![
            TrainingModule {
                id: "ai-phishing".to_string(),
                title: "AI Phishing Risks".to_string(),
                description: "Learn how AI can make phishing attempts more convincing.".to_string(),
                content: "Module content".to_string(),
            },
            TrainingModule {
                id: "secure-ai-coding".to_string(),
                title: "Secure AI-Assisted Coding".to_string(),
                description: "Learn how to review AI-generated code safely.".to_string(),
                content: "Module content".to_string(),
            },
        ]
    }

    // RED: `/api/modules` is intentionally not registered until the GREEN step.
    // The valid test token is part of the desired API contract; authentication
    // test support will be wired alongside the real protected route.
    fn app_under_test() -> Router {
        Router::new()
    }

    #[tokio::test]
    async fn authenticated_request_returns_available_modules_as_json() {
        let repository = InMemoryModuleRepository::with_modules(modules());
        let response = app_under_test()
            .oneshot(
                Request::builder()
                    .uri("/api/modules")
                    .header(header::AUTHORIZATION, "Bearer valid-test-token")
                    .body(Body::empty())
                    .expect("valid request"),
            )
            .await
            .expect("router response");

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(response.headers()[header::CONTENT_TYPE], "application/json");
        assert_eq!(repository.find_all_call_count(), 1);

        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body");
        let modules: Vec<TrainingModule> =
            serde_json::from_slice(&body).expect("module list JSON response");

        assert_eq!(modules.len(), 2);
        assert_eq!(modules[0].id, "ai-phishing");
        assert_eq!(modules[0].title, "AI Phishing Risks");
        assert_eq!(
            modules[0].description,
            "Learn how AI can make phishing attempts more convincing."
        );
    }

    #[tokio::test]
    async fn unauthenticated_request_is_rejected_before_module_lookup() {
        let repository = InMemoryModuleRepository::with_modules(modules());
        let response = app_under_test()
            .oneshot(
                Request::builder()
                    .uri("/api/modules")
                    .body(Body::empty())
                    .expect("valid request"),
            )
            .await
            .expect("router response");

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        assert_eq!(repository.find_all_call_count(), 0);
    }

    #[tokio::test]
    async fn repository_failures_are_sanitised() {
        let repository = InMemoryModuleRepository::failing();
        let response = app_under_test()
            .oneshot(
                Request::builder()
                    .uri("/api/modules")
                    .header(header::AUTHORIZATION, "Bearer valid-test-token")
                    .body(Body::empty())
                    .expect("valid request"),
            )
            .await
            .expect("router response");

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(repository.find_all_call_count(), 1);

        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body");
        assert_eq!(&body[..], b"Database error");
    }
}

#[derive(Clone)]
pub struct AppState {
    pub users: repositories::user_repository::MongoUserRepository,
}

/// The OpenAPI contract exposed at `/api-docs/openapi.json`.
#[derive(OpenApi)]
#[openapi(
    paths(routes::auth_test::auth_test),
    tags(
        (name = "Authentication", description = "Endpoints that require an Auth0 bearer token")
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
        users: repositories::user_repository::MongoUserRepository::new(mongo),
    };

    let addr: SocketAddr = format!("0.0.0.0:{port}").parse().expect("valid address");

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
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind");

    println!("backend listening on {addr}");

    axum::serve(listener, app).await.expect("server error");
}
