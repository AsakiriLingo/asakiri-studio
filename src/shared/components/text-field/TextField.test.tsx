import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TextField } from "@shared/components/text-field/TextField";

describe("TextField", () => {
  it("associates the label with the control", () => {
    render(<TextField label="Course name" name="course-name" />);

    expect(screen.getByRole("textbox", { name: "Course name" })).toBeVisible();
  });

  it("reports controlled value changes", () => {
    const onValueChange = vi.fn();
    render(<TextField label="Course name" name="course-name" onValueChange={onValueChange} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Course name" }), {
      target: { value: "Japanese Starter" },
    });

    expect(onValueChange).toHaveBeenCalledWith("Japanese Starter", expect.anything());
  });

  it("exposes an error through the field contract", () => {
    render(<TextField error="Enter a valid course name." label="Course name" name="course-name" />);

    expect(screen.getByRole("textbox", { name: "Course name" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByText("Enter a valid course name.")).toBeVisible();
  });
});
