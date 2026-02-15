import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import Slider from "./Slider";

afterEach(cleanup);

describe("Slider", () => {
  it("renders with label and initial value", () => {
    render(<Slider label="Speed" sliderMin={1} sliderMax={10} initialValue={5} />);
    expect(screen.getByText("Speed")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByRole("slider")).toHaveValue("5");
  });

  it("renders with correct min/max attributes", () => {
    render(<Slider label="Size" sliderMin={0} sliderMax={100} initialValue={50} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "100");
  });

  it("calls onChange when value changes", () => {
    const onChange = vi.fn();
    render(<Slider label="Speed" sliderMin={1} sliderMax={10} initialValue={5} onChange={onChange} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "8" } });
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it("updates displayed value on change", () => {
    render(<Slider label="Speed" sliderMin={1} sliderMax={10} initialValue={5} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "3" } });
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("uses custom step size", () => {
    render(<Slider label="Zoom" sliderMin={0} sliderMax={10} initialValue={0} stepSize={2} />);
    expect(screen.getByRole("slider")).toHaveAttribute("step", "2");
  });

  it("defaults step to 1", () => {
    render(<Slider label="Zoom" sliderMin={0} sliderMax={10} initialValue={0} />);
    expect(screen.getByRole("slider")).toHaveAttribute("step", "1");
  });
});
