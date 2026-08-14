use std::sync::{
    Arc, Mutex,
    atomic::{AtomicUsize, Ordering},
};

use axum::{
    Router,
    body::Body,
    http::{Request, StatusCode, header},
    routing::{get, post},
};
use mongodb::bson::DateTime;
use serde_json::{Value, json};
use tower::ServiceExt;

use crate::{
    AppState,
    models::{
        quiz_attempt::QuizAttempt,
        training_module::{QuestionOption, QuizQuestion, TrainingModule},
    },
    repositories::{
        module_repository::ModuleRepository, quiz_attempt_repository::QuizAttemptRepository,
        user_repository::MongoUserRepository,
    },
    routes::{
        modules::{get_module_by_id, get_module_questions, get_modules},
        quiz_attempts::create_quiz_attempt,
    },
};

/// Route-test double for the module lookup needed to validate an attempt.
struct InMemoryModuleRepository {
    modules: Vec<TrainingModule>,
    find_by_id_calls: AtomicUsize,
}

impl InMemoryModuleRepository {
    fn with_modules(modules: Vec<TrainingModule>) -> Self {
        Self {
            modules,
            find_by_id_calls: AtomicUsize::new(0),
        }
    }

    fn find_by_id_call_count(&self) -> usize {
        self.find_by_id_calls.load(Ordering::SeqCst)
    }
}

#[async_trait::async_trait]
impl ModuleRepository for InMemoryModuleRepository {
    async fn find_all(&self) -> Result<Vec<TrainingModule>, String> {
        Ok(self.modules.clone())
    }

    async fn find_by_id(&self, id: &str) -> Result<Option<TrainingModule>, String> {
        self.find_by_id_calls.fetch_add(1, Ordering::SeqCst);
        Ok(self.modules.iter().find(|module| module.id == id).cloned())
    }
}

/// Route-test double for quiz-attempt persistence.
struct InMemoryQuizAttemptRepository {
    attempts: Mutex<Vec<QuizAttempt>>,
    create_calls: AtomicUsize,
    should_fail: bool,
}

impl InMemoryQuizAttemptRepository {
    fn working() -> Self {
        Self {
            attempts: Mutex::new(Vec::new()),
            create_calls: AtomicUsize::new(0),
            should_fail: false,
        }
    }

    fn failing() -> Self {
        Self {
            attempts: Mutex::new(Vec::new()),
            create_calls: AtomicUsize::new(0),
            should_fail: true,
        }
    }

    fn create_call_count(&self) -> usize {
        self.create_calls.load(Ordering::SeqCst)
    }

    fn attempts(&self) -> Vec<QuizAttempt> {
        self.attempts
            .lock()
            .expect("repository lock poisoned")
            .clone()
    }
}

#[async_trait::async_trait]
impl QuizAttemptRepository for InMemoryQuizAttemptRepository {
    async fn create(&self, attempt: QuizAttempt) -> Result<(), String> {
        self.create_calls.fetch_add(1, Ordering::SeqCst);

        if self.should_fail {
            return Err("MongoDB connection refused".to_string());
        }

        self.attempts
            .lock()
            .map_err(|_| "repository lock poisoned".to_string())?
            .push(attempt);
        Ok(())
    }

    async fn find_by_user(&self, user_id: &str) -> Result<Vec<QuizAttempt>, String> {
        if self.should_fail {
            return Err("MongoDB connection refused".to_string());
        }

        Ok(self
            .attempts
            .lock()
            .map_err(|_| "repository lock poisoned".to_string())?
            .iter()
            .filter(|attempt| attempt.user_id == user_id)
            .cloned()
            .collect())
    }
}

