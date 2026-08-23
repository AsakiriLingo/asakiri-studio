import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@shared/i18n";
import { SlashMenu } from "@shared/components/rich-editor/SlashMenu";
import type { RichEditorLibrary } from "@shared/components/rich-editor/library";
import type { SlashState } from "@shared/components/rich-editor/slash-command";

const state: SlashState = {
  query: "",
  range: { from: 0, to: 1 },
  rect: { left: 0, bottom: 0 } as DOMRect,
};

const CAFFE_SRC = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

const library: RichEditorLibrary = {
  assets: [
    { id: "a1", kind: "image", label: "il caffè photo", file: CAFFE_SRC },
    { id: "a2", kind: "image", label: "il pane photo", file: null },
  ],
  collections: [{ id: "c1", name: "Vocabulary", fields: [] }],
  records: [],
};

function renderMenu() {
  return render(
    <I18nProvider locale="en">
      <SlashMenu
        state={state}
        library={library}
        onClose={() => undefined}
        onInsertAsset={() => undefined}
        onInsertRecord={() => undefined}
      />
    </I18nProvider>,
  );
}

describe("SlashMenu", () => {
  it("shows a search field and collections but no media until a search is entered", () => {
    renderMenu();

    expect(screen.getByLabelText("Search media and collections")).toBeInTheDocument();
    expect(screen.getByText("Vocabulary")).toBeInTheDocument();
    expect(screen.queryByText("il caffè photo")).not.toBeInTheDocument();
    expect(screen.queryByText("il pane photo")).not.toBeInTheDocument();
  });

  it("reveals matching media once the search narrows", () => {
    renderMenu();

    fireEvent.change(screen.getByLabelText("Search media and collections"), {
      target: { value: "caffè" },
    });

    expect(screen.getByText("il caffè photo")).toBeInTheDocument();
    expect(screen.queryByText("il pane photo")).not.toBeInTheDocument();
    expect(screen.queryByText("Vocabulary")).not.toBeInTheDocument();
  });

  it("renders an image thumbnail for image assets with a preview", () => {
    renderMenu();

    fireEvent.change(screen.getByLabelText("Search media and collections"), {
      target: { value: "caffè" },
    });

    expect(document.querySelector(`img[src="${CAFFE_SRC}"]`)).not.toBeNull();
  });

  it("shows the empty message when nothing matches the search", () => {
    renderMenu();

    fireEvent.change(screen.getByLabelText("Search media and collections"), {
      target: { value: "zzz" },
    });

    expect(screen.getByText("No matches")).toBeInTheDocument();
  });
});
