use std::sync::{
    Arc, Mutex,
    atomic::{AtomicUsize, Ordering},
};

use axum::{
    Router,
    body::Body,
    http::{Request, StatusCode, header},
    routing::get,
};
use mongodb::bson::DateTime;
use tower::ServiceExt;

use crate::{
    AppState,
    models::user::User,
    repositories::{
        module_repository::MongoModuleRepository,
        quiz_attempt_repository::UnavailableQuizAttemptRepository, user_repository::UserRepository,
    },
    routes::auth_test::auth_test,
};

struct InMemoryUserRepository {
    users: Mutex<Vec<User>>,
    find_calls: AtomicUsize,
    create_calls: AtomicUsize,
    should_fail: bool,
}

impl InMemoryUserRepository {
    fn working() -> Self {
        Self {
            users: Mutex::new(Vec::new()),
            find_calls: AtomicUsize::new(0),
            create_calls: AtomicUsize::new(0),
            should_fail: false,
        }
    }

    fn failing() -> Self {
        Self {
            users: Mutex::new(Vec::new()),
            find_calls: AtomicUsize::new(0),
            create_calls: AtomicUsize::new(0),
            should_fail: true,
        }
    }

    fn user_count(&self) -> usize {
        self.users.lock().expect("repository lock poisoned").len()
    }

    fn find_call_count(&self) -> usize {
        self.find_calls.load(Ordering::SeqCst)
    }

    fn create_call_count(&self) -> usize {
        self.create_calls.load(Ordering::SeqCst)
    }
}

#[async_trait::async_trait]
impl UserRepository for InMemoryUserRepository {
    async fn find_by_auth0_sub(&self, auth0_sub: &str) -> Result<Option<User>, String> {
        self.find_calls.fetch_add(1, Ordering::SeqCst);

        if self.should_fail {
            return Err("MongoDB connection refused".to_string());
        }

        Ok(self
            .users
            .lock()
            .map_err(|_| "repository lock poisoned".to_string())?
            .iter()
            .find(|user| user.auth0_sub == auth0_sub)
            .cloned())
    }

    async fn create_user(&self, auth0_sub: &str, email: &str) -> Result<User, String> {
        self.create_calls.fetch_add(1, Ordering::SeqCst);

        if self.should_fail {
            return Err("MongoDB connection refused".to_string());
        }

        let user = User {
            id: None,
            auth0_sub: auth0_sub.to_string(),
            email: email.to_string(),
            created_at: DateTime::now(),
        };
        self.users
            .lock()
            .map_err(|_| "repository lock poisoned".to_string())?
            .push(user.clone());

        Ok(user)
    }
}

async fn app_under_test(users: Arc<dyn UserRepository>) -> Router {
    let mongo = mongodb::Client::with_uri_str("mongodb://localhost:27017")
        .await
        .expect("valid MongoDB URI");
    let state = AppState {
        users,
        modules: Arc::new(MongoModuleRepository::new(mongo)),
        quiz_attempts: Arc::new(UnavailableQuizAttemptRepository),
    };

    Router::new()
        .route("/api/auth-test", get(auth_test))
        .with_state(state)
}

fn auth_request(authenticated: bool) -> Request<Body> {
    let mut request = Request::builder().method("GET").uri("/api/auth-test");

    if authenticated {
        request = request.header(header::AUTHORIZATION, "Bearer valid-test-token");
    }

    request.body(Body::empty()).expect("valid request")
}

async fn response_body(response: axum::response::Response) -> String {
    String::from_utf8(
        axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body")
            .to_vec(),
    )
    .expect("UTF-8 response")
}

#[tokio::test]
async fn authenticated_requests_provision_once_and_return_the_existing_user_on_repeat() {
    let users = Arc::new(InMemoryUserRepository::working());
    let app = app_under_test(users.clone()).await;

    let first_response = app
        .clone()
        .oneshot(auth_request(true))
        .await
        .expect("router response");
    assert_eq!(first_response.status(), StatusCode::OK);
    assert_eq!(response_body(first_response).await, "New user created");

    let second_response = app
        .oneshot(auth_request(true))
        .await
        .expect("router response");
    assert_eq!(second_response.status(), StatusCode::OK);
    assert_eq!(response_body(second_response).await, "Existing user found");
    assert_eq!(users.user_count(), 1);
    assert_eq!(users.find_call_count(), 2);
    assert_eq!(users.create_call_count(), 1);
}

#[tokio::test]
async fn unauthenticated_requests_are_rejected_before_user_provisioning() {
    let users = Arc::new(InMemoryUserRepository::working());
    let response = app_under_test(users.clone())
        .await
        .oneshot(auth_request(false))
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(users.find_call_count(), 0);
    assert_eq!(users.create_call_count(), 0);
}

#[tokio::test]
async fn provisioning_failures_are_sanitised() {
    let users = Arc::new(InMemoryUserRepository::failing());
    let response = app_under_test(users.clone())
        .await
        .oneshot(auth_request(true))
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    assert_eq!(response_body(response).await, "Database error");
    assert_eq!(users.find_call_count(), 1);
    assert_eq!(users.create_call_count(), 0);
}
