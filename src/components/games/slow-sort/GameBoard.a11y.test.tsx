import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import GameBoard from "./GameBoard";

describe("GameBoard accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(
      <GameBoard configuration="3 1 2" resetTrigger={0} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
