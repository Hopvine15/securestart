import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import type { ModuleStatus } from "../components/training/ModuleCard";
import PageContainer from "../components/layout/PageContainer";
import ProductHeader from "../components/ProductHeader";
import BaseCard from "../components/ui/BaseCard";
import ButtonLink from "../components/ui/ButtonLink";

type TrainingModule = {
  id: string;
  title: string;
  description: string;
  estimated_minutes: number;
};

type ProgressRecord = {
  module_id: string;
  best_score: number;
  completed_at: unknown;
};

type ProgressResponse = {
  completed_modules: ProgressRecord[];
  completed_count: number;
};

type ProgressModule = TrainingModule & {
  status: ModuleStatus;
  bestScore?: number;
  completedAt?: unknown;
};

const PASSING_SCORE = 80;

const statusStyles: Record<ModuleStatus, string> = {
  "not-started": "border-border bg-surface-muted text-muted",
  "in-progress": "border-cyan bg-cyan text-cyan-dark",
  "retake-required": "border-error bg-surface-muted text-error",
  completed: "border-success-foreground bg-success-background text-success-foreground",
};

function statusLabel(status: ModuleStatus) {
  if (status === "retake-required") return "Retake required";
  if (status === "completed") return "Completed";
  return "Not started";
}

function formatAttemptDate(completedAt: unknown) {
  let value: string | number | undefined;

  if (typeof completedAt === "string" || typeof completedAt === "number") {
    value = completedAt;
  } else if (completedAt && typeof completedAt === "object" && "$date" in completedAt) {
    const dateValue = completedAt.$date;
    value = typeof dateValue === "object" && dateValue && "$numberLong" in dateValue
      ? dateValue.$numberLong as string
      : typeof dateValue === "string" || typeof dateValue === "number" ? dateValue : undefined;
  }

  if (value === undefined) return "—";

  const date = new Date(typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function Progress() {
  const { getAccessTokenSilently } = useAuth0();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [progressError, setProgressError] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const loadProgress = async () => {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
        });
        const modulesResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/modules`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!modulesResponse.ok) throw new Error("Unable to load modules");

        const modulesData = (await modulesResponse.json()) as TrainingModule[];
        if (isCurrent) setModules(modulesData);

        try {
          const progressResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/progress`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!progressResponse.ok) throw new Error("Unable to load training progress");

          const progressData = (await progressResponse.json()) as ProgressResponse;
          if (!Array.isArray(progressData.completed_modules) || typeof progressData.completed_count !== "number") {
            throw new Error("Invalid training progress response");
          }

          if (isCurrent) setProgress(progressData);
        } catch {
          if (isCurrent) setProgressError(true);
        }
      } catch {
        if (isCurrent) setError(true);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    void loadProgress();
    return () => { isCurrent = false; };
  }, [getAccessTokenSilently]);

  const progressByModuleId = new Map(
    progress?.completed_modules.map((record) => [record.module_id, record]) ?? [],
  );
  const displayedModules: ProgressModule[] = modules.map((module) => {
    const moduleProgress = progressByModuleId.get(module.id);
    if (!moduleProgress) return { ...module, status: "not-started" };

    return {
      ...module,
      status: moduleProgress.best_score >= PASSING_SCORE ? "completed" : "retake-required",
      bestScore: moduleProgress.best_score,
      completedAt: moduleProgress.completed_at,
    };
  });
  const completedCount = displayedModules.filter((module) => module.status === "completed").length;
  const retakeCount = displayedModules.filter((module) => module.status === "retake-required").length;
  const notStartedCount = displayedModules.filter((module) => module.status === "not-started").length;
  const completedPercentage = modules.length === 0 ? 0 : Math.round((completedCount / modules.length) * 100);

  return (
    <div className="min-h-screen bg-canvas">
      <ProductHeader active="progress" />

      <PageContainer>
        <section className="mb-6">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-cyan-dark">Your learning progress</p>
          <h1 className="mb-0.5 text-4xl font-bold tracking-tight text-ink">Progress</h1>
          <p className="text-md text-muted">Review your training history and completion status.</p>
        </section>

        <BaseCard as="section" padding="md" className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-center" aria-labelledby="progress-overview-heading">
          <div>
            <h2 className="mb-1 text-2xl font-bold tracking-tight text-ink" id="progress-overview-heading">Training overview</h2>
            <p className="mb-0 text-sm text-muted">Your completed training modules at a glance.</p>
            <p className="mb-0 mt-4 inline-flex rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-muted">
              {completedCount} completed · {retakeCount} retake required · {notStartedCount} not started
            </p>
          </div>
          <div className="flex w-full min-w-40 flex-col items-center rounded-xl border border-border bg-surface-muted px-6 py-4 md:w-auto">
            <strong className="text-3xl leading-none text-cyan">{completedPercentage}%</strong>
            <span className="mt-1 text-center text-xs text-muted">{completedCount} of {modules.length} modules complete</span>
          </div>
        </BaseCard>

        <section aria-labelledby="module-progress-heading">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="mb-0 text-2xl font-bold tracking-tight text-ink" id="module-progress-heading">Training record</h2>
            <p className="mb-0 text-sm text-muted">Latest attempt for each module</p>
          </div>

          {isLoading && <p className="my-6 text-muted">Loading training modules...</p>}
          {error && <p className="my-6 text-error">Unable to load training modules.</p>}
          {progressError && <p className="my-6 text-muted">Unable to load training progress. Showing modules as not started.</p>}

          <BaseCard padding="none" className="overflow-x-auto">
            <table aria-label="Module progress" className="w-full min-w-[44rem] border-collapse text-left">
              <thead className="border-b border-border bg-surface-muted text-xs font-bold uppercase tracking-wide text-muted">
                <tr>
                  <th className="w-[40%] px-5 py-3">Module</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Best score</th>
                  <th className="px-5 py-3">Last attempt</th>
                  <th className="px-5 py-3"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {displayedModules.map((module) => (
                  <tr className="border-b border-border last:border-b-0" key={module.id}>
                    <td className="px-5 py-3.5">
                      <p className="mb-0 font-semibold text-ink">{module.title}</p>
                      <p className="mb-0.5 text-xs text-muted">{module.estimated_minutes} min</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusStyles[module.status]}`}>
                        {statusLabel(module.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-ink">{module.bestScore === undefined ? "—" : `${module.bestScore}%`}</td>
                    <td className="px-5 py-3.5 text-sm text-muted">{module.completedAt === undefined ? "—" : formatAttemptDate(module.completedAt)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {module.status === "completed" && (
                        <ButtonLink ariaLabel={`Review: ${module.title}`} className="px-4 py-2 text-sm" to={`/modules/${module.id}`} variant="secondary">Review</ButtonLink>
                      )}
                      {module.status === "retake-required" && (
                        <ButtonLink ariaLabel={`Retake module: ${module.title}`} className="px-4 py-2 text-sm" to={`/modules/${module.id}`} variant="dark">Retake</ButtonLink>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </BaseCard>
        </section>
      </PageContainer>
    </div>
  );
}

export default withAuthenticationRequired(Progress, {
  onRedirecting: () => <div>Redirecting...</div>,
});
