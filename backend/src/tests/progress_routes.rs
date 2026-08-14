use std::sync::{Arc, Mutex};

use axum::{
    Router,
    body::Body,
    http::{Request, StatusCode, header},
};
use mongodb::bson::DateTime;
use serde_json::{Value, json};
use tower::ServiceExt;

use crate::{
    AppState,
    models::quiz_attempt::QuizAttempt,
    repositories::{
        module_repository::MongoModuleRepository, quiz_attempt_repository::QuizAttemptRepository,
        user_repository::MongoUserRepository,
    },
};

/// RED checkpoint for GET /api/progress. The production router deliberately
/// does not register this endpoint yet; these tests define its public contract
/// before the progress query and handler are introduced.
struct InMemoryQuizAttemptRepository {
    attempts: Mutex<Vec<QuizAttempt>>,
    should_fail: bool,
}

impl InMemoryQuizAttemptRepository {
    fn with_attempts(attempts: Vec<QuizAttempt>) -> Self {
        Self {
            attempts: Mutex::new(attempts),
            should_fail: false,
        }
    }

    fn failing() -> Self {
        Self {
            attempts: Mutex::new(Vec::new()),
            should_fail: true,
        }
    }
}

#[async_trait::async_trait]
impl QuizAttemptRepository for InMemoryQuizAttemptRepository {
    async fn create(&self, attempt: QuizAttempt) -> Result<(), String> {
        if self.should_fail {
            return Err("MongoDB connection refused".to_string());
        }

        self.attempts
            .lock()
            .map_err(|_| "repository lock poisoned".to_string())?
            .push(attempt);
        Ok(())
    }
}

async fn app_under_test(quiz_attempts: Arc<dyn QuizAttemptRepository>) -> Router {
    let mongo = mongodb::Client::with_uri_str("mongodb://localhost:27017")
        .await
        .expect("valid MongoDB URI");
    let state = AppState {
        users: MongoUserRepository::new(mongo.clone()),
        modules: Arc::new(MongoModuleRepository::new(mongo)),
        quiz_attempts,
    };

    Router::new().with_state(state)
}

fn progress_request(authenticated: bool) -> Request<Body> {
    let mut request = Request::builder().method("GET").uri("/api/progress");

    if authenticated {
        request = request.header(header::AUTHORIZATION, "Bearer valid-test-token");
    }

    request.body(Body::empty()).expect("valid request")
}

fn attempt(user_id: &str, module_id: &str, score: u8, completed_at_millis: i64) -> QuizAttempt {
    QuizAttempt {
        id: None,
        user_id: user_id.to_string(),
        module_id: module_id.to_string(),
        score,
        completed_at: DateTime::from_millis(completed_at_millis),
    }
}

async fn response_json(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body");
    serde_json::from_slice(&body).expect("JSON response")
}

#[tokio::test]
async fn authenticated_progress_contains_only_the_current_users_completed_modules() {
    let attempts = Arc::new(InMemoryQuizAttemptRepository::with_attempts(vec![
        attempt("auth0|test-user", "ai-phishing-risks", 80, 1_000),
        attempt("auth0|another-user", "ai-phishing-risks", 100, 2_000),
        attempt("auth0|another-user", "password-hygiene", 100, 3_000),
    ]));

    let response = app_under_test(attempts)
        .await
        .oneshot(progress_request(true))
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()[header::CONTENT_TYPE], "application/json");
    assert_eq!(
        response_json(response).await,
        json!({
            "completed_modules": [{
                "module_id": "ai-phishing-risks",
                "best_score": 80,
                "completed_at": { "$date": { "$numberLong": "1000" } }
            }],
            "completed_count": 1
        })
    );
}

#[tokio::test]
async fn multiple_attempts_for_a_module_produce_one_record_with_its_best_score_and_latest_completion()
 {
    let attempts = Arc::new(InMemoryQuizAttemptRepository::with_attempts(vec![
        attempt("auth0|test-user", "ai-phishing-risks", 90, 1_000),
        attempt("auth0|test-user", "ai-phishing-risks", 50, 3_000),
        attempt("auth0|test-user", "secure-passwords", 70, 2_000),
    ]));

    let response = app_under_test(attempts)
        .await
        .oneshot(progress_request(true))
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::OK);
    let body = response_json(response).await;
    assert_eq!(body["completed_count"], 2);
    assert_eq!(body["completed_modules"].as_array().unwrap().len(), 2);

    let phishing = body["completed_modules"]
        .as_array()
        .unwrap()
        .iter()
        .find(|module| module["module_id"] == "ai-phishing-risks")
        .expect("AI phishing progress");
    assert_eq!(phishing["best_score"], 90);
    assert_eq!(
        phishing["completed_at"],
        json!({ "$date": { "$numberLong": "3000" } })
    );
}

#[tokio::test]
async fn user_with_no_attempts_gets_valid_empty_progress() {
    let attempts = Arc::new(InMemoryQuizAttemptRepository::with_attempts(Vec::new()));
    let response = app_under_test(attempts)
        .await
        .oneshot(progress_request(true))
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response_json(response).await,
        json!({ "completed_modules": [], "completed_count": 0 })
    );
}

#[tokio::test]
async fn unauthenticated_progress_request_is_rejected_before_repository_access() {
    let attempts = Arc::new(InMemoryQuizAttemptRepository::with_attempts(Vec::new()));
    let response = app_under_test(attempts)
        .await
        .oneshot(progress_request(false))
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn progress_repository_failures_are_sanitised() {
    let attempts = Arc::new(InMemoryQuizAttemptRepository::failing());
    let response = app_under_test(attempts)
        .await
        .oneshot(progress_request(true))
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body");
    assert_eq!(&body[..], b"Database error");
}
