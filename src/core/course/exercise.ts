import type { AcceptedValue, RenderFragment } from "@core/course/binding";

export type ExerciseType =
  | "multiple-choice"
  | "select-image"
  | "match-pairs"
  | "fill-blank"
  | "word-order"
  | "listening"
  | "speaking";

export interface ChoiceOption {
  readonly id: string;
  readonly body: readonly RenderFragment[];
}

export interface NormalizationRules {
  readonly ignoreCase?: boolean;
  readonly ignoreWhitespace?: boolean;
  readonly ignorePunctuation?: boolean;
  readonly ignoreScript?: boolean;
}

export interface BlankAnswer {
  readonly blankId: string;
  readonly correctOptionIds?: readonly string[];
  readonly accepted?: {
    readonly values: readonly AcceptedValue[];
    readonly normalize?: NormalizationRules;
  };
}

export interface SelectedOptionsEvaluation {
  readonly kind: "selected-options";
  readonly select?: "one" | "many";
  readonly correctOptionIds: readonly string[];
}

export interface OrderedTokensEvaluation {
  readonly kind: "ordered-tokens";
  readonly correctOrder: readonly string[];
}

export interface MatchedPairsEvaluation {
  readonly kind: "matched-pairs";
  readonly pairs: readonly { readonly leftId: string; readonly rightId: string }[];
}

export interface FilledBlanksEvaluation {
  readonly kind: "filled-blanks";
  readonly blanks: readonly BlankAnswer[];
}

export interface TypedAnswerEvaluation {
  readonly kind: "typed-answer";
  readonly accepted: readonly AcceptedValue[];
  readonly normalize?: NormalizationRules;
}

export interface SpokenResponseEvaluation {
  readonly kind: "spoken-response";
  readonly strictness: "lenient" | "standard" | "strict";
}

export type Evaluation =
  | SelectedOptionsEvaluation
  | OrderedTokensEvaluation
  | MatchedPairsEvaluation
  | FilledBlanksEvaluation
  | TypedAnswerEvaluation
  | SpokenResponseEvaluation;

export interface ExerciseSettings {
  readonly slowReplay?: boolean;
  readonly allowSkip?: boolean;
  readonly showRomaji?: boolean;
}

export interface ExerciseFeedback {
  readonly correct?: readonly RenderFragment[];
  readonly incorrect?: readonly RenderFragment[];
  readonly perOption?: Readonly<Record<string, readonly RenderFragment[]>>;
}

export interface ExercisePresentation {
  readonly layout?: "list" | "image-grid";
}

interface ExerciseBase {
  readonly id: string;
  readonly instruction?: string;
  readonly prompt: readonly RenderFragment[];
  readonly feedback?: ExerciseFeedback;
  readonly settings?: ExerciseSettings;
  readonly presentation?: ExercisePresentation;
}

export interface MultipleChoiceExercise extends ExerciseBase {
  readonly type: "multiple-choice" | "select-image";
  readonly options: readonly ChoiceOption[];
  readonly evaluation: SelectedOptionsEvaluation;
}

export interface MatchPairsExercise extends ExerciseBase {
  readonly type: "match-pairs";
  readonly left: readonly ChoiceOption[];
  readonly right: readonly ChoiceOption[];
  readonly evaluation: MatchedPairsEvaluation;
}

export type BlankSegment =
  | { readonly kind: "text"; readonly fragment: RenderFragment }
  | { readonly kind: "blank"; readonly id: string };

export interface FillBlankExercise extends ExerciseBase {
  readonly type: "fill-blank";
  readonly stem: readonly BlankSegment[];
  readonly bank?: readonly ChoiceOption[];
  readonly translation?: RenderFragment;
  readonly evaluation: FilledBlanksEvaluation;
}

export interface WordOrderExercise extends ExerciseBase {
  readonly type: "word-order";
  readonly tokens: readonly ChoiceOption[];
  readonly distractors?: readonly ChoiceOption[];
  readonly evaluation: OrderedTokensEvaluation;
}

export interface ListeningExercise extends ExerciseBase {
  readonly type: "listening";
  readonly stimulus: RenderFragment;
  readonly answerMode: "select" | "type";
  readonly options?: readonly ChoiceOption[];
  readonly evaluation: SelectedOptionsEvaluation | TypedAnswerEvaluation;
}

export interface SpeakingExercise extends ExerciseBase {
  readonly type: "speaking";
  readonly target: RenderFragment;
  readonly evaluation: SpokenResponseEvaluation;
}

export type Exercise =
  | MultipleChoiceExercise
  | MatchPairsExercise
  | FillBlankExercise
  | WordOrderExercise
  | ListeningExercise
  | SpeakingExercise;
