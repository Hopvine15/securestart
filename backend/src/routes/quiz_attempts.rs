use std::collections::HashSet;

use axum::{Json, extract::State, http::StatusCode};
use mongodb::bson::DateTime;

use crate::{
    AppState,
    auth::AuthenticatedUser,
    models::{
        quiz_attempt::{QuizAttempt, QuizAttemptRequest, QuizAttemptResult, SubmittedAnswer},
        training_module::TrainingModule,
    },
};

#[utoipa::path(
    post,
    path = "/api/quiz-attempts",
    tag = "Quiz Attempts",
    request_body = QuizAttemptRequest,
    security(("bearer_auth" = [])),
    responses(
        (status = 201, description = "Quiz attempt stored and scored", body = QuizAttemptResult),
        (status = 400, description = "Invalid quiz submission"),
        (status = 401, description = "Missing or invalid bearer token"),
        (status = 404, description = "Training module not found"),
        (status = 500, description = "Database error")
    )
)]
pub async fn create_quiz_attempt(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Json(request): Json<QuizAttemptRequest>,
) -> Result<(StatusCode, Json<QuizAttemptResult>), (StatusCode, &'static str)> {
    let module = state
        .modules
        .find_by_id(&request.module_id)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Database error"))?
        .ok_or((StatusCode::NOT_FOUND, "Module not found"))?;

    let score = score_submission(&module, &request.answers)
        .ok_or((StatusCode::BAD_REQUEST, "Invalid quiz submission"))?;

    state
        .quiz_attempts
        .create(QuizAttempt {
            id: None,
            user_id: user.sub,
            module_id: request.module_id,
            score,
            completed_at: DateTime::now(),
        })
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Database error"))?;

    Ok((StatusCode::CREATED, Json(QuizAttemptResult { score })))
}

fn score_submission(module: &TrainingModule, answers: &[SubmittedAnswer]) -> Option<u8> {
    if module.questions.is_empty() {
        return None;
    }

    let mut answered_question_ids = HashSet::with_capacity(answers.len());
    let mut correct_answers = 0_u32;

    for answer in answers {
        if !answered_question_ids.insert(&answer.question_id) {
            return None;
        }

        let question = module
            .questions
            .iter()
            .find(|question| question.id == answer.question_id)?;

        if !question
            .options
            .iter()
            .any(|option| option.id == answer.selected_answer)
        {
            return None;
        }

        if question.correct_answer == answer.selected_answer {
            correct_answers += 1;
        }
    }

    if answers.len() != module.questions.len()
        || module
            .questions
            .iter()
            .any(|question| !answered_question_ids.contains(&question.id))
    {
        return None;
    }

    Some((correct_answers * 100 / module.questions.len() as u32) as u8)
}
