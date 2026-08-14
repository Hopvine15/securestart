import { useAuth0 } from "@auth0/auth0-react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

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

const progress = {
  completed_modules: [
    {
      module_id: "ai-phishing-risks",
      best_score: 80,
      completed_at: { $date: { $numberLong: "1786708800000" } },
    },
    {
      module_id: "password-hygiene",
      best_score: 50,
      completed_at: { $date: { $numberLong: "1786795200000" } },
    },
  ],
  completed_count: 2,
};

const getAccessTokenSilently = vi.fn();
const fetchProgressPageData = vi.fn();

function LocationDisplay() {
  const location = useLocation();

  return <output data-testid="current-location">{location.pathname}</output>;
}

function renderProgressPage(initialEntry = "/progress") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
      <LocationDisplay />
    </MemoryRouter>,
  );
}

describe("Progress page", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "https://api.example.test");
    getAccessTokenSilently.mockResolvedValue("test-access-token");
    fetchProgressPageData.mockImplementation((url: string) => {
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
    vi.stubGlobal("fetch", fetchProgressPageData);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("loads the authenticated user's modules and progress with bearer authentication", async () => {
    renderProgressPage();

    await waitFor(() => {
      expect(fetchProgressPageData).toHaveBeenCalledWith(
        "https://api.example.test/api/modules",
        expect.objectContaining({ headers: { Authorization: "Bearer test-access-token" } }),
      );
      expect(fetchProgressPageData).toHaveBeenCalledWith(
        "https://api.example.test/api/progress",
        expect.objectContaining({ headers: { Authorization: "Bearer test-access-token" } }),
      );
    });
  });

  it("shows overall completion, the completed-module count, and a status summary", async () => {
    renderProgressPage();

    expect(await screen.findByText("25%", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("1 of 4 modules complete")).toBeInTheDocument();
    expect(screen.getByText("1 completed · 1 retake required · 2 not started")).toBeInTheDocument();
  });

  it("shows every module in a compact progress record with its status", async () => {
    renderProgressPage();

    expect(await screen.findByRole("table", { name: "Module progress" })).toBeInTheDocument();
    expect(await screen.findByRole("row", { name: /AI Phishing Risks/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Password hygiene/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Secure browsing/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Device security/ })).toBeInTheDocument();
    expect(screen.getAllByText("Completed")).toHaveLength(1);
    expect(screen.getByText("Retake required")).toBeInTheDocument();
    expect(screen.getAllByText("Not started")).toHaveLength(2);
  });

  it("uses the 80% pass threshold and shows best scores and last attempt dates", async () => {
    renderProgressPage();

    const completedModule = await screen.findByRole("row", { name: /AI Phishing Risks/ });
    const failedModule = screen.getByRole("row", { name: /Password hygiene/ });

    expect(completedModule).toHaveTextContent("Completed");
    expect(completedModule).toHaveTextContent("80%");
    expect(completedModule).toHaveTextContent("14 Aug 2026");
    expect(failedModule).toHaveTextContent("Retake required");
    expect(failedModule).toHaveTextContent("50%");
    expect(failedModule).toHaveTextContent("15 Aug 2026");
  });

  it("offers Review for completed modules and Retake for failed attempts", async () => {
    renderProgressPage();

    expect(await screen.findByRole("link", { name: "Review: AI Phishing Risks" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retake module: Password hygiene" })).toBeInTheDocument();
  });

  it("shows a valid zero-progress view when there are no attempts", async () => {
    fetchProgressPageData.mockImplementation((url: string) => {
      if (url.endsWith("/api/modules")) {
        return Promise.resolve({ ok: true, json: async () => modules });
      }

      return Promise.resolve({ ok: true, json: async () => ({ completed_modules: [], completed_count: 0 }) });
    });
    renderProgressPage();

    expect(await screen.findByText("0%", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("0 of 4 modules complete")).toBeInTheDocument();
    expect(screen.getByText("0 completed · 0 retake required · 4 not started")).toBeInTheDocument();
    expect(screen.getAllByText("Not started")).toHaveLength(4);
  });

  it("keeps the page usable when progress loading fails", async () => {
    fetchProgressPageData.mockImplementation((url: string) => {
      if (url.endsWith("/api/modules")) {
        return Promise.resolve({ ok: true, json: async () => modules });
      }

      return Promise.resolve({ ok: false });
    });
    renderProgressPage();

    expect(await screen.findByText("Unable to load training progress. Showing modules as not started.")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /AI Phishing Risks/ })).toBeInTheDocument();
  });

  it("opens /progress from the authenticated header and marks it active", async () => {
    const user = userEvent.setup();
    renderProgressPage("/dashboard");

    await user.click(await screen.findByRole("link", { name: "Progress" }));

    expect(screen.getByTestId("current-location")).toHaveTextContent("/progress");
    expect(screen.getByRole("link", { name: "Progress" })).toHaveClass("bg-white/10");
  });
});
