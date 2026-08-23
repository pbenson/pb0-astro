import { describe, it, expect } from "vitest";
import { render, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import TspEuclidean from "./TspEuclidean";

// Queries are scoped to each render's container: the suite has no auto-cleanup,
// so document-wide queries would also match earlier tests' output.

describe("TspEuclidean accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(<TspEuclidean />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("describes both optima in the graph label", () => {
    const { container } = render(<TspEuclidean />);
    const graph = within(container).getByRole("group", { name: /^Graph of/ });

    expect(graph).toHaveAccessibleName(/shortest tour is [\d-]+ at length \d+/);
    expect(graph).toHaveAccessibleName(/best search order is [\d-]+ at an expected cost of \d+/);
  });

  it("makes every location reachable and movable without a pointer", () => {
    const { container } = render(<TspEuclidean />);
    const handles = within(container).getAllByRole("button", { name: /Home|Location \d/ });

    expect(handles).toHaveLength(5);
    expect(handles[0]).toHaveAccessibleName(/Home/);
    for (const handle of handles) {
      expect(handle).toHaveAttribute("tabindex", "0");
      expect(handle).toHaveAccessibleName(/arrow keys/i);
    }
  });

  it("shows the optimal routes as a table by default", () => {
    const { container } = render(<TspEuclidean />);
    const table = within(container).getByRole("table");

    // The default layout is chosen so the two objectives disagree.
    expect(within(table).getAllByRole("row").length).toBeGreaterThan(2);
    expect(within(table).getByText(/of 24 routes/)).toBeInTheDocument();
  });
});