fn modules() -> Vec<TrainingModule> {
    vec![TrainingModule {
        id: "ai-phishing-risks".to_string(),
        title: "AI Phishing Risks".to_string(),
        description: "Spot convincing phishing messages made more persuasive with AI.".to_string(),
        learning_objective: "Identify common signs of AI-assisted phishing.".to_string(),
        estimated_minutes: 10,
        content: "Module content".to_string(),
        questions: vec![
            QuizQuestion {
                id: "phishing-urgent-request".to_string(),
                question: "What should you do about an urgent request?".to_string(),
                options: vec![
                    QuestionOption {
                        id: "verify".to_string(),
                        text: "Verify it independently.".to_string(),
                    },
                    QuestionOption {
                        id: "respond".to_string(),
                        text: "Respond immediately.".to_string(),
                    },
                ],
                correct_answer: "verify".to_string(),
            },
            QuizQuestion {
                id: "phishing-suspicious-message".to_string(),
                question: "What should you do with a suspicious message?".to_string(),
                options: vec![
                    QuestionOption {
                        id: "report".to_string(),
                        text: "Report it.".to_string(),
                    },
                    QuestionOption {
                        id: "open".to_string(),
                        text: "Open its link.".to_string(),
                    },
                ],
                correct_answer: "report".to_string(),
            },
        ],
    }]
}

async fn app_under_test(
    modules: Arc<dyn ModuleRepository>,
    quiz_attempts: Arc<dyn QuizAttemptRepository>,
) -> Router {
    let mongo = mongodb::Client::with_uri_str("mongodb://localhost:27017")
        .await
        .expect("valid MongoDB URI");
    let state = AppState {
        users: Arc::new(MongoUserRepository::new(mongo)),
        modules,
        quiz_attempts,
    };

    Router::new()
        .route("/api/modules", get(get_modules))
        .route("/api/modules/{id}", get(get_module_by_id))
        .route("/api/modules/{id}/questions", get(get_module_questions))
        .route("/api/quiz-attempts", post(create_quiz_attempt))
        .with_state(state)
}

fn submission(body: Value, authenticated: bool) -> Request<Body> {
    let mut request = Request::builder()
        .method("POST")
        .uri("/api/quiz-attempts")
        .header(header::CONTENT_TYPE, "application/json");

    if authenticated {
        request = request.header(header::AUTHORIZATION, "Bearer valid-test-token");
    }

    request
        .body(Body::from(body.to_string()))
        .expect("valid request")
}

fn complete_answers() -> Value {
    json!([
        { "question_id": "phishing-urgent-request", "selected_answer": "verify" },
        { "question_id": "phishing-suspicious-message", "selected_answer": "report" }
    ])
}

#[tokio::test]
async fn authenticated_complete_submission_is_scored_and_stored_for_the_authenticated_user() {
    let modules = Arc::new(InMemoryModuleRepository::with_modules(modules()));
    let attempts = Arc::new(InMemoryQuizAttemptRepository::working());
    let response = app_under_test(modules.clone(), attempts.clone())
        .await
        .oneshot(submission(
            json!({ "module_id": "ai-phishing-risks", "answers": complete_answers() }),
            true,
        ))
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::CREATED);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body");
    assert_eq!(
        serde_json::from_slice::<Value>(&body).unwrap()["score"],
        100
    );
    assert_eq!(modules.find_by_id_call_count(), 1);
    assert_eq!(attempts.create_call_count(), 1);

    let stored = attempts.attempts();
    assert_eq!(stored.len(), 1);
    assert_eq!(stored[0].user_id, "auth0|test-user");
    assert_eq!(stored[0].module_id, "ai-phishing-risks");
    assert_eq!(stored[0].score, 100);
    assert!(stored[0].completed_at >= DateTime::from_millis(1));
}

#[tokio::test]
async fn partially_correct_submission_is_scored_server_side_not_from_client_input() {
    let modules = Arc::new(InMemoryModuleRepository::with_modules(modules()));
    let attempts = Arc::new(InMemoryQuizAttemptRepository::working());
    let response = app_under_test(modules.clone(), attempts.clone())
        .await
        .oneshot(submission(
            json!({
                "module_id": "ai-phishing-risks",
                "score": 100,
                "answers": [
                    { "question_id": "phishing-urgent-request", "selected_answer": "verify" },
                    { "question_id": "phishing-suspicious-message", "selected_answer": "open" }
                ]
            }),
            true,
        ))
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::CREATED);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body");
    assert_eq!(serde_json::from_slice::<Value>(&body).unwrap()["score"], 50);
    assert_eq!(attempts.attempts()[0].score, 50);
}

