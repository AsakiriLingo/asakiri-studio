import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@shared/i18n";
import { ConfirmProvider } from "@shared/components/confirm-dialog/ConfirmProvider";
import { useConfirm } from "@shared/components/confirm-dialog/useConfirm";

function Harness() {
  const confirm = useConfirm();
  const [result, setResult] = useState<string>("pending");
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void confirm({
            title: "Delete this record?",
            description: "This cannot be undone.",
          }).then((ok) => {
            setResult(ok ? "confirmed" : "cancelled");
          });
        }}
      >
        Trigger
      </button>
      <output>{result}</output>
    </div>
  );
}

function renderHarness() {
  return render(
    <I18nProvider locale="en">
      <ConfirmProvider>
        <Harness />
      </ConfirmProvider>
    </I18nProvider>,
  );
}

describe("ConfirmProvider / useConfirm", () => {
  it("shows the dialog and resolves true when confirmed", async () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Trigger" }));
    expect(await screen.findByText("Delete this record?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("confirmed");
    });
  });

  it("resolves false when cancelled", async () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Trigger" }));
    await screen.findByText("Delete this record?");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("cancelled");
    });
  });
});
