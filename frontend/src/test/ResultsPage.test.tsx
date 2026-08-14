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
    expect(screen.getByRole("status")).toHaveTextContent(
      "Great work — you demonstrated a strong understanding of this module.",
    );
  });

  it("renders a next recommendation", () => {
    renderResults({ score: 80 });

    expect(screen.getByRole("heading", { name: "Next recommendation" })).toBeInTheDocument();
    expect(screen.getByText("Return to your dashboard and continue your training.")).toBeInTheDocument();
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
