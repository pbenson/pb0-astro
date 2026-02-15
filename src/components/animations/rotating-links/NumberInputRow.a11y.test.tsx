import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import NumberInputRow from "./NumberInputRow";

describe("NumberInputRow accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(
      <NumberInputRow label="Radii" values={[3, 5, 2]} onChange={() => {}} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
