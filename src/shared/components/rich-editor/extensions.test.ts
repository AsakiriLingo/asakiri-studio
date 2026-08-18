import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/react";
import { baseExtensions } from "@shared/components/rich-editor/extensions";

function editorWith(content: object): Editor {
  return new Editor({ extensions: baseExtensions, content });
}

describe("rich editor extensions", () => {
  it("renders a youtube node without attributes as a placeholder instead of crashing", () => {
    const editor = editorWith({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "before" }] },
        { type: "youtube" },
        { type: "paragraph", content: [{ type: "text", text: "after" }] },
      ],
    });
    const html = editor.getHTML();
    expect(html).toContain("before");
    expect(html).toContain("after");
    expect(html).toContain("data-missing-src");
    editor.destroy();
  });

  it("keeps the attribute-less youtube node in the document unchanged", () => {
    const editor = editorWith({ type: "doc", content: [{ type: "youtube" }] });
    const json = editor.getJSON();
    expect(json.content[0]?.type).toBe("youtube");
    editor.destroy();
  });

  it("still renders a normal youtube embed as an iframe", () => {
    const editor = editorWith({
      type: "doc",
      content: [{ type: "youtube", attrs: { src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } }],
    });
    expect(editor.getHTML()).toContain("iframe");
    editor.destroy();
  });
});
