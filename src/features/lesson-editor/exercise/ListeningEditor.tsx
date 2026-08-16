import { useState } from "react";
import type {
  ListeningExercise,
  RenderFragment,
  SelectedOptionsEvaluation,
  TypedAnswerEvaluation,
} from "@core/course";
import type { RichEditorLibrary } from "@shared/components/rich-editor";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { PanelHeader } from "@shared/components/panel";
import { Select } from "@shared/components/select";
import { ExerciseShell } from "@features/lesson-editor/exercise/ExerciseShell";
import { FragmentField } from "@features/lesson-editor/exercise/FragmentField";
import { newFragmentId, textFragment } from "@features/lesson-editor/exercise/fragment-model";
import styles from "@features/lesson-editor/LessonEditor.module.css";

function optionLetter(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

export interface ListeningEditorProps {
  readonly exercise: ListeningExercise;
  readonly library: RichEditorLibrary;
  readonly onChange: (exercise: ListeningExercise) => void;
}

export function ListeningEditor({ exercise, library, onChange }: ListeningEditorProps) {
  const messages = useMessages();
  const t = messages.lesson;
  const te = t.exercise;
  const [ex, setEx] = useState<ListeningExercise>(exercise);

  const update = (next: ListeningExercise) => {
    setEx(next);
    onChange(next);
  };

  const toggleItems = [
    { value: "on", label: messages.common.on },
    { value: "off", label: te.matchOff },
  ];

  const setPrompt = (fragment: RenderFragment) => {
    update({ ...ex, prompt: [fragment, ...ex.prompt.slice(1)] });
  };

  const setStimulus = (fragment: RenderFragment) => {
    update({ ...ex, stimulus: fragment });
  };

  const setAnswerMode = (mode: "select" | "type") => {
    if (mode === "select") {
      const evaluation: SelectedOptionsEvaluation =
        ex.evaluation.kind === "selected-options"
          ? ex.evaluation
          : { kind: "selected-options", correctOptionIds: [] };
      update({ ...ex, answerMode: "select", options: ex.options ?? [], evaluation });
    } else {
      const evaluation: TypedAnswerEvaluation =
        ex.evaluation.kind === "typed-answer"
          ? ex.evaluation
          : { kind: "typed-answer", accepted: [] };
      update({ ...ex, answerMode: "type", evaluation });
    }
  };

  const options = ex.options ?? [];
  const selectedEval = ex.evaluation.kind === "selected-options" ? ex.evaluation : null;
  const isCorrect = (id: string) => selectedEval?.correctOptionIds.includes(id) ?? false;

  const setOptionRole = (id: string, role: "correct" | "distractor") => {
    if (!selectedEval) return;
    const correctOptionIds =
      role === "distractor"
        ? selectedEval.correctOptionIds.filter((entry) => entry !== id)
        : selectedEval.correctOptionIds.includes(id)
          ? selectedEval.correctOptionIds
          : [...selectedEval.correctOptionIds, id];
    update({ ...ex, evaluation: { ...selectedEval, correctOptionIds } });
  };

  const setOptionBody = (id: string, fragment: RenderFragment) => {
    update({
      ...ex,
      options: options.map((option) =>
        option.id === id ? { ...option, body: [fragment, ...option.body.slice(1)] } : option,
      ),
    });
  };

  const addOption = () => {
    update({
      ...ex,
      options: [...options, { id: newFragmentId("option"), body: [textFragment("primary")] }],
    });
  };

  const removeOption = (id: string) => {
    update({
      ...ex,
      options: options.filter((option) => option.id !== id),
      evaluation: selectedEval
        ? {
            ...selectedEval,
            correctOptionIds: selectedEval.correctOptionIds.filter((e) => e !== id),
          }
        : ex.evaluation,
    });
  };

  const typedEval = ex.evaluation.kind === "typed-answer" ? ex.evaluation : null;
  const acceptedBinding = typedEval?.accepted[0]?.binding;
  const acceptedFragment: RenderFragment | undefined = acceptedBinding
    ? { id: "accepted_answer", role: "primary", binding: acceptedBinding }
    : undefined;
  const normalize = typedEval?.normalize ?? {};

  const setAccepted = (fragment: RenderFragment) => {
    if (!typedEval) return;
    update({ ...ex, evaluation: { ...typedEval, accepted: [{ binding: fragment.binding }] } });
  };

  const toggleNormalize = (
    key: "ignoreCase" | "ignoreWhitespace" | "ignorePunctuation",
    on: boolean,
  ) => {
    if (!typedEval) return;
    update({ ...ex, evaluation: { ...typedEval, normalize: { ...normalize, [key]: on } } });
  };

  const setFeedback = (key: "correct" | "incorrect", fragment: RenderFragment) => {
    update({ ...ex, feedback: { ...ex.feedback, [key]: [fragment] } });
  };

  const optionsSection = (
    <div className={styles.formGrid}>
      <FragmentField
        label={t.prompt}
        role="primary"
        fragment={ex.prompt[0]}
        library={library}
        onChange={setPrompt}
      />

      <FragmentField
        label={te.audioLabel}
        help={te.audioHelp}
        role="audio"
        fragment={ex.stimulus}
        library={library}
        onChange={setStimulus}
        defaultSource="asset"
      />

      <div className={styles.fragmentGroup}>
        <span className={styles.fragmentLabel}>{t.answerModeLabel}</span>
        <Select
          aria-label={t.answerModeLabel}
          className={styles.fragmentSource}
          value={ex.answerMode}
          onValueChange={(mode) => {
            setAnswerMode(mode === "type" ? "type" : "select");
          }}
          items={[
            { value: "select", label: t.answerModeTap },
            { value: "type", label: t.answerModeType },
          ]}
        />
      </div>

      {ex.answerMode === "select" ? (
        <div>
          <PanelHeader title={te.answerOptionsTitle} description={te.answerOptionsDesc} />
          <div className={[styles.optionList, styles.exerciseOptionList].join(" ")}>
            {options.map((option, index) => (
              <div key={option.id} className={styles.exerciseOption}>
                <span className={styles.optionIndex}>{optionLetter(index)}</span>
                <FragmentField
                  role="primary"
                  fragment={option.body[0]}
                  library={library}
                  onChange={(fragment) => {
                    setOptionBody(option.id, fragment);
                  }}
                  ariaLabel={te.optionContent}
                />
                <Select
                  aria-label={te.answerRoleFor(optionLetter(index))}
                  className={styles.optionRole}
                  value={isCorrect(option.id) ? "correct" : "distractor"}
                  onValueChange={(role) => {
                    setOptionRole(option.id, role === "correct" ? "correct" : "distractor");
                  }}
                  items={[
                    { value: "correct", label: te.roleCorrect },
                    { value: "distractor", label: te.roleDistractor },
                  ]}
                />
                <IconButton
                  aria-label={te.removeOption(optionLetter(index))}
                  size="sm"
                  onClick={() => {
                    removeOption(option.id);
                  }}
                >
                  <Icon name="close" size={18} />
                </IconButton>
              </div>
            ))}
          </div>
          <div className={styles.tokenList}>
            <Button variant="ghost" onClick={addOption}>
              <Icon name="plus" size={18} />
              {te.addOption}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <FragmentField
            label={te.typedAnswerLabel}
            help={te.typedAnswerHelp}
            role="primary"
            fragment={acceptedFragment}
            library={library}
            onChange={setAccepted}
          />
          <div>
            <PanelHeader title={te.matchTitle} description={te.matchDesc} />
            <div className={styles.settingGroup}>
              {(
                [
                  ["ignoreCase", te.ignoreCase],
                  ["ignoreWhitespace", te.ignoreWhitespace],
                  ["ignorePunctuation", te.ignorePunctuation],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className={styles.settingRow}>
                  <span className={styles.settingName}>{label}</span>
                  <Select
                    aria-label={label}
                    className={styles.matchToggle}
                    value={normalize[key] ? "on" : "off"}
                    onValueChange={(value) => {
                      toggleNormalize(key, value === "on");
                    }}
                    items={toggleItems}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const feedbackSection = (
    <div className={styles.formGrid}>
      <PanelHeader title={te.feedbackTitle} description={te.feedbackDesc} />
      <FragmentField
        label={te.feedbackCorrect}
        role="primary"
        fragment={ex.feedback?.correct?.[0]}
        library={library}
        onChange={(fragment) => {
          setFeedback("correct", fragment);
        }}
      />
      <FragmentField
        label={te.feedbackIncorrect}
        role="primary"
        fragment={ex.feedback?.incorrect?.[0]}
        library={library}
        onChange={(fragment) => {
          setFeedback("incorrect", fragment);
        }}
      />
    </div>
  );

  return <ExerciseShell options={optionsSection} feedback={feedbackSection} />;
}
