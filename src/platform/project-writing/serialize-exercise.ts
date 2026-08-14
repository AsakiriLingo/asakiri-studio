import type {
  Binding,
  BlankAnswer,
  BlankSegment,
  ChoiceOption,
  Evaluation,
  Exercise,
  ExerciseFeedback,
  ExercisePresentation,
  ExerciseSettings,
  NormalizationRules,
  RenderFragment,
} from "@core/course";

type Json = Record<string, unknown>;

function serializeBinding(binding: Binding): Json {
  switch (binding.kind) {
    case "record":
      return { kind: "record", recordId: binding.recordId };
    case "field":
      return { kind: "field", recordId: binding.recordId, fieldId: binding.fieldId };
    case "item":
      return {
        kind: "item",
        recordId: binding.recordId,
        fieldId: binding.fieldId,
        itemId: binding.itemId,
      };
    case "asset":
      return { kind: "asset", assetId: binding.assetId };
    case "literal":
      return { kind: "literal", value: binding.value };
  }
}

function serializeFragment(fragment: RenderFragment): Json {
  return {
    id: fragment.id,
    role: fragment.role,
    binding: serializeBinding(fragment.binding),
  };
}

function serializeFragments(fragments: readonly RenderFragment[]): Json[] {
  return fragments.map(serializeFragment);
}

function serializeChoice(choice: ChoiceOption): Json {
  return { id: choice.id, body: serializeFragments(choice.body) };
}

function serializeChoices(choices: readonly ChoiceOption[]): Json[] {
  return choices.map(serializeChoice);
}

function serializeNormalize(rules: NormalizationRules): Json {
  return {
    ...(rules.ignoreCase !== undefined ? { ignoreCase: rules.ignoreCase } : {}),
    ...(rules.ignoreWhitespace !== undefined ? { ignoreWhitespace: rules.ignoreWhitespace } : {}),
    ...(rules.ignorePunctuation !== undefined
      ? { ignorePunctuation: rules.ignorePunctuation }
      : {}),
    ...(rules.ignoreScript !== undefined ? { ignoreScript: rules.ignoreScript } : {}),
  };
}

function serializeBlank(blank: BlankAnswer): Json {
  return {
    blankId: blank.blankId,
    ...(blank.correctOptionIds !== undefined
      ? { correctOptionIds: [...blank.correctOptionIds] }
      : {}),
    ...(blank.accepted !== undefined
      ? {
          accepted: {
            values: blank.accepted.values.map((value) => ({
              binding: serializeBinding(value.binding),
            })),
            ...(blank.accepted.normalize !== undefined
              ? { normalize: serializeNormalize(blank.accepted.normalize) }
              : {}),
          },
        }
      : {}),
  };
}

function serializeEvaluation(evaluation: Evaluation): Json {
  switch (evaluation.kind) {
    case "selected-options":
      return {
        kind: "selected-options",
        correctOptionIds: [...evaluation.correctOptionIds],
        ...(evaluation.select !== undefined ? { select: evaluation.select } : {}),
      };
    case "ordered-tokens":
      return { kind: "ordered-tokens", correctOrder: [...evaluation.correctOrder] };
    case "matched-pairs":
      return {
        kind: "matched-pairs",
        pairs: evaluation.pairs.map((pair) => ({ leftId: pair.leftId, rightId: pair.rightId })),
      };
    case "filled-blanks":
      return { kind: "filled-blanks", blanks: evaluation.blanks.map(serializeBlank) };
    case "typed-answer":
      return {
        kind: "typed-answer",
        accepted: evaluation.accepted.map((value) => ({
          binding: serializeBinding(value.binding),
        })),
        ...(evaluation.normalize !== undefined
          ? { normalize: serializeNormalize(evaluation.normalize) }
          : {}),
      };
    case "spoken-response":
      return { kind: "spoken-response", strictness: evaluation.strictness };
  }
}

function serializeSettings(settings: ExerciseSettings): Json {
  return {
    ...(settings.slowReplay !== undefined ? { slowReplay: settings.slowReplay } : {}),
    ...(settings.allowSkip !== undefined ? { allowSkip: settings.allowSkip } : {}),
    ...(settings.showRomaji !== undefined ? { showRomaji: settings.showRomaji } : {}),
  };
}

function serializePresentation(presentation: ExercisePresentation): Json {
  return {
    ...(presentation.layout !== undefined ? { layout: presentation.layout } : {}),
  };
}

function serializeFeedback(feedback: ExerciseFeedback): Json {
  return {
    ...(feedback.correct !== undefined ? { correct: serializeFragments(feedback.correct) } : {}),
    ...(feedback.incorrect !== undefined
      ? { incorrect: serializeFragments(feedback.incorrect) }
      : {}),
    ...(feedback.perOption !== undefined
      ? {
          perOption: Object.fromEntries(
            Object.entries(feedback.perOption).map(([key, fragments]) => [
              key,
              serializeFragments(fragments),
            ]),
          ),
        }
      : {}),
  };
}

function serializeSegment(segment: BlankSegment): Json {
  return segment.kind === "text"
    ? { kind: "text", fragment: serializeFragment(segment.fragment) }
    : { kind: "blank", id: segment.id };
}

function serializeBase(exercise: Exercise): Json {
  return {
    id: exercise.id,
    type: exercise.type,
    ...(exercise.instruction !== undefined ? { instruction: exercise.instruction } : {}),
    prompt: serializeFragments(exercise.prompt),
    ...(exercise.settings !== undefined ? { settings: serializeSettings(exercise.settings) } : {}),
    ...(exercise.presentation !== undefined
      ? { presentation: serializePresentation(exercise.presentation) }
      : {}),
    ...(exercise.feedback !== undefined ? { feedback: serializeFeedback(exercise.feedback) } : {}),
    evaluation: serializeEvaluation(exercise.evaluation),
  };
}

export function serializeExercise(exercise: Exercise): Json {
  const base = serializeBase(exercise);
  switch (exercise.type) {
    case "multiple-choice":
    case "select-image":
      return { ...base, options: serializeChoices(exercise.options) };
    case "match-pairs":
      return {
        ...base,
        left: serializeChoices(exercise.left),
        right: serializeChoices(exercise.right),
      };
    case "fill-blank":
      return {
        ...base,
        stem: exercise.stem.map(serializeSegment),
        ...(exercise.bank !== undefined ? { bank: serializeChoices(exercise.bank) } : {}),
        ...(exercise.translation !== undefined
          ? { translation: serializeFragment(exercise.translation) }
          : {}),
      };
    case "word-order":
      return {
        ...base,
        tokens: serializeChoices(exercise.tokens),
        ...(exercise.distractors !== undefined
          ? { distractors: serializeChoices(exercise.distractors) }
          : {}),
      };
    case "listening":
      return {
        ...base,
        stimulus: serializeFragment(exercise.stimulus),
        answerMode: exercise.answerMode,
        ...(exercise.options !== undefined ? { options: serializeChoices(exercise.options) } : {}),
      };
    case "speaking":
      return { ...base, target: serializeFragment(exercise.target) };
  }
}
