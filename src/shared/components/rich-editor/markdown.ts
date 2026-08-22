import { generateJSON, type JSONContent } from "@tiptap/react";
import { marked } from "marked";
import { baseExtensions } from "@shared/components/rich-editor/extensions";

export function markdownToTiptap(markdown: string): JSONContent {
  const source = typeof markdown === "string" ? markdown : "";
  const html = marked.parse(source, { async: false, gfm: true, breaks: false });
  return generateJSON(html, baseExtensions);
}

function splitMarkdownBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;
  const flush = () => {
    if (current.length > 0) {
      blocks.push(current.join("\n"));
      current = [];
    }
  };
  for (const line of markdown.split("\n")) {
    const trimmed = line.trimStart();
    if (fence !== null) {
      current.push(line);
      if (trimmed.startsWith(fence)) fence = null;
      continue;
    }
    const opening = /^(```|~~~)/.exec(trimmed);
    if (opening) {
      fence = opening[1] ?? null;
      current.push(line);
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    current.push(line);
  }
  flush();
  return blocks;
}

const CHUNK_BLOCKS = 150;

export async function markdownToTiptapChunked(
  markdown: string,
  onProgress?: (fraction: number) => void,
): Promise<JSONContent> {
  const source = typeof markdown === "string" ? markdown : "";
  const blocks = splitMarkdownBlocks(source);
  if (blocks.length === 0) {
    onProgress?.(1);
    return { type: "doc", content: [] };
  }

  const content: JSONContent[] = [];
  for (let index = 0; index < blocks.length; index += CHUNK_BLOCKS) {
    const slice = blocks.slice(index, index + CHUNK_BLOCKS).join("\n\n");
    const html = marked.parse(slice, { async: false, gfm: true, breaks: false });
    const doc = generateJSON(html, baseExtensions) as JSONContent;
    if (Array.isArray(doc.content)) content.push(...doc.content);
    onProgress?.(Math.min(1, (index + CHUNK_BLOCKS) / blocks.length));
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }
  return { type: "doc", content };
}
