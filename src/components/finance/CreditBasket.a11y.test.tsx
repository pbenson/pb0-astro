import { describe, it, expect } from "vitest";
import { render, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import CreditBasket from "./CreditBasket";

// Queries are scoped to each render's container: the suite has no auto-cleanup,
// so document-wide queries would also match earlier tests' output.

describe("CreditBasket accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(<CreditBasket />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("exposes every control as a named slider carrying its current value", () => {
    // Queried by role rather than label text: range inputs have an implicit
    // slider role, and asserting on it also pins the accessible name.
    const { container } = render(<CreditBasket />);
    const sliders = within(container).getAllByRole("slider");

    expect(sliders).toHaveLength(3);
    expect(sliders[0]).toHaveAccessibleName(/Names in the basket/);
    expect(sliders[0]).toHaveValue("10");
    expect(sliders[1]).toHaveAccessibleName(/Default probability/);
    expect(sliders[2]).toHaveAccessibleName(/Asset correlation/);
    for (const slider of sliders) {
      expect(slider).toHaveAttribute("type", "range");
    }
  });

  it("describes the distribution in the chart label", () => {
    const { container } = render(<CreditBasket />);
    const chart = within(container).getByRole("img", { name: /^Distribution of the number/ });

    expect(chart).toHaveAccessibleName(/basket of 10 names/);
    expect(chart).toHaveAccessibleName(/probability 50.0%/);
    expect(chart).toHaveAccessibleName(/correlation 50.0%/);
    // The default landing state is the article's result.
    expect(chart).toHaveAccessibleName(/the distribution is flat/i);
  });

  it("renders one bar per possible outcome", () => {
    const { container } = render(<CreditBasket />);
    // n = 10 names admits 0..10 defaults, so eleven bars.
    expect(container.querySelectorAll("svg rect")).toHaveLength(11);
  });
});
