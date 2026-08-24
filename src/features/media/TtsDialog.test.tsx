import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CatalogVoice, TtsVoice } from "@core/tts";
import { getMessages, I18nProvider } from "@shared/i18n";
import { TtsDialog, type TtsDialogProps } from "@features/media/TtsDialog";

const t = getMessages("en").media;

const VOICES: readonly TtsVoice[] = [{ name: "en_US-amy-low", locale: "en_US" }];

const CATALOG: readonly CatalogVoice[] = [
  {
    id: "en_US-amy-low",
    name: "amy",
    quality: "low",
    languageCode: "en_US",
    languageEnglish: "English",
    languageNative: "English",
    region: "US",
    country: "United States",
    sizeBytes: 20_000_000,
    sampleUrl: "",
    installed: true,
  },
  {
    id: "ja_JP-haru-medium",
    name: "haru",
    quality: "medium",
    languageCode: "ja_JP",
    languageEnglish: "Japanese",
    languageNative: "日本語",
    region: "JP",
    country: "Japan",
    sizeBytes: 60_000_000,
    sampleUrl: "",
    installed: false,
  },
];

function renderDialog(overrides: Partial<TtsDialogProps> = {}) {
  const props: TtsDialogProps = {
    onClose: vi.fn(),
    defaultVoice: "",
    onDefaultVoiceChange: vi.fn(),
    onListVoices: vi.fn().mockResolvedValue(VOICES),
    onPreviewVoice: vi.fn().mockResolvedValue("data:audio/wav;base64,abc"),
    onListAvailableVoices: vi.fn().mockResolvedValue(CATALOG),
    onDownloadVoice: vi.fn().mockResolvedValue(true),
    onRemoveVoice: vi.fn().mockResolvedValue(true),
    onAddTtsAudio: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
  render(
    <I18nProvider locale="en">
      <TtsDialog {...props} />
    </I18nProvider>,
  );
  return props;
}

describe("TtsDialog", () => {
  it("renders as an accessible dialog and closes on Escape", async () => {
    const props = renderDialog();
    const dialog = await screen.findByRole("dialog", { name: t.ttsTitle });
    expect(dialog).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => {
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("saves the entered text with the selected voice", async () => {
    const props = renderDialog();
    await screen.findByRole("dialog");
    fireEvent.change(await screen.findByPlaceholderText(t.ttsTextPlaceholder), {
      target: { value: "  hello world  " },
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: t.ttsSave })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: t.ttsSave }));

    await waitFor(() => {
      expect(props.onAddTtsAudio).toHaveBeenCalledWith(
        "hello world",
        "en_US-amy-low",
        "hello-world.wav",
      );
    });
    await waitFor(() => {
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("pre-selects the remembered default voice", async () => {
    const props = renderDialog({
      onListVoices: vi.fn().mockResolvedValue([
        { name: "en_US-amy-low", locale: "en_US" },
        { name: "en_GB-alan-low", locale: "en_GB" },
      ] satisfies TtsVoice[]),
      defaultVoice: "en_GB-alan-low",
    });
    await screen.findByRole("dialog");
    fireEvent.change(await screen.findByPlaceholderText(t.ttsTextPlaceholder), {
      target: { value: "hi" },
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: t.ttsSave })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: t.ttsSave }));

    await waitFor(() => {
      expect(props.onAddTtsAudio).toHaveBeenCalledWith("hi", "en_GB-alan-low", "hi.wav");
    });
  });

  it("remembers the voice used after a successful save", async () => {
    const props = renderDialog();
    await screen.findByRole("dialog");
    fireEvent.change(await screen.findByPlaceholderText(t.ttsTextPlaceholder), {
      target: { value: "hi" },
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: t.ttsSave })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: t.ttsSave }));

    await waitFor(() => {
      expect(props.onDefaultVoiceChange).toHaveBeenCalledWith("en_US-amy-low");
    });
  });

  it("shows the error when saving fails", async () => {
    const props = renderDialog({
      onAddTtsAudio: vi.fn().mockResolvedValue({ ok: false, error: "engine exploded" }),
    });
    await screen.findByRole("dialog");
    fireEvent.change(await screen.findByPlaceholderText(t.ttsTextPlaceholder), {
      target: { value: "hi" },
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: t.ttsSave })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: t.ttsSave }));

    expect(await screen.findByText("engine exploded")).toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("offers voice management when no voices are installed", async () => {
    renderDialog({ onListVoices: vi.fn().mockResolvedValue([]) });
    await screen.findByRole("dialog");

    expect(await screen.findByText(t.ttsNoVoices)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: t.ttsAddVoice }));

    expect(await screen.findByText(t.ttsManageHint)).toBeInTheDocument();
  });

  it("downloads and removes voices in manage mode", async () => {
    const props = renderDialog();
    await screen.findByRole("dialog");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: t.ttsManageVoices })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: t.ttsManageVoices }));
    expect(await screen.findByText(/Japanese/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: t.ttsDownload }));
    await waitFor(() => {
      expect(props.onDownloadVoice).toHaveBeenCalledWith("ja_JP-haru-medium", expect.any(Function));
    });

    fireEvent.click(screen.getByRole("button", { name: t.ttsRemove }));
    await waitFor(() => {
      expect(props.onRemoveVoice).toHaveBeenCalledWith("en_US-amy-low");
    });

    fireEvent.click(screen.getByRole("button", { name: getMessages("en").common.done }));
    expect(await screen.findByText(t.ttsDescription)).toBeInTheDocument();
  });
});
