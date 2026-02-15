import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

let mockDark = false;
const mockListeners: ((isDark: boolean) => void)[] = [];

vi.mock("../../utils/darkMode", () => ({
  inDarkMode: () => mockDark,
  onDarkModeChange: (cb: (isDark: boolean) => void) => {
    mockListeners.push(cb);
    return () => { mockListeners.splice(mockListeners.indexOf(cb), 1); };
  },
}));

import Image from "./Image";

describe("Image", () => {
  beforeEach(() => {
    mockDark = false;
    mockListeners.length = 0;
  });

  afterEach(cleanup);

  it("renders with src and alt", () => {
    render(<Image src="/light.png" alt="test image" width={200} />);
    const img = screen.getByAltText("test image");
    expect(img).toHaveAttribute("src", "/light.png");
  });

  it("uses light src when not in dark mode", () => {
    render(<Image src="/light.png" darkSrc="/dark.png" alt="themed" width={200} />);
    expect(screen.getByAltText("themed")).toHaveAttribute("src", "/light.png");
  });

  it("uses dark src when in dark mode", () => {
    mockDark = true;
    render(<Image src="/light.png" darkSrc="/dark.png" alt="themed" width={200} />);
    expect(screen.getByAltText("themed")).toHaveAttribute("src", "/dark.png");
  });

  it("applies width and height", () => {
    render(<Image src="/img.png" alt="sized" width={300} height={200} />);
    const img = screen.getByAltText("sized");
    expect(img).toHaveAttribute("width", "300");
    expect(img).toHaveAttribute("height", "200");
  });

  it("falls back to src when darkSrc is not provided in dark mode", () => {
    mockDark = true;
    render(<Image src="/only.png" alt="no dark" width={100} />);
    expect(screen.getByAltText("no dark")).toHaveAttribute("src", "/only.png");
  });
});
