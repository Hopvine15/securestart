import { useAuth0 } from "@auth0/auth0-react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Training from "../pages/Training";

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: vi.fn(),
  withAuthenticationRequired: <T,>(Component: T) => Component,
}));

const modules = [
  {
    id: "ai-phishing-risks",
    title: "AI Phishing Risks",
    description: "Learn how AI can make phishing attacks more convincing.",
    estimated_minutes: 10,
  },
];

const getAccessTokenSilently = vi.fn();
const fetchModules = vi.fn();

function renderTraining() {
  return render(
    <MemoryRouter initialEntries={["/training"]}>
      <Routes>
        <Route path="/training" element={<Training />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("My training page", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "https://api.example.test");
    getAccessTokenSilently.mockResolvedValue("test-access-token");
    fetchModules.mockResolvedValue({
      ok: true,
      json: async () => modules,
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

  it("loads and displays available modules", async () => {
    renderTraining();

    await waitFor(() => {
      expect(fetchModules).toHaveBeenCalledWith(
        "https://api.example.test/api/modules",
        expect.objectContaining({ headers: { Authorization: "Bearer test-access-token" } }),
      );
    });
    expect(await screen.findByRole("heading", { name: "My training modules" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: modules[0].title })).toBeInTheDocument();
  });

  it("marks My training as the active navigation item", () => {
    renderTraining();

    expect(screen.getByRole("link", { name: "My training" })).toHaveClass("bg-white/10");
  });
});