#[tokio::test]
async fn incomplete_submission_is_rejected_without_storing_an_attempt() {
    let modules = Arc::new(InMemoryModuleRepository::with_modules(modules()));
    let attempts = Arc::new(InMemoryQuizAttemptRepository::working());
    let response = app_under_test(modules, attempts.clone())
        .await
        .oneshot(submission(
            json!({
                "module_id": "ai-phishing-risks",
                "answers": [{ "question_id": "phishing-urgent-request", "selected_answer": "verify" }]
            }),
            true,
        ))
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert_eq!(attempts.create_call_count(), 0);
}

#[tokio::test]
async fn duplicate_answers_are_rejected_without_storing_an_attempt() {
    let modules = Arc::new(InMemoryModuleRepository::with_modules(modules()));
    let attempts = Arc::new(InMemoryQuizAttemptRepository::working());
    let response = app_under_test(modules, attempts.clone())
        .await
        .oneshot(submission(
            json!({
                "module_id": "ai-phishing-risks",
                "answers": [
                    { "question_id": "phishing-urgent-request", "selected_answer": "verify" },
                    { "question_id": "phishing-urgent-request", "selected_answer": "respond" }
                ]
            }),
            true,
        ))
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert_eq!(attempts.create_call_count(), 0);
}

#[tokio::test]
async fn unknown_question_is_rejected_without_storing_an_attempt() {
    let modules = Arc::new(InMemoryModuleRepository::with_modules(modules()));
    let attempts = Arc::new(InMemoryQuizAttemptRepository::working());
    let response = app_under_test(modules, attempts.clone())
        .await
        .oneshot(submission(
            json!({
                "module_id": "ai-phishing-risks",
                "answers": [
                    { "question_id": "unknown-question", "selected_answer": "verify" },
                    { "question_id": "phishing-suspicious-message", "selected_answer": "report" }
                ]
            }),
            true,
        ))
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert_eq!(attempts.create_call_count(), 0);
}

#[tokio::test]
async fn invalid_option_is_rejected_without_storing_an_attempt() {
    let modules = Arc::new(InMemoryModuleRepository::with_modules(modules()));
    let attempts = Arc::new(InMemoryQuizAttemptRepository::working());
    let response = app_under_test(modules, attempts.clone())
        .await
        .oneshot(submission(
            json!({
                "module_id": "ai-phishing-risks",
                "answers": [
                    { "question_id": "phishing-urgent-request", "selected_answer": "not-an-option" },
                    { "question_id": "phishing-suspicious-message", "selected_answer": "report" }
                ]
            }),
            true,
        ))
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert_eq!(attempts.create_call_count(), 0);
}

#[tokio::test]
async fn unknown_module_is_rejected_without_storing_an_attempt() {
    let modules = Arc::new(InMemoryModuleRepository::with_modules(modules()));
    let attempts = Arc::new(InMemoryQuizAttemptRepository::working());
    let response = app_under_test(modules.clone(), attempts.clone())
        .await
        .oneshot(submission(
            json!({ "module_id": "unknown-module", "answers": complete_answers() }),
            true,
        ))
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    assert_eq!(modules.find_by_id_call_count(), 1);
    assert_eq!(attempts.create_call_count(), 0);
}

#[tokio::test]
async fn unauthenticated_submission_is_rejected_before_any_repository_is_called() {
    let modules = Arc::new(InMemoryModuleRepository::with_modules(modules()));
    let attempts = Arc::new(InMemoryQuizAttemptRepository::working());
    let response = app_under_test(modules.clone(), attempts.clone())
        .await
        .oneshot(submission(
            json!({ "module_id": "ai-phishing-risks", "answers": complete_answers() }),
            false,
        ))
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(modules.find_by_id_call_count(), 0);
    assert_eq!(attempts.create_call_count(), 0);
}

#[tokio::test]
async fn persistence_failure_is_sanitised() {
    let modules = Arc::new(InMemoryModuleRepository::with_modules(modules()));
    let attempts = Arc::new(InMemoryQuizAttemptRepository::failing());
    let response = app_under_test(modules, attempts.clone())
        .await
        .oneshot(submission(
            json!({ "module_id": "ai-phishing-risks", "answers": complete_answers() }),
            true,
        ))
        .await
        .expect("router response");

    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body");
    assert_eq!(&body[..], b"Database error");
    assert_eq!(attempts.create_call_count(), 1);
}
