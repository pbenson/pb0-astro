import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import Button from "./Button";

describe("Button accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(
      <Button label="Click me" onClick={() => {}} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations with secondary variant", async () => {
    const { container } = render(
      <Button label="Cancel" onClick={() => {}} variant="secondary" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
