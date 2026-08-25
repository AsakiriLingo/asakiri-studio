import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@shared/i18n";
import { Select } from "@shared/components/select";

const items = [
  { value: "cat", label: "cat.jpg", leading: <span data-testid="thumb-cat" /> },
  { value: "dog", label: "dog.mp3", leading: <span data-testid="thumb-dog" /> },
  { value: "bird", label: "bird.png" },
];

function SearchableSelectHarness() {
  const [value, setValue] = useState("");
  return (
    <I18nProvider locale="en">
      <Select
        searchable
        aria-label="Choose media"
        items={items}
        value={value}
        onValueChange={setValue}
      />
      <output>{value}</output>
    </I18nProvider>
  );
}

describe("Select", () => {
  it("filters searchable options and selects a match", async () => {
    render(<SearchableSelectHarness />);

    const input = screen.getByRole("combobox", { name: "Choose media" });
    fireEvent.click(screen.getByRole("button", { name: "Choose media" }));
    fireEvent.change(input, { target: { value: "dog" } });

    expect(await screen.findByText("dog.mp3")).toBeInTheDocument();
    expect(screen.queryByText("cat.jpg")).not.toBeInTheDocument();
    expect(screen.getByTestId("thumb-dog")).toBeInTheDocument();

    fireEvent.click(screen.getByText("dog.mp3"));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("dog");
    });
  });
});
