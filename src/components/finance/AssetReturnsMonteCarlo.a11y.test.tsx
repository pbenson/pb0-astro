import { describe, it, expect } from "vitest";
import { render, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import AssetReturnsMonteCarlo from "./AssetReturnsMonteCarlo";

// Queries are scoped to each render's container: the suite has no auto-cleanup,
// so document-wide queries would also match earlier tests' output.

describe("AssetReturnsMonteCarlo accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(<AssetReturnsMonteCarlo />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("labels each histogram with its asset and risk statistics", () => {
    const { container } = render(<AssetReturnsMonteCarlo />);
    const charts = within(container).getAllByRole("img", { name: /^Histogram/ });

    expect(charts).toHaveLength(3);
    expect(charts[0]).toHaveAccessibleName(/Apple/);
    expect(charts[0]).toHaveAccessibleName(/value at risk/i);
    expect(charts[1]).toHaveAccessibleName(/3M/);
    expect(charts[2]).toHaveAccessibleName(/JPMorgan/);
  });

  it("describes every correlation pair in the correlogram label", () => {
    const { container } = render(<AssetReturnsMonteCarlo />);
    const matrix = within(container).getByRole("img", { name: /^Correlation matrix/ });

    // Three assets means three unordered pairs, each with both values stated.
    expect(matrix).toHaveAccessibleName(/AAPL and MMM/);
    expect(matrix).toHaveAccessibleName(/AAPL and JPM/);
    expect(matrix).toHaveAccessibleName(/MMM and JPM/);
    expect(matrix).toHaveAccessibleName(/simulated -?\d\.\d\d, historical -?\d\.\d\d/);
  });
});
