import { describe, it, expect } from "vitest";
import { render, within, fireEvent } from "@testing-library/react";
import { axe } from "vitest-axe";
import TspProbabilities from "./TspProbabilities";

// Queries are scoped to each render's container: the suite has no auto-cleanup,
// so document-wide queries would also match earlier tests' output.

describe("TspProbabilities accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(<TspProbabilities />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("describes both optima in the graph label", () => {
    const { container } = render(<TspProbabilities />);
    const graph = within(container).getByRole("img", { name: /^Complete graph/ });

    expect(graph).toHaveAccessibleName(/cheapest tour is [\d-]+ costing \d+/);
    expect(graph).toHaveAccessibleName(/best search order is [\d-]+ at an expected cost of [\d.]+/);
  });

  it("labels every edge cost and probability weight input", () => {
    const { container } = render(<TspProbabilities />);
    const costs = within(container).getByRole("group", { name: "Edge costs" });
    const weights = within(container).getByRole("group", { name: "Probability weights" });

    // Five nodes: ten edges, and four locations that can hold the object.
    expect(within(costs).getAllByRole("spinbutton")).toHaveLength(10);
    expect(within(weights).getAllByRole("spinbutton")).toHaveLength(4);
    expect(within(costs).getByRole("spinbutton", { name: "⌂–1" })).toBeInTheDocument();
  });

  it("shows the optimal routes as a table by default", () => {
    const { container } = render(<TspProbabilities />);
    const table = within(container).getByRole("table");

    // The default cost matrix is chosen so the two objectives disagree.
    expect(within(table).getAllByRole("row").length).toBeGreaterThan(2);
    expect(within(table).getByText(/of 24 routes/)).toBeInTheDocument();
  });

  it("shows the cost and expectation of every drawn route", () => {
    const { container } = render(<TspProbabilities />);
    const key = container.querySelector(".key")!;

    // Both optima are drawn by default, each with its two numbers.
    expect(key.querySelectorAll(".numbers")).toHaveLength(2);
    expect(key.textContent).toMatch(/tour \d+ · E\[cost] [\d.]+/);
  });

  it("recomputes the optima when an edge cost is edited", () => {
    const { container } = render(<TspProbabilities />);
    const before = within(container)
      .getByRole("img", { name: /^Complete graph/ })
      .getAttribute("aria-label");

    // Make the first leg out to node 1 ruinous; the search order must change.
    const homeToOne = within(container).getByRole("spinbutton", { name: "⌂–1" });
    fireEvent.change(homeToOne, { target: { value: "99" } });

    expect(
      within(container).getByRole("img", { name: /^Complete graph/ }).getAttribute("aria-label"),
    ).not.toBe(before);
  });

  it("moves the drawn routes' numbers even when the optimal routes do not change", () => {
    const { container } = render(<TspProbabilities />);
    const numbers = () =>
      [...container.querySelectorAll(".key .numbers")].map((n) => n.textContent).join("|");
    const sequences = () =>
      [...container.querySelectorAll(".key .sequence")].map((n) => n.textContent).join("|");

    const beforeSequences = sequences();
    const beforeNumbers = numbers();

    // Edge 1-3 is on neither optimal route, but every route home from node 1 is
    // still charged, so the expectations move while the routes stay put.
    fireEvent.change(within(container).getByRole("spinbutton", { name: "⌂–1" }), {
      target: { value: "9" },
    });

    expect(sequences()).toBe(beforeSequences);
    expect(numbers()).not.toBe(beforeNumbers);
  });
});
