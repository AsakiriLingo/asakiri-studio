export type PartKind =
  | "rich-text"
  | "select-image"
  | "multiple-choice"
  | "match-pairs"
  | "fill-blank"
  | "word-order"
  | "listen"
  | "speak";

export interface LessonPart {
  readonly id: string;
  readonly name: string;
  readonly outlineDetail: string;
  readonly headingDetail: string;
  readonly kind: PartKind;
}

export const LESSON_PARTS: readonly LessonPart[] = [
  {
    id: "introduction",
    name: "Introduction",
    outlineDetail: "Rich text",
    headingDetail: "Rich text part",
    kind: "rich-text",
  },
  {
    id: "new-words",
    name: "New words",
    outlineDetail: "Select image",
    headingDetail: "Select the image part",
    kind: "select-image",
  },
  {
    id: "multiple-choice",
    name: "Multiple choice",
    outlineDetail: "Multiple choice",
    headingDetail: "Multiple choice part",
    kind: "multiple-choice",
  },
  {
    id: "match-words",
    name: "Match the words",
    outlineDetail: "Match pairs",
    headingDetail: "Match pairs part",
    kind: "match-pairs",
  },
  {
    id: "fill-blank",
    name: "Fill in the blank",
    outlineDetail: "Fill blank",
    headingDetail: "Fill blank part",
    kind: "fill-blank",
  },
  {
    id: "build-sentence",
    name: "Build the sentence",
    outlineDetail: "Word order",
    headingDetail: "Word order part",
    kind: "word-order",
  },
  {
    id: "listening",
    name: "Listening",
    outlineDetail: "Listen & tap",
    headingDetail: "Listen & tap part",
    kind: "listen",
  },
  {
    id: "speaking",
    name: "Speaking",
    outlineDetail: "Speak aloud",
    headingDetail: "Speak aloud part",
    kind: "speak",
  },
];
