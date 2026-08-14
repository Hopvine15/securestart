import { useAuth0 } from "@auth0/auth0-react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Landing from "../pages/Landing";

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: vi.fn(),
}));

const loginWithRedirect = vi.fn();

function renderLanding() {
  return render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  );
}

describe("Landing page", () => {
  beforeEach(() => {
    vi.mocked(useAuth0).mockReturnValue({ loginWithRedirect } as never);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each(["Get started", "Log in"])("starts the Auth0 login flow from the %s CTA", async (ctaName) => {
    const user = userEvent.setup();
    renderLanding();

    await user.click(screen.getByRole("button", { name: ctaName }));

    expect(loginWithRedirect).toHaveBeenCalledWith({
      appState: { returnTo: "/dashboard" },
    });
  });

  it("presents the training value proposition and benefits", () => {
    renderLanding();

    expect(screen.getByRole("heading", { name: "Cybersecurity training for AI-assisted work" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "SecureStart benefits" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Short modules" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Scenario quizzes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Track progress" })).toBeInTheDocument();
  });
});
