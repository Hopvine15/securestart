import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import { BrowserRouter, useNavigate } from "react-router-dom";
import App from "./App";

function Auth0ProviderWithNavigate() {
  const navigate = useNavigate();

  const onRedirectCallback = (appState?: { returnTo?: string }) => {
    navigate(appState?.returnTo || "/");
  };

  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      }}
      onRedirectCallback={onRedirectCallback}
    >
      <App />
    </Auth0Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Auth0ProviderWithNavigate />
    </BrowserRouter>
  </StrictMode>,
);
