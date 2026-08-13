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
  status?: ModuleStatus;
};

function Dashboard() {
  const { user, getAccessTokenSilently } = useAuth0();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

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
            <strong className="text-4xl leading-none text-cyan">{modules.length}</strong>
            <span className="mt-1 text-center text-xs text-muted">modules available</span>
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <ModuleCard
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
