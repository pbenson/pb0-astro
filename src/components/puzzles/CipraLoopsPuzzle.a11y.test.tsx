import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import CipraLoopsPuzzle from "./CipraLoopsPuzzle";

describe("CipraLoopsPuzzle accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(<CipraLoopsPuzzle />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
