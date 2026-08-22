import { describe, it, expect } from "vitest";
import { render, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import AssetReturnsMonteCarlo from "./AssetReturnsMonteCarlo";

describe("AssetReturnsMonteCarlo accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(<AssetReturnsMonteCarlo />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("labels each histogram with its asset and risk statistics", () => {
    // Queries are scoped to this render: the suite has no auto-cleanup, so
    // documentwide queries would also match earlier tests' output.
    const { container } = render(<AssetReturnsMonteCarlo />);
    const charts = within(container).getAllByRole("img");

    expect(charts).toHaveLength(3);
    expect(charts[0]).toHaveAccessibleName(/Apple/);
    expect(charts[0]).toHaveAccessibleName(/value at risk/i);
    expect(charts[1]).toHaveAccessibleName(/3M/);
    expect(charts[2]).toHaveAccessibleName(/JPMorgan/);
  });
});
