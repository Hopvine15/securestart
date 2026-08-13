use std::sync::{
    Arc,
    atomic::{AtomicUsize, Ordering},
};

use axum::{
    Router,
    body::Body,
    http::{Request, StatusCode, header},
    routing::get,
};
use tower::ServiceExt;

use crate::{
    AppState,
    models::training_module::TrainingModule,
    repositories::{module_repository::ModuleRepository, user_repository::MongoUserRepository},
    routes::modules::{get_module_by_id, get_modules},
};

/// Route-test double for the module repository dependency
struct InMemoryModuleRepository {
    modules: Vec<TrainingModule>,
    find_all_calls: AtomicUsize,
    find_by_id_calls: AtomicUsize,
    failure: Option<String>,
}

impl InMemoryModuleRepository {
    fn with_modules(modules: Vec<TrainingModule>) -> Self {
        Self {
            modules,
            find_all_calls: AtomicUsize::new(0),
            find_by_id_calls: AtomicUsize::new(0),
            failure: None,
        }
    }

    fn failing() -> Self {
        Self {
            modules: Vec::new(),
            find_all_calls: AtomicUsize::new(0),
            find_by_id_calls: AtomicUsize::new(0),
            failure: Some("MongoDB connection refused".to_string()),
        }
    }

    fn find_all_call_count(&self) -> usize {
        self.find_all_calls.load(Ordering::SeqCst)
    }

    fn find_by_id_call_count(&self) -> usize {
        self.find_by_id_calls.load(Ordering::SeqCst)
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

    async fn find_by_id(&self, id: &str) -> Result<Option<TrainingModule>, String> {
        self.find_by_id_calls.fetch_add(1, Ordering::SeqCst);
        match &self.failure {
            Some(error) => Err(error.clone()),
            None => Ok(self.modules.iter().find(|module| module.id == id).cloned()),
        }
    }
}

fn modules() -> Vec<TrainingModule> {
    vec![
        TrainingModule {
            id: "ai-phishing".to_string(),
            title: "AI Phishing Risks".to_string(),
            description: "Learn how AI can make phishing attempts more convincing.".to_string(),
            learning_objective: "Identify suspicious AI-assisted messages.".to_string(),
            estimated_minutes: 10,
            content: "Module content".to_string(),
        },
        TrainingModule {
            id: "secure-ai-coding".to_string(),
            title: "Secure AI-Assisted Coding".to_string(),
            description: "Learn how to review AI-generated code safely.".to_string(),
            learning_objective: "Review AI-generated code for security risks.".to_string(),
            estimated_minutes: 8,
            content: "Module content".to_string(),
        },
    ]
}

async fn app_under_test(modules: Arc<dyn ModuleRepository>) -> Router {
    let mongo = mongodb::Client::with_uri_str("mongodb://localhost:27017")
        .await
        .expect("valid MongoDB URI");
    let state = AppState {
        users: MongoUserRepository::new(mongo),
        modules,
    };

    Router::new()
        .route("/api/modules", get(get_modules))
        .route("/api/modules/{id}", get(get_module_by_id))
        .with_state(state)
}

#[tokio::test]
async fn authenticated_request_returns_available_modules_as_json() {
    let repository = Arc::new(InMemoryModuleRepository::with_modules(modules()));
    let response = app_under_test(repository.clone())
        .await
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
    assert_eq!(
        modules[0].learning_objective,
        "Identify suspicious AI-assisted messages."
    );
    assert_eq!(modules[0].estimated_minutes, 10);
}

#[tokio::test]
async fn unauthenticated_request_is_rejected_before_module_lookup() {
    let repository = Arc::new(InMemoryModuleRepository::with_modules(modules()));
    let response = app_under_test(repository.clone())
        .await
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
    let repository = Arc::new(InMemoryModuleRepository::failing());
    let response = app_under_test(repository.clone())
        .await
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

// RED checkpoint for GET /api/modules/:id. The production router intentionally
// does not register this endpoint yet, so these tests describe the contract
// before its handler and repository lookup are implemented.
#[tokio::test]
async fn authenticated_request_for_an_existing_module_returns_that_module() {
    let repository = Arc::new(InMemoryModuleRepository::with_modules(modules()));
    let response = app_under_test(repository.clone())
        .await
        .oneshot(
            Request::builder()
                .uri("/api/modules/ai-phishing")
                .header(header::AUTHORIZATION, "Bearer valid-test-token")
                .body(Body::empty())
                .expect("valid request"),
        )
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body");
    let module: TrainingModule =
        serde_json::from_slice(&body).expect("single module JSON response");

    assert_eq!(module.id, "ai-phishing");
    assert_eq!(module.title, "AI Phishing Risks");
    assert_eq!(repository.find_by_id_call_count(), 1);
}

#[tokio::test]
async fn authenticated_request_for_an_unknown_module_returns_not_found() {
    let repository = Arc::new(InMemoryModuleRepository::with_modules(modules()));
    let response = app_under_test(repository.clone())
        .await
        .oneshot(
            Request::builder()
                .uri("/api/modules/unknown-module")
                .header(header::AUTHORIZATION, "Bearer valid-test-token")
                .body(Body::empty())
                .expect("valid request"),
        )
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    assert_eq!(repository.find_by_id_call_count(), 1);
}

#[tokio::test]
async fn unauthenticated_request_for_a_module_is_rejected_before_module_lookup() {
    let repository = Arc::new(InMemoryModuleRepository::with_modules(modules()));
    let response = app_under_test(repository.clone())
        .await
        .oneshot(
            Request::builder()
                .uri("/api/modules/ai-phishing")
                .body(Body::empty())
                .expect("valid request"),
        )
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(repository.find_all_call_count(), 0);
    assert_eq!(repository.find_by_id_call_count(), 0);
}

#[tokio::test]
async fn module_lookup_failures_are_sanitised() {
    let repository = Arc::new(InMemoryModuleRepository::failing());
    let response = app_under_test(repository.clone())
        .await
        .oneshot(
            Request::builder()
                .uri("/api/modules/ai-phishing")
                .header(header::AUTHORIZATION, "Bearer valid-test-token")
                .body(Body::empty())
                .expect("valid request"),
        )
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    assert_eq!(repository.find_by_id_call_count(), 1);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body");
    assert_eq!(&body[..], b"Database error");
}
