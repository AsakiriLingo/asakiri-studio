import { describe, expect, it, vi } from "vitest";
import { markdownToTiptap, markdownToTiptapChunked } from "@shared/components/rich-editor/markdown";

describe("markdownToTiptap", () => {
  it("converts headings and paragraphs into matching tiptap nodes", () => {
    const doc = markdownToTiptap("# Title\n\nA paragraph.");

    expect(doc.type).toBe("doc");
    const types = (doc.content ?? []).map((node) => node.type);
    expect(types).toContain("heading");
    expect(types).toContain("paragraph");
  });

  it("converts lists", () => {
    const doc = markdownToTiptap("- one\n- two");
    const types = (doc.content ?? []).map((node) => node.type);
    expect(types).toContain("bulletList");
  });

  it("returns an empty doc for empty input", () => {
    const doc = markdownToTiptap("");
    expect(doc.type).toBe("doc");
  });
});

describe("markdownToTiptapChunked", () => {
  it("converts a multi-block document and reports progress up to 1", async () => {
    const blocks = Array.from({ length: 400 }, (_, i) => `Paragraph number ${String(i)}.`);
    const onProgress = vi.fn((fraction: number) => {
      void fraction;
    });
    const doc = await markdownToTiptapChunked(blocks.join("\n\n"), onProgress);

    expect(doc.type).toBe("doc");
    expect((doc.content ?? []).length).toBe(400);
    expect((doc.content ?? []).every((node) => node.type === "paragraph")).toBe(true);
    expect(onProgress).toHaveBeenCalled();
    const calls = onProgress.mock.calls;
    expect(calls[calls.length - 1]?.[0]).toBe(1);
  });

  it("keeps a fenced code block intact across its blank lines", async () => {
    const doc = await markdownToTiptapChunked("```\nline one\n\nline two\n```");
    expect((doc.content ?? [])[0]?.type).toBe("codeBlock");
  });
});
