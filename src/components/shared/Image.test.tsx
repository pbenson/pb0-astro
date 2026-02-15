import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Image from "./Image";

describe("Image", () => {
  afterEach(cleanup);

  it("renders a single img with src and alt when no darkSrc", () => {
    render(<Image src="/light.png" alt="test image" width={200} />);
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute("src", "/light.png");
    expect(imgs[0]).toHaveAttribute("alt", "test image");
  });

  it("renders two img elements when darkSrc is provided", () => {
    render(<Image src="/light.png" darkSrc="/dark.png" alt="themed" width={200} />);
    const imgs = screen.getAllByAltText("themed");
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toHaveAttribute("src", "/light.png");
    expect(imgs[0]).toHaveClass("light-mode-img");
    expect(imgs[1]).toHaveAttribute("src", "/dark.png");
    expect(imgs[1]).toHaveClass("dark-mode-img");
  });

  it("applies width and height to all images", () => {
    render(<Image src="/light.png" darkSrc="/dark.png" alt="sized" width={300} height={200} />);
    const imgs = screen.getAllByAltText("sized");
    for (const img of imgs) {
      expect(img).toHaveAttribute("width", "300");
      expect(img).toHaveAttribute("height", "200");
    }
  });

  it("renders only one img when darkSrc is not provided", () => {
    render(<Image src="/only.png" alt="no dark" width={100} />);
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute("src", "/only.png");
  });

  it("includes a style element with dark mode CSS when darkSrc is provided", () => {
    const { container } = render(<Image src="/light.png" darkSrc="/dark.png" alt="styled" />);
    const style = container.querySelector("style");
    expect(style).not.toBeNull();
    expect(style!.textContent).toContain("dark-mode-img");
    expect(style!.textContent).toContain("light-mode-img");
  });
});
