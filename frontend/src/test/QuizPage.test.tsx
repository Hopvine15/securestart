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

const moduleId = "ai-phishing-risks";
const questionsUrl = `https://api.example.test/api/modules/${moduleId}/questions`;
const attemptsUrl = "https://api.example.test/api/quiz-attempts";

const questions = [
  {
    id: "verify-request",
    question: "What is the safest response to an unexpected payment request?",
    options: [
      { id: "verify", text: "Verify the request using a trusted contact method." },
      { id: "reply", text: "Reply directly to the email." },
    ],
  },
  {
    id: "inspect-link",
    question: "What should you do before opening a link in a suspicious message?",
    options: [
      { id: "inspect", text: "Inspect the destination independently." },
      { id: "open", text: "Open it quickly before it expires." },
    ],
  },
];

const getAccessTokenSilently = vi.fn();
const fetchApi = vi.fn();

function LocationDisplay() {
  const location = useLocation();

  return <output data-testid="location">{location.pathname}</output>;
}

function renderQuiz() {
  return render(
    <MemoryRouter initialEntries={[`/modules/${moduleId}/quiz`]}>
      <App />
      <LocationDisplay />
    </MemoryRouter>,
  );
}

function mockSuccessfulRequests() {
  fetchApi.mockImplementation(async (url: string) => {
    if (url === questionsUrl) {
      return {
        ok: true,
        json: async () => questions,
      };
    }

    if (url === attemptsUrl) {
      return {
        ok: true,
        json: async () => ({ score: 100 }),
      };
    }

    throw new Error(`Unexpected request to ${url}`);
  });
}

async function answerEveryQuestion(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("radio", { name: questions[0].options[0].text }));
  await user.click(screen.getByRole("radio", { name: questions[1].options[0].text }));
}

describe("Quiz page", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "https://api.example.test");
    getAccessTokenSilently.mockResolvedValue("test-access-token");
    mockSuccessfulRequests();
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
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fetches and renders each quiz question with its answer options", async () => {
    renderQuiz();

    expect(await screen.findByRole("heading", { name: "Quiz" })).toBeInTheDocument();
    expect(screen.getByText(questions[0].question)).toBeInTheDocument();
    expect(screen.getByText(questions[1].question)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: questions[0].options[0].text })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: questions[1].options[1].text })).toBeInTheDocument();
  });

  it("requests quiz questions with the Auth0 bearer token", async () => {
    renderQuiz();

    await waitFor(() => {
      expect(fetchApi).toHaveBeenCalledWith(
        questionsUrl,
        expect.objectContaining({
          headers: { Authorization: "Bearer test-access-token" },
        }),
      );
    });
  });

  it("lets a learner select one answer for each question", async () => {
    const user = userEvent.setup();
    renderQuiz();

    await answerEveryQuestion(user);

    expect(screen.getByRole("radio", { name: questions[0].options[0].text })).toBeChecked();
    expect(screen.getByRole("radio", { name: questions[0].options[1].text })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: questions[1].options[0].text })).toBeChecked();
  });

  it("flags unanswered questions with accessible text and does not submit an incomplete quiz", async () => {
    const user = userEvent.setup();
    renderQuiz();

    await user.click(await screen.findByRole("radio", { name: questions[0].options[0].text }));
    await user.click(screen.getByRole("button", { name: "Submit quiz" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Please answer every question before submitting.");
    expect(screen.getByText("Please select an answer before submitting.")).toBeInTheDocument();
    expect(fetchApi).not.toHaveBeenCalledWith(
      attemptsUrl,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("submits every selected answer for the current module", async () => {
    const user = userEvent.setup();
    renderQuiz();

    await answerEveryQuestion(user);
    await user.click(screen.getByRole("button", { name: "Submit quiz" }));

    await waitFor(() => {
      expect(fetchApi).toHaveBeenCalledWith(
        attemptsUrl,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            module_id: moduleId,
            answers: [
              { question_id: questions[0].id, selected_answer: questions[0].options[0].id },
              { question_id: questions[1].id, selected_answer: questions[1].options[0].id },
            ],
          }),
        }),
      );
    });
  });

  it("submits quiz attempts with the Auth0 bearer token", async () => {
    const user = userEvent.setup();
    renderQuiz();

    await answerEveryQuestion(user);
    await user.click(screen.getByRole("button", { name: "Submit quiz" }));

    await waitFor(() => {
      expect(fetchApi).toHaveBeenCalledWith(
        attemptsUrl,
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test-access-token",
            "Content-Type": "application/json",
          },
        }),
      );
    });
  });

  it("navigates to the module results route after a successful submission", async () => {
    const user = userEvent.setup();
    renderQuiz();

    await answerEveryQuestion(user);
    await user.click(screen.getByRole("button", { name: "Submit quiz" }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent(`/modules/${moduleId}/results`);
    });
  });

  it("shows a usable error when quiz questions cannot be loaded", async () => {
    fetchApi.mockResolvedValue({ ok: false });
    renderQuiz();

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load quiz questions. Please try again.");
  });

  it("shows a usable error when quiz submission fails", async () => {
    const user = userEvent.setup();
    fetchApi.mockImplementation(async (url: string) => {
      if (url === questionsUrl) {
        return { ok: true, json: async () => questions };
      }

      return { ok: false };
    });
    renderQuiz();

    await answerEveryQuestion(user);
    await user.click(screen.getByRole("button", { name: "Submit quiz" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to submit quiz. Please try again.");
  });
});
