import { useAuth0 } from "@auth0/auth0-react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "../Dashboard";

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: vi.fn(),
  withAuthenticationRequired: <T,>(Component: T) => Component,
}));

const module = {
  id: "ai-phishing-risks",
  title: "AI Phishing Risks",
  description: "Learn how AI can make phishing attacks more convincing.",
  content: "...",
};

const getAccessTokenSilently = vi.fn();
const fetchModules = vi.fn();

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/modules/:id" element={<p>Module detail page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Dashboard module list", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "https://api.example.test");
    getAccessTokenSilently.mockResolvedValue("test-access-token");
    fetchModules.mockResolvedValue({
      ok: true,
      json: async () => [module],
    });
    vi.mocked(useAuth0).mockReturnValue({
      getAccessTokenSilently,
      logout: vi.fn(),
      user: { email: "learner@example.test" },
    } as never);
    vi.stubGlobal("fetch", fetchModules);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requests available modules with the Auth0 bearer token", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(fetchModules).toHaveBeenCalledWith(
        "https://api.example.test/api/modules",
        expect.objectContaining({
          headers: { Authorization: "Bearer test-access-token" },
        }),
      );
    });
  });

  it("renders the title and description of available training modules", async () => {
    renderDashboard();

    expect(await screen.findByText(module.title)).toBeInTheDocument();
    expect(await screen.findByText(module.description)).toBeInTheDocument();
  });

  it("opens a selected module", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByRole("link", { name: module.title }));

    expect(screen.getByText("Module detail page")).toBeInTheDocument();
  });
});
