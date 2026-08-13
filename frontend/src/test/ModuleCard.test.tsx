import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import ModuleCard from "../components/training/ModuleCard";

function renderCard(status: "not-started" | "in-progress" | "completed") {
  return render(
    <MemoryRouter>
      <ModuleCard
        description="A reusable dashboard module card."
        estimatedMinutes={10}
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

  it("pushes the primary action to the bottom of the card", () => {
    renderCard("not-started");

    expect(screen.getByRole("link", { name: "Start module: Example module" })).toHaveClass("mt-auto");
  });
});
