import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import PageContainer from "../components/layout/PageContainer";
import ProductHeader from "../components/ProductHeader";
import ModuleCard, { type ModuleStatus } from "../components/training/ModuleCard";
import BaseCard from "../components/ui/BaseCard";

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

type DashboardModule = TrainingModule & {
  status: ModuleStatus;
  bestScore?: number;
};

const PASSING_SCORE = 80;

function Dashboard() {
  const { user, getAccessTokenSilently } = useAuth0();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [progressError, setProgressError] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const loadDashboard = async () => {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/modules`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Unable to load modules");
        }

        const data = (await response.json()) as TrainingModule[];

        if (isCurrent) {
          setModules(data);
        }

        try {
          const progressResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/progress`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!progressResponse.ok) {
            throw new Error("Unable to load training progress");
          }

          const progressData = (await progressResponse.json()) as ProgressResponse;

          if (!Array.isArray(progressData.completed_modules) || typeof progressData.completed_count !== "number") {
            throw new Error("Invalid training progress response");
          }

          if (isCurrent) {
            setProgress(progressData);
          }
        } catch {
          if (isCurrent) {
            setProgressError(true);
          }
        }
      } catch {
        if (isCurrent) {
          setError(true);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      isCurrent = false;
    };
  }, [getAccessTokenSilently]);

  const progressByModuleId = new Map(
    progress?.completed_modules?.map((record) => [record.module_id, record]) ?? [],
  );
  const displayedModules: DashboardModule[] = modules.map((module) => {
    const moduleProgress = progressByModuleId.get(module.id);

    if (!moduleProgress) {
      return { ...module, status: "not-started" };
    }

    return {
      ...module,
      status: moduleProgress.best_score >= PASSING_SCORE ? "completed" : "retake-required",
      bestScore: moduleProgress.best_score,
    };
  });
  const completedCount = displayedModules.filter((module) => module.status === "completed").length;
  const completedPercentage = modules.length === 0
    ? 0
    : Math.round((completedCount / modules.length) * 100);

  return (
    <div className="min-h-screen bg-canvas">
      <ProductHeader active="dashboard" />

      <PageContainer>
        <section className="mb-6">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-cyan-dark">Your learning space</p>
          <h1 className="mb-0.5 text-4xl font-bold tracking-tight text-ink">Welcome back, {user?.email?.split("@")[0] || "learner"}</h1>
          <p className="text-md text-muted">Keep building practical habits for working safely with AI.</p>
        </section>

        <BaseCard as="section" padding="lg" className="mb-6 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center" aria-labelledby="training-overview-heading">
          <div>
            <h2 className="mb-1 text-3xl font-bold tracking-tight text-ink" id="training-overview-heading">Training overview</h2>
            <p className="mb-0 text-md text-muted">Your assigned security training, all in one place.</p>
          </div>
          <div className="flex w-full min-w-36 flex-col items-center rounded-xl border border-border bg-surface-muted px-5 py-3 md:w-auto">
            <strong className="text-4xl leading-none text-cyan">{completedPercentage}%</strong>
            <span className="mt-1 text-center text-xs text-muted">{completedCount} of {modules.length} modules complete</span>
          </div>
        </BaseCard>

        <section aria-labelledby="available-modules-heading">
          <div className="mb-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-cyan-dark">Continue learning</p>
              <h2 className="mb-0 text-3xl font-bold tracking-tight text-ink" id="available-modules-heading">My training modules</h2>
            </div>
          </div>

          {isLoading && <p className="my-6 text-muted">Loading training modules...</p>}
          {error && <p className="my-6 text-error">Unable to load training modules.</p>}
          {progressError && <p className="my-6 text-muted">Unable to load training progress. Showing modules as not started.</p>}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayedModules.map((module) => (
              <ModuleCard
                bestScore={module.bestScore}
                description={module.description}
                estimatedMinutes={module.estimated_minutes}
                key={module.id}
                status={module.status}
                title={module.title}
                to={`/modules/${module.id}`}
              />
            ))}
          </div>
        </section>
      </PageContainer>
    </div>
  );
}

export default withAuthenticationRequired(Dashboard, {
  onRedirecting: () => <div>Redirecting...</div>,
});
