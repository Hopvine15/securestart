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
  {
    id: "password-hygiene",
    title: "Password hygiene",
    description: "Create and protect strong passwords.",
    estimated_minutes: 8,
  },
];

const progress = {
  completed_modules: [
    { module_id: "ai-phishing-risks", best_score: 80 },
    { module_id: "password-hygiene", best_score: 50 },
  ],
};

const getAccessTokenSilently = vi.fn();
const fetchTrainingData = vi.fn();

function renderTraining() {
  return render(
    <MemoryRouter initialEntries={["/mytraining"]}>
      <Routes>
        <Route path="/mytraining" element={<Training />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("My training page", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "https://api.example.test");
    getAccessTokenSilently.mockResolvedValue("test-access-token");
    fetchTrainingData.mockImplementation((url: string) => {
      if (url.endsWith("/api/modules")) {
        return Promise.resolve({ ok: true, json: async () => modules });
      }

      if (url.endsWith("/api/progress")) {
        return Promise.resolve({ ok: true, json: async () => progress });
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.mocked(useAuth0).mockReturnValue({
      getAccessTokenSilently,
      logout: vi.fn(),
      user: { email: "learner@example.test" },
    } as never);
    vi.stubGlobal("fetch", fetchTrainingData);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("loads modules and progress with the Auth0 bearer token", async () => {
    renderTraining();

    await waitFor(() => {
      expect(fetchTrainingData).toHaveBeenCalledWith(
        "https://api.example.test/api/modules",
        expect.objectContaining({ headers: { Authorization: "Bearer test-access-token" } }),
      );
      expect(fetchTrainingData).toHaveBeenCalledWith(
        "https://api.example.test/api/progress",
        expect.objectContaining({ headers: { Authorization: "Bearer test-access-token" } }),
      );
    });
    expect(await screen.findByRole("heading", { name: "My training modules" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: modules[0].title })).toBeInTheDocument();
  });

  it("shows matching progress statuses and scores on its cards", async () => {
    renderTraining();

    const completedModule = (await screen.findByRole("link", { name: "AI Phishing Risks" })).closest("article");
    const retakeModule = screen.getByRole("link", { name: "Password hygiene" }).closest("article");

    expect(completedModule).toHaveTextContent("Completed");
    expect(completedModule).toHaveTextContent("Best score: 80%");
    expect(retakeModule).toHaveTextContent("Retake required");
    expect(retakeModule).toHaveTextContent("Best score: 50%");
  });

  it("marks My training as the active navigation item", () => {
    renderTraining();

    expect(screen.getByRole("link", { name: "My training" })).toHaveClass("bg-white/10");
  });
});
