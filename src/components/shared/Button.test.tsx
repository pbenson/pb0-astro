import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import Button from "./Button";

afterEach(cleanup);

describe("Button", () => {
  it("renders with label text", () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Click me" })).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Button label="Submit" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("defaults to primary variant styling", () => {
    render(<Button label="Primary" onClick={() => {}} />);
    const btn = screen.getByRole("button", { name: "Primary" });
    expect(btn.style.background).toContain("var(--ink");
  });

  it("applies secondary variant styling", () => {
    render(<Button label="Cancel" onClick={() => {}} variant="secondary" />);
    const btn = screen.getByRole("button", { name: "Cancel" });
    expect(btn.style.background).toBe("transparent");
  });
});
