import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import ProductHeader from "../components/ProductHeader";

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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [hasSubmissionError, setHasSubmissionError] = useState(false);
  const [hasCurrentQuestionValidation, setHasCurrentQuestionValidation] = useState(false);

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
    setHasCurrentQuestionValidation(false);
  };

  const submitQuiz = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!id) {
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];

    if (!currentQuestion || !answers[currentQuestion.id]) {
      setHasCurrentQuestionValidation(true);
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((index) => index + 1);
      setHasCurrentQuestionValidation(false);
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

  const previousQuestion = () => {
    setCurrentQuestionIndex((index) => Math.max(0, index - 1));
    setHasCurrentQuestionValidation(false);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-canvas">
      <ProductHeader active="training" />

      <PageContainer className="max-w-[720px] py-6 md:py-8">
        <h1 className="sr-only">Quiz</h1>

        {isLoading && (
          <section className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card" aria-live="polite">
            <p className="m-0 text-md text-muted">Loading quiz questions...</p>
          </section>
        )}

        {hasLoadError && (
          <section className="rounded-2xl border border-error/30 bg-surface p-6 shadow-card" role="alert">
            <p className="m-0 font-semibold text-error">Unable to load quiz questions. Please try again.</p>
          </section>
        )}

        {!isLoading && !hasLoadError && (
          <div className="space-y-5">
            <section className="flex items-center gap-4 rounded-2xl border border-border bg-surface px-5 py-5 shadow-card md:px-8">
              {currentQuestionIndex > 0 ? (
                <button
                  aria-label="Previous question"
                  className="grid size-9 shrink-0 place-items-center rounded-lg border-0 bg-transparent p-0 text-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2"
                  onClick={previousQuestion}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" className="size-5" />
                </button>
              ) : (
                <Link
                  aria-label="Back to module"
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2"
                  to={`/modules/${id}`}
                >
                  <ChevronLeft aria-hidden="true" className="size-5" />
                </Link>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <p className="m-0 truncate font-semibold text-ink">Module quiz</p>
                  <p className="m-0 shrink-0 text-xs font-bold text-cyan-dark">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-border" aria-hidden="true">
                  <div className="h-full rounded-full bg-cyan transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </section>

            <form className="space-y-5" onSubmit={submitQuiz}>
              {hasSubmissionError && (
                <p className="rounded-xl border border-error/30 bg-surface px-4 py-3 text-sm font-medium text-error shadow-card" role="alert">
                  Unable to submit quiz. Please try again.
                </p>
              )}
              {currentQuestion && (() => {
                const validationMessageId = `${currentQuestion.id}-validation`;
                const questionTitleId = `${currentQuestion.id}-title`;

                return (
                  <section
                    aria-describedby={hasCurrentQuestionValidation ? validationMessageId : undefined}
                    aria-labelledby={questionTitleId}
                    className="rounded-2xl border border-border bg-surface p-6 shadow-card md:p-8"
                    role="group"
                  >
                    <h2 className="m-0 text-xl font-semibold leading-7 text-ink" id={questionTitleId}>
                      <span className="mb-2 block text-2xs font-bold uppercase tracking-[0.1em] text-muted">
                        Question {currentQuestionIndex + 1} of {questions.length}
                      </span>
                      <span>{currentQuestion.question}</span>
                    </h2>

                    <aside className="mt-5 rounded-xl border border-border bg-surface-muted p-4">
                      <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-muted">Scenario context</p>
                      <p className="mb-0 mt-1 text-sm leading-5 text-muted">
                        Choose the safest response using what you learned in this module.
                      </p>
                    </aside>

                    <div className="mt-6 space-y-3">
                      {currentQuestion.options.map((option, optionIndex) => {
                        const isSelected = answers[currentQuestion.id] === option.id;
                        const optionLetter = String.fromCharCode(65 + optionIndex);

                        return (
                          <label
                            className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 text-sm font-medium leading-5 transition-colors focus-within:ring-2 focus-within:ring-cyan focus-within:ring-offset-2 ${
                              isSelected
                                ? "border-violet bg-violet/10 text-ink"
                                : "border-border bg-surface text-ink hover:border-cyan"
                            }`}
                            key={option.id}
                          >
                            <input
                              checked={isSelected}
                              className="sr-only"
                              name={currentQuestion.id}
                              onChange={() => selectAnswer(currentQuestion.id, option.id)}
                              type="radio"
                              value={option.id}
                            />
                            <span
                              aria-hidden="true"
                              className={`grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-bold ${
                                isSelected ? "border-violet bg-violet text-white" : "border-border bg-surface text-muted"
                              }`}
                            >
                              {optionLetter}
                            </span>
                            <span className="pt-1">{option.text}</span>
                          </label>
                        );
                      })}
                    </div>

                    {hasCurrentQuestionValidation && (
                      <p className="mb-0 mt-4 text-sm font-medium text-error" id={validationMessageId} role="alert">
                        Select an answer before continuing.
                      </p>
                    )}
                  </section>
                );
              })()}

              <div className="flex justify-end pt-1">
                <button
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-cyan px-6 py-3 text-base font-semibold text-navy transition-all hover:-translate-y-px hover:bg-cyan-dark hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Submitting quiz..." : isLastQuestion ? "Submit quiz" : "Continue"}
                  {!isSubmitting && <ArrowRight aria-hidden="true" className="size-4" />}
                </button>
              </div>
            </form>
          </div>
        )}
      </PageContainer>
    </div>
  );
}

export default withAuthenticationRequired(QuizPage, {
  onRedirecting: () => <div>Redirecting...</div>,
});
