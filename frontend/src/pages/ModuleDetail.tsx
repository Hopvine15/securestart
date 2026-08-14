import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import ProductHeader from "../components/ProductHeader";
import BaseCard from "../components/ui/BaseCard";
import ButtonLink from "../components/ui/ButtonLink";

type TrainingModule = {
  id: string;
  title: string;
  description: string;
  learning_objective: string;
  estimated_minutes: number;
  content: string;
};

function ModuleDetail() {
  const { id } = useParams();
  const { getAccessTokenSilently } = useAuth0();
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const loadModule = async () => {
      if (!id) {
        setError(true);
        setIsLoading(false);
        return;
      }

      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/modules/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Unable to load module");
        }

        const data = (await response.json()) as TrainingModule;

        if (isCurrent) {
          setModule(data);
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

    void loadModule();

    return () => {
      isCurrent = false;
    };
  }, [getAccessTokenSilently, id]);

  return (
    <div className="min-h-screen bg-canvas">
      <ProductHeader active="training" />

      <PageContainer width="content">
        <Link className="mb-4 ml-2 inline-block text-sm text-muted no-underline hover:text-cyan-dark md:ml-6" to="/dashboard">← Back to dashboard</Link>

        {isLoading && <p className="my-6 text-muted">Loading training module...</p>}
        {error && <p className="my-6 text-error">Unable to load this training module.</p>}

        {module && (
          <>
            <BaseCard as="article" padding="lg" className="grid gap-6 md:grid-cols-2">
              <div>
                <span className="rounded-full bg-cyan-soft px-2.5 py-1.5 text-2xs font-bold uppercase tracking-wide text-status-text">Training module</span>
                <h1 className="my-4 text-4xl font-bold tracking-tight text-ink md:text-5xl">{module.title}</h1>
                <p className="mb-6 text-lg text-muted">{module.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span>{module.estimated_minutes} min read</span>
                  <span className="border-l border-border pl-4">Security learning</span>
                </div>
              </div>
              <aside className="self-start rounded-xl border border-border bg-surface-muted p-6">
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-cyan-dark">Learning objective</p>
                <p className="mb-0 text-md text-muted">{module.learning_objective}</p>
              </aside>
            </BaseCard>

            <BaseCard as="article" className="mt-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-cyan-dark">Module content</p>
              <div className="max-w-prose space-y-4 text-base text-ink">
                {module.content.split("\n\n").map((paragraph, index) => (
                  <p key={`${module.id}-${index}`}>{paragraph}</p>
                ))}
              </div>
              <div className="mt-8 border-t border-border pt-6">
                <p className="mb-3 text-sm text-muted">Ready to check what you learned?</p>
                <ButtonLink ariaLabel={`Start quiz: ${module.title}`} to={`/modules/${module.id}/quiz`}>
                  Start quiz
                </ButtonLink>
              </div>
            </BaseCard>
          </>
        )}
      </PageContainer>
    </div>
  );
}

export default withAuthenticationRequired(ModuleDetail, {
  onRedirecting: () => <div>Redirecting...</div>,
});
