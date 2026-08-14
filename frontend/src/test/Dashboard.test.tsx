import { useAuth0 } from "@auth0/auth0-react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "../pages/Dashboard";

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
  {
    id: "secure-browsing",
    title: "Secure browsing",
    description: "Recognise common online threats.",
    estimated_minutes: 12,
  },
  {
    id: "device-security",
    title: "Device security",
    description: "Keep your work devices protected.",
    estimated_minutes: 15,
  },
];

const progressWithRetakeRequired = {
  completed_modules: [
    {
      module_id: "ai-phishing-risks",
      best_score: 80,
      completed_at: { $date: { $numberLong: "1000" } },
    },
    {
      module_id: "password-hygiene",
      best_score: 50,
      completed_at: { $date: { $numberLong: "2000" } },
    },
  ],
  completed_count: 2,
};

const progressAfterSuccessfulRetake = {
  completed_modules: [
    {
      module_id: "ai-phishing-risks",
      best_score: 80,
      completed_at: { $date: { $numberLong: "1000" } },
    },
    {
      module_id: "password-hygiene",
      best_score: 90,
      completed_at: { $date: { $numberLong: "3000" } },
    },
  ],
  completed_count: 2,
};

const getAccessTokenSilently = vi.fn();
const fetchDashboardData = vi.fn();

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

describe("Dashboard progress", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "https://api.example.test");
    getAccessTokenSilently.mockResolvedValue("test-access-token");
    fetchDashboardData.mockImplementation((url: string) => {
      if (url.endsWith("/api/modules")) {
        return Promise.resolve({ ok: true, json: async () => modules });
      }

      if (url.endsWith("/api/progress")) {
        return Promise.resolve({ ok: true, json: async () => progressWithRetakeRequired });
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.mocked(useAuth0).mockReturnValue({
      getAccessTokenSilently,
      logout: vi.fn(),
      user: { email: "learner@example.test" },
    } as never);
    vi.stubGlobal("fetch", fetchDashboardData);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requests available modules and progress with the Auth0 bearer token", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledWith(
        "https://api.example.test/api/modules",
        expect.objectContaining({
          headers: { Authorization: "Bearer test-access-token" },
        }),
      );
      expect(fetchDashboardData).toHaveBeenCalledWith(
        "https://api.example.test/api/progress",
        expect.objectContaining({
          headers: { Authorization: "Bearer test-access-token" },
        }),
      );
    });
  });

  it("marks modules with progress as completed and displays their best score", async () => {
    renderDashboard();

    const completedModule = (await screen.findByRole("link", { name: "AI Phishing Risks" })).closest("article");

    expect(completedModule).toHaveTextContent("Completed");
    expect(completedModule).toHaveTextContent("Best score: 80%");
  });

  it("leaves modules with no progress record as not started", async () => {
    renderDashboard();

    const unstartedModule = (await screen.findByRole("link", { name: "Secure browsing" })).closest("article");

    expect(unstartedModule).toHaveTextContent("Not started");
    expect(unstartedModule).not.toHaveTextContent("Best score:");
  });

  it("marks scores below 80% as requiring a retake rather than completed", async () => {
    renderDashboard();

    const retakeModule = (await screen.findByRole("link", { name: "Password hygiene" })).closest("article");

    expect(retakeModule).toHaveTextContent("Retake required");
    expect(retakeModule).toHaveTextContent("Best score: 50%");
    expect(screen.getByRole("link", { name: "Retake module: Password hygiene" })).toBeInTheDocument();
  });

  it("counts only modules meeting the 80% pass threshold", async () => {
    renderDashboard();

    expect(await screen.findByText("1 of 4 modules complete")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("marks a later successful retake as completed", async () => {
    fetchDashboardData.mockImplementation((url: string) => {
      if (url.endsWith("/api/modules")) {
        return Promise.resolve({ ok: true, json: async () => modules });
      }

      return Promise.resolve({ ok: true, json: async () => progressAfterSuccessfulRetake });
    });
    renderDashboard();

    const completedRetake = (await screen.findByRole("link", { name: "Password hygiene" })).closest("article");

    expect(completedRetake).toHaveTextContent("Completed");
    expect(completedRetake).toHaveTextContent("Best score: 90%");
    expect(screen.getByRole("link", { name: "Review: Password hygiene" })).toBeInTheDocument();
    expect(screen.getByText("2 of 4 modules complete")).toBeInTheDocument();
  });

  it("handles empty progress as no completed modules", async () => {
    fetchDashboardData.mockImplementation((url: string) => {
      if (url.endsWith("/api/modules")) {
        return Promise.resolve({ ok: true, json: async () => modules });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ completed_modules: [], completed_count: 0 }),
      });
    });
    renderDashboard();

    expect(await screen.findByText("0 of 4 modules complete")).toBeInTheDocument();
    expect(screen.getByText("0%", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getAllByText("Not started")).toHaveLength(4);
  });

  it("keeps modules visible with a sensible fallback when progress cannot be loaded", async () => {
    fetchDashboardData.mockImplementation((url: string) => {
      if (url.endsWith("/api/modules")) {
        return Promise.resolve({ ok: true, json: async () => modules });
      }

      return Promise.resolve({ ok: false });
    });
    renderDashboard();

    expect(await screen.findByText("Unable to load training progress. Showing modules as not started.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "AI Phishing Risks" })).toBeInTheDocument();
  });

  it("opens a selected module", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByRole("link", { name: modules[0].title }));

    expect(screen.getByText("Module detail page")).toBeInTheDocument();
  });
});
