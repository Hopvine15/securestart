import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import PageContainer from "../components/layout/PageContainer";
import ProductHeader from "../components/ProductHeader";
import ModuleCard, { type ModuleStatus } from "../components/training/ModuleCard";

type TrainingModule = {
  id: string;
  title: string;
  description: string;
  estimated_minutes: number;
};

type ProgressRecord = {
  module_id: string;
  best_score: number;
};

type ProgressResponse = {
  completed_modules: ProgressRecord[];
};

type DisplayTrainingModule = TrainingModule & {
  status: ModuleStatus;
  bestScore?: number;
};

const PASSING_SCORE = 80;

function Training() {
  const { getAccessTokenSilently } = useAuth0();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [progressError, setProgressError] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const loadModules = async () => {
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

          if (!Array.isArray(progressData.completed_modules)) {
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

    void loadModules();

    return () => {
      isCurrent = false;
    };
  }, [getAccessTokenSilently]);

  const progressByModuleId = new Map(
    progress?.completed_modules.map((record) => [record.module_id, record]) ?? [],
  );
  const displayedModules: DisplayTrainingModule[] = modules.map((module) => {
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

  return (
    <div className="min-h-screen bg-canvas">
      <ProductHeader active="training" />

      <PageContainer>
        <section aria-labelledby="training-modules-heading">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-cyan-dark">Your learning library</p>
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-ink" id="training-modules-heading">My training modules</h1>
          <p className="mb-6 text-md text-muted">Choose a module to build practical habits for working safely with AI.</p>

          {isLoading && <p className="my-6 text-muted">Loading training modules...</p>}
          {error && <p className="my-6 text-error">Unable to load training modules.</p>}
          {progressError && <p className="my-6 text-muted">Unable to load training progress. Showing modules as not started.</p>}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
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

export default withAuthenticationRequired(Training, {
  onRedirecting: () => <div>Redirecting...</div>,
});
