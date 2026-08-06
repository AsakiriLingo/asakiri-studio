import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IconButton } from "@shared/components/icon-button/IconButton";

describe("IconButton", () => {
  it("requires an accessible name and preserves native button behavior", () => {
    const onClick = vi.fn();
    const ref = createRef<HTMLElement>();

    render(
      <IconButton
        ref={ref}
        aria-label="Open settings"
        data-testid="settings-button"
        onClick={onClick}
      >
        <span aria-hidden="true">S</span>
      </IconButton>,
    );

    const button = screen.getByRole("button", { name: "Open settings" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("data-testid", "settings-button");
    expect(ref.current).toBe(button);

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("preserves Base UI render composition and consumer classes", () => {
    render(
      <IconButton
        aria-label="Composite action"
        className="consumer-class"
        nativeButton={false}
        render={<div />}
      >
        <span aria-hidden="true">C</span>
      </IconButton>,
    );

    const button = screen.getByRole("button", { name: "Composite action" });
    expect(button.tagName).toBe("DIV");
    expect(button).toHaveClass("consumer-class");
  });
});
