import type { PartContent } from "@core/course";

export type PartKind =
  | "rich-text"
  | "select-image"
  | "multiple-choice"
  | "match-pairs"
  | "fill-blank"
  | "word-order"
  | "listen"
  | "speak";

export function partKind(content: PartContent): PartKind {
  if (content.kind === "tiptap" || content.kind === "composition") {
    return "rich-text";
  }
  switch (content.exercise.type) {
    case "multiple-choice":
      return "multiple-choice";
    case "select-image":
      return "select-image";
    case "match-pairs":
      return "match-pairs";
    case "fill-blank":
      return "fill-blank";
    case "word-order":
      return "word-order";
    case "listening":
      return "listen";
    case "speaking":
      return "speak";
  }
}
