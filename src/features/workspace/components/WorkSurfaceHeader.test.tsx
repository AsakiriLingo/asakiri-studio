import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkSurfaceHeader } from "@features/workspace/components/WorkSurfaceHeader";

describe("WorkSurfaceHeader", () => {
  it("renders the title as a heading with the provided id", () => {
    render(<WorkSurfaceHeader title="Content" titleId="workspace-area-title" />);

    const heading = screen.getByRole("heading", { name: "Content" });

    expect(heading).toBeVisible();
    expect(heading).toHaveAttribute("id", "workspace-area-title");
  });

  it("renders provided actions", () => {
    render(
      <WorkSurfaceHeader title="Content" actions={<button type="button">New content</button>} />,
    );

    expect(screen.getByRole("button", { name: "New content" })).toBeVisible();
  });

  it("renders no actions by default", () => {
    render(<WorkSurfaceHeader title="Content" />);

    expect(screen.queryByRole("button")).toBeNull();
  });
});
