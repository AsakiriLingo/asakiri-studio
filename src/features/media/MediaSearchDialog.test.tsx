import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AudioSearchResult, SearchPage } from "@core/media-search";
import { getMessages, I18nProvider } from "@shared/i18n";
import { MediaSearchDialog, type MediaSearchDialogProps } from "@features/media/MediaSearchDialog";

const t = getMessages("en").media;

const AUDIO_RESULT: AudioSearchResult = {
  id: "12345",
  audioUrl: "https://tatoeba.org/audio/12345.mp3",
  text: "Il gatto dorme.",
  lang: "ita",
  attribution: {
    provider: "Tatoeba",
    author: "someone",
    sourceUrl: "https://tatoeba.org/sentences/12345",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
};

const AUDIO_PAGE: SearchPage<AudioSearchResult> = { results: [AUDIO_RESULT], hasMore: false };

function renderDialog(overrides: Partial<MediaSearchDialogProps> = {}) {
  const props: MediaSearchDialogProps = {
    mode: "audio",
    onClose: vi.fn(),
    onSearchImages: vi.fn().mockResolvedValue({ results: [], hasMore: false }),
    onSearchAudio: vi.fn().mockResolvedValue(AUDIO_PAGE),
    onAddRemoteMedia: vi.fn().mockResolvedValue({ status: "saved" }),
    ...overrides,
  };
  render(
    <I18nProvider locale="en">
      <MediaSearchDialog {...props} />
    </I18nProvider>,
  );
  return props;
}

describe("MediaSearchDialog", () => {
  it("adds tatoeba audio with the sentence text preserved in metadata", async () => {
    const props = renderDialog();
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByPlaceholderText(t.searchAudioPlaceholder), {
      target: { value: "gatto" },
    });
    fireEvent.click(screen.getByRole("button", { name: t.searchSubmit }));

    expect(await screen.findByText("Il gatto dorme.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: t.add }));

    await waitFor(() => {
      expect(props.onAddRemoteMedia).toHaveBeenCalledWith(
        "https://tatoeba.org/audio/12345.mp3",
        "tatoeba-ita-12345.mp3",
        expect.objectContaining({
          sourceText: "Il gatto dorme.",
          provider: "Tatoeba",
          license: "CC BY 2.0",
        }),
      );
    });
  });
});
