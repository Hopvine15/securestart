import { useAuth0 } from "@auth0/auth0-react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: vi.fn(),
  withAuthenticationRequired: <T,>(Component: T) => Component,
}));

const moduleId = "ai-phishing-risks";
const resultsPath = `/modules/${moduleId}/results`;
const getAccessTokenSilently = vi.fn();
const fetchApi = vi.fn();

function LocationDisplay() {
  const location = useLocation();

  return <output data-testid="location">{location.pathname}</output>;
}

function renderResults(attempt?: { score: number }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: resultsPath, state: attempt ? { attempt } : undefined }]}>
      <App />
      <LocationDisplay />
    </MemoryRouter>,
  );
}

describe("Results page", () => {
  beforeEach(() => {
    getAccessTokenSilently.mockResolvedValue("test-access-token");
    fetchApi.mockResolvedValue({ ok: true, json: async () => [] });
    vi.mocked(useAuth0).mockReturnValue({
      getAccessTokenSilently,
      logout: vi.fn(),
      user: { email: "learner@example.test" },
    } as never);
    vi.stubGlobal("fetch", fetchApi);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the server-calculated score with visible result feedback", () => {
    renderResults({ score: 80 });

    expect(screen.getByRole("heading", { name: "Quiz complete" })).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("Great work — you demonstrated a strong understanding of this module.")).toHaveAttribute(
      "role",
      "status",
    );
    expect(screen.getByText("Passed")).toBeInTheDocument();
    expect(screen.getByText("80% required to pass")).toBeInTheDocument();
  });

  it("renders the quiz module title alongside the result", () => {
    renderResults({ score: 80 });

    expect(screen.getAllByText("AI Phishing Risks").length).toBeGreaterThan(0);
    expect(screen.getByText("4 of 5 correct")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Next recommendation" })).toBeInTheDocument();
    expect(screen.getByText("You passed this module. Continue your training when you're ready.")).toBeInTheDocument();
  });

  it("marks scores below 80% as requiring a retake", () => {
    renderResults({ score: 60 });

    expect(screen.getByText("Retake required")).toBeInTheDocument();
    expect(screen.getByText("Review this module and retake the quiz. You need 80% to pass.")).toBeInTheDocument();
    expect(screen.getByText("Good progress — review the module content and try again to reach 80%.")).toHaveAttribute(
      "role",
      "status",
    );
  });

  it("returns the learner to the Dashboard", async () => {
    const user = userEvent.setup();
    renderResults({ score: 80 });

    await user.click(screen.getByRole("link", { name: "Return to dashboard" }));

    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
  });

  it("handles missing result navigation state without crashing", () => {
    renderResults();

    expect(screen.getByRole("heading", { name: "Quiz results unavailable" })).toBeInTheDocument();
    expect(screen.getByText("We couldn't find the result for this quiz attempt.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to dashboard" })).toBeInTheDocument();
  });
});
