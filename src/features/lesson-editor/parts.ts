import type { ExerciseType, PartContent } from "@core/course";

export type PartKind =
  | "rich-text"
  | "select-image"
  | "multiple-choice"
  | "match-pairs"
  | "fill-blank"
  | "word-order"
  | "listen"
  | "speak";

export const PART_KINDS: readonly PartKind[] = [
  "rich-text",
  "multiple-choice",
  "select-image",
  "match-pairs",
  "fill-blank",
  "word-order",
  "listen",
  "speak",
];

const EXERCISE_TYPE_BY_KIND: Record<Exclude<PartKind, "rich-text">, ExerciseType> = {
  "multiple-choice": "multiple-choice",
  "select-image": "select-image",
  "match-pairs": "match-pairs",
  "fill-blank": "fill-blank",
  "word-order": "word-order",
  listen: "listening",
  speak: "speaking",
};

export function exerciseTypeForKind(kind: Exclude<PartKind, "rich-text">): ExerciseType {
  return EXERCISE_TYPE_BY_KIND[kind];
}

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
