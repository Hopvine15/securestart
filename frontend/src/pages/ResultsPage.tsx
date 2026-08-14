import { CheckCircle2, ChevronRight, CircleAlert, Info, Star } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import ProductHeader from "../components/ProductHeader";
import ButtonLink from "../components/ui/ButtonLink";

type ResultNavigationState = {
  attempt?: {
    score?: unknown;
  };
};

function feedbackForScore(score: number) {
  if (score >= 80) {
    return "Great work — you demonstrated a strong understanding of this module.";
  }

  if (score >= 50) {
    return "Good progress — review the module content before moving on.";
  }

  return "Review the module and try the quiz again.";
}

function moduleTitleFromId(id?: string) {
  return id
    ?.split("-")
    .map((word) => (word.toLowerCase() === "ai" ? "AI" : `${word.charAt(0).toUpperCase()}${word.slice(1)}`))
    .join(" ") ?? "Training module";
}

function ResultsPage() {
  const { id } = useParams();
  const location = useLocation();
  const state = location.state as ResultNavigationState | null;
  const score = state?.attempt?.score;
  const hasResult = typeof score === "number" && Number.isFinite(score);
  const moduleTitle = moduleTitleFromId(id);

  if (!hasResult) {
    return (
      <div className="min-h-screen bg-canvas">
        <ProductHeader active="training" />
        <PageContainer className="max-w-3xl">
          <section className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card md:p-12">
            <CircleAlert aria-hidden="true" className="mx-auto size-8 text-muted" />
            <h1 className="mb-3 mt-4 text-3xl font-bold tracking-tight text-ink">Quiz results unavailable</h1>
            <p className="mx-auto max-w-lg text-md text-muted">We couldn't find the result for this quiz attempt.</p>
            <ButtonLink className="mt-4" to="/dashboard">Return to dashboard</ButtonLink>
          </section>
        </PageContainer>
      </div>
    );
  }

  const feedback = feedbackForScore(score);
  const correctAnswers = score / 20;

  return (
    <div className="min-h-screen bg-canvas">
      <ProductHeader active="training" />

      <PageContainer className="max-w-3xl">
          <section aria-labelledby="results-heading">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-ink" id="results-heading">Quiz complete</h1>
          <p className="mb-6 text-md text-muted">{moduleTitle} · Results</p>

          <article className="rounded-2xl border border-border bg-surface p-8 shadow-card md:p-10">
            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
              <div className="grid w-36 shrink-0 place-items-center rounded-xl border border-border bg-surface-muted px-4 py-5">
                <div className="flex gap-1" aria-label={`${score}% score`}>
                  {Array.from({ length: 5 }, (_, index) => {
                    const fill = Math.max(0, Math.min(1, (score - index * 20) / 20));

                    return (
                      <span className="relative block size-4" key={index}>
                        <Star aria-hidden="true" className="absolute inset-0 size-4 fill-border text-border" />
                        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                          <Star aria-hidden="true" className="size-4 fill-amber-700 text-amber-700" />
                        </span>
                      </span>
                    );
                  })}
                </div>
                <span className="mt-2 text-5xl font-bold tracking-tight text-ink">{score}%</span>
                <span className="mt-1 text-xs text-muted">{correctAnswers} of 5 correct</span>
              </div>
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-success-background px-3 py-1 text-sm font-semibold text-success-foreground">
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                  Completed
                </p>
                <h2 className="mb-2 text-2xl font-semibold tracking-tight text-ink">{moduleTitle}</h2>
                <p className="m-0 text-lg font-semibold text-ink" role="status">{feedback}</p>
              </div>
            </div>

            <section className="mt-8 flex items-start gap-3 rounded-xl border border-blue-500 bg-blue-50 p-4" aria-labelledby="recommendation-heading">
              <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-blue-700" />
              <div>
                <h2 className="mb-1 text-sm font-semibold text-blue-800" id="recommendation-heading">Next recommendation</h2>
                <p className="mb-0 text-sm text-blue-700">Review this module before continuing your training.</p>
              </div>
            </section>

            <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
              <Link
                className="inline-flex min-h-[51px] min-w-40 items-center justify-center rounded-control border border-border bg-surface px-6 py-3 text-base font-semibold text-ink no-underline transition-colors hover:border-cyan hover:text-cyan-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2"
                to={`/modules/${id}`}
              >
                Review module
              </Link>
              <Link
                className="inline-flex min-h-[51px] min-w-[219px] items-center justify-center gap-2 rounded-control bg-cyan px-6 py-3 text-base font-semibold text-navy no-underline transition-all hover:-translate-y-px hover:bg-cyan-dark hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2"
              to="/dashboard"
            >
              Return to dashboard
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
            </div>
          </article>
        </section>
      </PageContainer>
    </div>
  );
}

export default ResultsPage;
