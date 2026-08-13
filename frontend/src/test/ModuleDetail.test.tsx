import { useAuth0 } from "@auth0/auth0-react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ModuleDetail from "../pages/ModuleDetail";

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: vi.fn(),
  withAuthenticationRequired: <T,>(Component: T) => Component,
}));

const trainingModule = {
  id: "ai-phishing-risks",
  title: "AI Phishing Risks",
  description: "Learn how AI can make phishing attacks more convincing.",
  content: "Check the sender, verify links independently, and report suspicious messages.",
};

const getAccessTokenSilently = vi.fn();
const fetchModule = vi.fn();

function renderModuleDetail() {
  return render(
    <MemoryRouter initialEntries={[`/modules/${trainingModule.id}`]}>
      <Routes>
        <Route path="/modules/:id" element={<ModuleDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Module detail page", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "https://api.example.test");
    getAccessTokenSilently.mockResolvedValue("test-access-token");
    fetchModule.mockResolvedValue({
      ok: true,
      json: async () => trainingModule,
    });
    vi.mocked(useAuth0).mockReturnValue({
      getAccessTokenSilently,
    } as never);
    vi.stubGlobal("fetch", fetchModule);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("loads the selected module with the Auth0 bearer token", async () => {
    renderModuleDetail();

    await waitFor(() => {
      expect(fetchModule).toHaveBeenCalledWith(
        `https://api.example.test/api/modules/${trainingModule.id}`,
        expect.objectContaining({
          headers: { Authorization: "Bearer test-access-token" },
        }),
      );
    });
  });

  it("renders the module content returned by the API", async () => {
    renderModuleDetail();

    expect(await screen.findByRole("heading", { name: trainingModule.title })).toBeInTheDocument();
    expect(await screen.findByText(trainingModule.description)).toBeInTheDocument();
    expect(await screen.findByText(trainingModule.content)).toBeInTheDocument();
  });

  it("shows an error when the selected module cannot be loaded", async () => {
    fetchModule.mockResolvedValue({ ok: false });
    renderModuleDetail();

    expect(await screen.findByText("Unable to load this training module.")).toBeInTheDocument();
  });
});
