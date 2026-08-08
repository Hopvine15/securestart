import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";

function Dashboard() {
  const { logout, user, getAccessTokenSilently } = useAuth0();

  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  };

  const testApi = async () => {
    try {
      const token = await getAccessTokenSilently();

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth-test`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.text();

      console.log(data);
    } catch (error) {
      console.error("API request failed:", error);
    }
  };

  return (
    <>
      <h1>Dashboard</h1>

      {user?.email && <p>Logged in as {user.email}</p>}

      <button onClick={handleLogout}>Logout</button>
      <br />
      <br />
      <button onClick={testApi}>Test API</button>
    </>
  );
}

export default withAuthenticationRequired(Dashboard, {
  onRedirecting: () => <div>Redirecting...</div>,
});
