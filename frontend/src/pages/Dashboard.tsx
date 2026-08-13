import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type TrainingModule = {
  id: string;
  title: string;
  description: string;
};

function Dashboard() {
  const { logout, user, getAccessTokenSilently } = useAuth0();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  };

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
    <>
      <h1>Dashboard</h1>

      {user?.email && <p>Logged in as {user.email}</p>}

      <button onClick={handleLogout}>Logout</button>

      <section aria-labelledby="available-modules-heading">
        <h2 id="available-modules-heading">Available training modules</h2>

        {isLoading && <p>Loading training modules...</p>}
        {error && <p>Unable to load training modules.</p>}

        <div>
          {modules.map((module) => (
            <article key={module.id}>
              <h3>
                <Link to={`/modules/${module.id}`}>{module.title}</Link>
              </h3>
              <p>{module.description}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export default withAuthenticationRequired(Dashboard, {
  onRedirecting: () => <div>Redirecting...</div>,
});
