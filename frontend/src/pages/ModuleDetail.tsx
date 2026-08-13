import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

type TrainingModule = {
  id: string;
  title: string;
  description: string;
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
    <main>
      <Link to="/dashboard">Back to dashboard</Link>

      {isLoading && <p>Loading training module...</p>}
      {error && <p>Unable to load this training module.</p>}

      {module && (
        <article>
          <header>
            <h1>{module.title}</h1>
            <p>{module.description}</p>
          </header>
          <div>{module.content}</div>
        </article>
      )}
    </main>
  );
}

export default withAuthenticationRequired(ModuleDetail, {
  onRedirecting: () => <div>Redirecting...</div>,
});
