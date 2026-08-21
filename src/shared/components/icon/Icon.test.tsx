import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "@shared/components/icon";

describe("Icon", () => {
  it("renders a currentColor svg sized by the size prop", () => {
    const { container } = render(<Icon aria-hidden="true" name="plus" size={20} />);
    const svg = container.querySelector("svg");

    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("width", "20");
    expect(svg).toHaveAttribute("height", "20");
    expect(svg).toHaveAttribute("fill", "currentColor");
  });

  it("renders the requested icon's geometry", () => {
    const { container } = render(<Icon name="plus" />);

    expect(container.querySelectorAll("path").length).toBeGreaterThan(0);
  });

  it("forwards aria attributes to the svg", () => {
    const { container } = render(<Icon aria-hidden="true" name="moon" />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
