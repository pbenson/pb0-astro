import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import Input from "./Input";

afterEach(cleanup);

describe("Input", () => {
  it("renders with label and value", () => {
    render(<Input label="Name" id="name" value="Pete" onChange={() => {}} />);
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByRole("textbox")).toHaveValue("Pete");
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<Input label="Name" id="name" value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "A" } });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("wraps input in a label element for accessibility", () => {
    render(<Input label="Email" id="email" value="" onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    expect(input.closest("label")).toBeTruthy();
  });

  it("applies custom style", () => {
    render(<Input label="X" id="x" value="" onChange={() => {}} style={{ width: "100px" }} />);
    const input = screen.getByRole("textbox");
    expect(input.style.width).toBe("100px");
  });
});
