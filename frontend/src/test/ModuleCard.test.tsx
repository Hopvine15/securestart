import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import ModuleCard from "../components/training/ModuleCard";

function renderCard(status: "not-started" | "in-progress" | "retake-required" | "completed", progress?: number) {
  return render(
    <MemoryRouter>
      <ModuleCard
        description="A reusable dashboard module card."
        estimatedMinutes={10}
        progress={progress}
        status={status}
        title="Example module"
        to="/modules/example"
      />
    </MemoryRouter>,
  );
}

describe("ModuleCard", () => {
  afterEach(cleanup);

  it("renders the default not-started state", () => {
    renderCard("not-started");

    expect(screen.getByText("Not started")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start module: Example module" })).toBeInTheDocument();
  });

  it("renders the in-progress action", () => {
    renderCard("in-progress");

    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue: Example module" })).toBeInTheDocument();
  });

  it("renders the completed action", () => {
    renderCard("completed");

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review: Example module" })).toBeInTheDocument();
  });

  it("renders the retake-required action", () => {
    const { container } = renderCard("retake-required");

    expect(screen.getByText("Retake required")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retake module: Example module" })).toBeInTheDocument();
    expect(container.querySelector("article")?.firstElementChild).toHaveClass("bg-error");
    expect(screen.getByRole("progressbar")).toHaveClass("bg-border");
    expect(screen.getByText("0%")).toHaveClass("text-error");
  });

  it("shows supplied progress for an in-progress module", () => {
    renderCard("in-progress", 40);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("40%")).toBeInTheDocument();
  });
});
