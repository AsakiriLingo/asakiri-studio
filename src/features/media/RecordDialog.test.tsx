import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getMessages, I18nProvider } from "@shared/i18n";
import { RecordDialog, type RecordDialogProps } from "@features/media/RecordDialog";

const t = getMessages("en").media;

function renderDialog(overrides: Partial<RecordDialogProps> = {}) {
  const props: RecordDialogProps = {
    onClose: vi.fn(),
    onAddRecording: vi.fn().mockResolvedValue({ status: "saved" }),
    ...overrides,
  };
  render(
    <I18nProvider locale="en">
      <RecordDialog {...props} />
    </I18nProvider>,
  );
  return props;
}

describe("RecordDialog", () => {
  it("renders as an accessible dialog and closes on Escape", async () => {
    const props = renderDialog();
    const dialog = await screen.findByRole("dialog", { name: t.recordTitle });
    expect(dialog).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => {
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("closes from the cancel button", async () => {
    const props = renderDialog();
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: t.recordCancel }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("reports recording as unsupported when MediaRecorder is missing", async () => {
    renderDialog();
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: t.recordStart }));
    expect(await screen.findByText(t.recordUnsupported)).toBeInTheDocument();
  });
});
