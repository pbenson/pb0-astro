import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import Slider from "./Slider";

describe("Slider accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(
      <Slider label="Speed" sliderMin={1} sliderMax={10} initialValue={5} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
