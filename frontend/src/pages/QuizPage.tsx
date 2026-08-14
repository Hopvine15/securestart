import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

type QuestionOption = {
  id: string;
  text: string;
};

type QuizQuestion = {
  id: string;
  question: string;
  options: QuestionOption[];
};

type QuizAttemptResult = {
  score: number;
};

function QuizPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [hasSubmissionError, setHasSubmissionError] = useState(false);
  const [unansweredQuestionIds, setUnansweredQuestionIds] = useState<string[]>([]);

  useEffect(() => {
    let isCurrent = true;

    const loadQuestions = async () => {
      if (!id) {
        setHasLoadError(true);
        setIsLoading(false);
        return;
      }

      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/modules/${id}/questions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Unable to load quiz questions");
        }

        const data = (await response.json()) as QuizQuestion[];

        if (isCurrent) {
          setQuestions(data);
        }
      } catch {
        if (isCurrent) {
          setHasLoadError(true);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    void loadQuestions();

    return () => {
      isCurrent = false;
    };
  }, [getAccessTokenSilently, id]);

  const selectAnswer = (questionId: string, selectedAnswer: string) => {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [questionId]: selectedAnswer }));
    setUnansweredQuestionIds((currentIds) => currentIds.filter((currentId) => currentId !== questionId));
  };

  const submitQuiz = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!id) {
      return;
    }

    const missingQuestionIds = questions
      .filter((question) => !answers[question.id])
      .map((question) => question.id);

    if (missingQuestionIds.length > 0) {
      setUnansweredQuestionIds(missingQuestionIds);
      return;
    }

    setHasSubmissionError(false);
    setIsSubmitting(true);

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      });
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/quiz-attempts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          module_id: id,
          answers: questions.map((question) => ({
            question_id: question.id,
            selected_answer: answers[question.id],
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to submit quiz");
      }

      const attempt = (await response.json()) as QuizAttemptResult;
      navigate(`/modules/${id}/results`, { state: { attempt } });
    } catch {
      setHasSubmissionError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main>
      <h1>Quiz</h1>

      {isLoading && <p>Loading quiz questions...</p>}
      {hasLoadError && <p role="alert">Unable to load quiz questions. Please try again.</p>}

      {!isLoading && !hasLoadError && (
        <form onSubmit={submitQuiz}>
          {hasSubmissionError && <p role="alert">Unable to submit quiz. Please try again.</p>}
          {unansweredQuestionIds.length > 0 && (
            <p role="alert">Please answer every question before submitting.</p>
          )}

          {questions.map((question) => {
            const validationMessageId = `${question.id}-validation`;
            const isUnanswered = unansweredQuestionIds.includes(question.id);

            return (
              <fieldset aria-describedby={isUnanswered ? validationMessageId : undefined} key={question.id}>
                <legend>{question.question}</legend>
                {question.options.map((option) => (
                  <label key={option.id}>
                    <input
                      checked={answers[question.id] === option.id}
                      name={question.id}
                      onChange={() => selectAnswer(question.id, option.id)}
                      type="radio"
                      value={option.id}
                    />
                    {option.text}
                  </label>
                ))}
                {isUnanswered && (
                  <p id={validationMessageId}>Please select an answer before submitting.</p>
                )}
              </fieldset>
            );
          })}

          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Submitting quiz..." : "Submit quiz"}
          </button>
        </form>
      )}
    </main>
  );
}

export default withAuthenticationRequired(QuizPage, {
  onRedirecting: () => <div>Redirecting...</div>,
});
