import { describe, expect, it } from "vitest";
import {
  createDefaultExercise,
  parseExercise,
  type Exercise,
  type ExerciseType,
} from "@core/course";
import { serializeExercise } from "@platform/project-writing/serialize-exercise";

function roundTrip(exercise: Exercise): Exercise {
  const onDisk: unknown = JSON.parse(JSON.stringify(serializeExercise(exercise)));
  return parseExercise(onDisk, "test");
}

const ALL_TYPES: readonly ExerciseType[] = [
  "multiple-choice",
  "select-image",
  "match-pairs",
  "fill-blank",
  "word-order",
  "listening",
  "speaking",
];

describe("serializeExercise", () => {
  it("round-trips every default exercise through the parser", () => {
    for (const type of ALL_TYPES) {
      const exercise = createDefaultExercise(type);
      expect(roundTrip(exercise)).toEqual(exercise);
    }
  });

  it("round-trips a fully populated multiple-choice exercise", () => {
    const exercise: Exercise = {
      id: "ex_mc",
      type: "multiple-choice",
      instruction: "Pick one.",
      prompt: [
        {
          id: "p1",
          role: "primary",
          binding: { kind: "field", recordId: "rec_cat", fieldId: "field_ja" },
        },
      ],
      options: [
        {
          id: "opt_cat",
          body: [{ id: "f1", role: "primary", binding: { kind: "record", recordId: "rec_cat" } }],
        },
        {
          id: "opt_dog",
          body: [{ id: "f2", role: "primary", binding: { kind: "asset", assetId: "asset_dog" } }],
        },
      ],
      settings: { slowReplay: true, allowSkip: false },
      presentation: { layout: "list" },
      feedback: {
        correct: [
          {
            id: "fb1",
            role: "primary",
            binding: { kind: "literal", value: { type: "text", text: "Nice." } },
          },
        ],
        perOption: {
          opt_dog: [
            {
              id: "fb2",
              role: "primary",
              binding: { kind: "literal", value: { type: "text", text: "That's a dog." } },
            },
          ],
        },
      },
      evaluation: { kind: "selected-options", select: "one", correctOptionIds: ["opt_cat"] },
    };
    expect(roundTrip(exercise)).toEqual(exercise);
  });

  it("round-trips a fill-blank exercise with stem, bank, and accepted answers", () => {
    const exercise: Exercise = {
      id: "ex_fb",
      type: "fill-blank",
      prompt: [],
      stem: [
        {
          kind: "text",
          fragment: {
            id: "seg1",
            role: "primary",
            binding: { kind: "literal", value: { type: "text", text: "これは" } },
          },
        },
        { kind: "blank", id: "blank_1" },
      ],
      bank: [
        {
          id: "bank_cat",
          body: [
            {
              id: "b1",
              role: "primary",
              binding: { kind: "field", recordId: "rec_cat", fieldId: "ja" },
            },
          ],
        },
      ],
      translation: {
        id: "tr",
        role: "primary",
        binding: { kind: "literal", value: { type: "text", text: "This is a cat." } },
      },
      evaluation: {
        kind: "filled-blanks",
        blanks: [
          {
            blankId: "blank_1",
            correctOptionIds: ["bank_cat"],
            accepted: {
              values: [
                { binding: { kind: "item", recordId: "rec_cat", fieldId: "forms", itemId: "i1" } },
              ],
              normalize: { ignoreCase: true, ignoreWhitespace: true },
            },
          },
        ],
      },
    };
    expect(roundTrip(exercise)).toEqual(exercise);
  });

  it("round-trips a word-order exercise with tokens and distractors", () => {
    const exercise: Exercise = {
      id: "ex_wo",
      type: "word-order",
      prompt: [
        {
          id: "p1",
          role: "primary",
          binding: { kind: "literal", value: { type: "text", text: "Build the sentence." } },
        },
      ],
      tokens: [
        {
          id: "tok_a",
          body: [
            {
              id: "t1",
              role: "primary",
              binding: { kind: "literal", value: { type: "text", text: "これ" } },
            },
          ],
        },
        {
          id: "tok_b",
          body: [
            {
              id: "t2",
              role: "primary",
              binding: { kind: "field", recordId: "rec_cat", fieldId: "ja" },
            },
          ],
        },
      ],
      distractors: [
        {
          id: "dis_a",
          body: [
            {
              id: "d1",
              role: "primary",
              binding: { kind: "literal", value: { type: "text", text: "犬" } },
            },
          ],
        },
      ],
      evaluation: { kind: "ordered-tokens", correctOrder: ["tok_a", "tok_b"] },
    };
    expect(roundTrip(exercise)).toEqual(exercise);
  });

  it("round-trips a listening exercise with a typed answer", () => {
    const exercise: Exercise = {
      id: "ex_listen",
      type: "listening",
      prompt: [],
      stimulus: { id: "st", role: "audio", binding: { kind: "asset", assetId: "asset_audio" } },
      answerMode: "type",
      evaluation: {
        kind: "typed-answer",
        accepted: [{ binding: { kind: "literal", value: { type: "text", text: "neko" } } }],
        normalize: { ignorePunctuation: true },
      },
    };
    expect(roundTrip(exercise)).toEqual(exercise);
  });
});
