import type { Binding, RenderFragment } from "@core/course/binding";
import type { Exercise, ExerciseType } from "@core/course/exercise";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function literalText(text: string): Binding {
  return { kind: "literal", value: { type: "text", text } };
}

function fragment(role: string, prefix: string, text = ""): RenderFragment {
  return { id: newId(prefix), role, binding: literalText(text) };
}

export function createDefaultExercise(type: ExerciseType): Exercise {
  const id = newId("exercise");
  const prompt = [fragment("primary", "prompt")];
  switch (type) {
    case "multiple-choice":
      return {
        id,
        type,
        prompt,
        options: [],
        evaluation: { kind: "selected-options", select: "one", correctOptionIds: [] },
      };
    case "select-image":
      return {
        id,
        type,
        prompt,
        options: [],
        presentation: { layout: "image-grid" },
        evaluation: { kind: "selected-options", select: "one", correctOptionIds: [] },
      };
    case "match-pairs":
      return {
        id,
        type,
        prompt,
        left: [],
        right: [],
        evaluation: { kind: "matched-pairs", pairs: [] },
      };
    case "fill-blank":
      return {
        id,
        type,
        prompt,
        stem: [],
        evaluation: { kind: "filled-blanks", blanks: [] },
      };
    case "word-order":
      return {
        id,
        type,
        prompt,
        tokens: [],
        evaluation: { kind: "ordered-tokens", correctOrder: [] },
      };
    case "listening":
      return {
        id,
        type,
        prompt,
        stimulus: fragment("audio", "stimulus"),
        answerMode: "select",
        options: [],
        evaluation: { kind: "selected-options", select: "one", correctOptionIds: [] },
      };
    case "speaking":
      return {
        id,
        type,
        prompt,
        target: fragment("primary", "target"),
        evaluation: { kind: "spoken-response", strictness: "standard" },
      };
  }
}
