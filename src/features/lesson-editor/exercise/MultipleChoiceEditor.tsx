import { useState } from "react";
import type { MultipleChoiceExercise, RenderFragment } from "@core/course";
import type { RichEditorLibrary } from "@shared/components/rich-editor";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { PanelHeader } from "@shared/components/panel";
import { Select } from "@shared/components/select";
import { ExerciseShell } from "@features/lesson-editor/exercise/ExerciseShell";
import { FragmentField } from "@features/lesson-editor/exercise/FragmentField";
import {
  newFragmentId,
  textFragment,
  type FragmentSource,
} from "@features/lesson-editor/exercise/fragment-model";
import styles from "@features/lesson-editor/LessonEditor.module.css";

function optionLetter(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

export interface MultipleChoiceEditorProps {
  readonly exercise: MultipleChoiceExercise;
  readonly library: RichEditorLibrary;
  readonly onChange: (exercise: MultipleChoiceExercise) => void;
  readonly optionSource?: FragmentSource | undefined;
}

export function MultipleChoiceEditor({
  exercise,
  library,
  onChange,
  optionSource,
}: MultipleChoiceEditorProps) {
  const messages = useMessages();
  const t = messages.lesson;
  const te = t.exercise;
  const [ex, setEx] = useState<MultipleChoiceExercise>(exercise);

  const update = (next: MultipleChoiceExercise) => {
    setEx(next);
    onChange(next);
  };

  const select = ex.evaluation.select ?? "one";
  const isCorrect = (id: string) => ex.evaluation.correctOptionIds.includes(id);

  const setPrompt = (fragment: RenderFragment) => {
    update({ ...ex, prompt: [fragment, ...ex.prompt.slice(1)] });
  };

  const setSelect = (mode: "one" | "many") => {
    const correctOptionIds =
      mode === "one" ? ex.evaluation.correctOptionIds.slice(0, 1) : ex.evaluation.correctOptionIds;
    update({ ...ex, evaluation: { ...ex.evaluation, select: mode, correctOptionIds } });
  };

  const setRole = (id: string, role: "correct" | "distractor") => {
    const correctOptionIds =
      role === "distractor"
        ? ex.evaluation.correctOptionIds.filter((entry) => entry !== id)
        : select === "one"
          ? [id]
          : isCorrect(id)
            ? ex.evaluation.correctOptionIds
            : [...ex.evaluation.correctOptionIds, id];
    update({ ...ex, evaluation: { ...ex.evaluation, correctOptionIds } });
  };

  const setOptionBody = (id: string, fragment: RenderFragment) => {
    update({
      ...ex,
      options: ex.options.map((option) =>
        option.id === id ? { ...option, body: [fragment, ...option.body.slice(1)] } : option,
      ),
    });
  };

  const addOption = () => {
    const id = newFragmentId("option");
    update({ ...ex, options: [...ex.options, { id, body: [textFragment("primary")] }] });
  };

  const removeOption = (id: string) => {
    update({
      ...ex,
      options: ex.options.filter((option) => option.id !== id),
      evaluation: {
        ...ex.evaluation,
        correctOptionIds: ex.evaluation.correctOptionIds.filter((entry) => entry !== id),
      },
    });
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

      <div className={styles.fragmentGroup}>
        <span className={styles.fragmentLabel}>{te.selectMode}</span>
        <Select
          aria-label={te.selectMode}
          className={styles.fragmentSource}
          value={select}
          onValueChange={(mode) => {
            setSelect(mode === "many" ? "many" : "one");
          }}
          items={[
            { value: "one", label: te.selectOne },
            { value: "many", label: te.selectMany },
          ]}
        />
      </div>

      <div>
        <PanelHeader title={te.answerOptionsTitle} description={te.answerOptionsDesc} />
        <div className={styles.optionList}>
          {ex.options.map((option, index) => (
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
                defaultSource={optionSource}
              />
              <Select
                aria-label={te.answerRoleFor(optionLetter(index))}
                className={styles.optionRole}
                value={isCorrect(option.id) ? "correct" : "distractor"}
                onValueChange={(role) => {
                  setRole(option.id, role === "correct" ? "correct" : "distractor");
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
