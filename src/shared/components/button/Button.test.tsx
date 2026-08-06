import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@shared/components/button/Button";

describe("Button", () => {
  it("uses safe native button defaults and forwards its ref", () => {
    const ref = createRef<HTMLElement>();

    render(<Button ref={ref}>Continue</Button>);

    const button = screen.getByRole("button", { name: "Continue" });
    expect(button).toHaveAttribute("type", "button");
    expect(ref.current).toBe(button);
  });

  it("preserves disabled behavior supplied by Base UI", () => {
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        Continue
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("supports Base UI render composition", () => {
    render(
      <Button nativeButton={false} render={<div />}>
        Composite action
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Composite action" }).tagName).toBe("DIV");
  });
});
