import { useState } from "react";
import type { RenderFragment, SpeakingExercise } from "@core/course";
import type { RichEditorLibrary } from "@shared/components/rich-editor";
import { useMessages } from "@shared/i18n";
import { Icon } from "@shared/components/icon";
import { PanelHeader } from "@shared/components/panel";
import { ExerciseShell } from "@features/lesson-editor/exercise/ExerciseShell";
import { FragmentField } from "@features/lesson-editor/exercise/FragmentField";
import styles from "@features/lesson-editor/LessonEditor.module.css";

export interface SpeakingEditorProps {
  readonly exercise: SpeakingExercise;
  readonly library: RichEditorLibrary;
  readonly onChange: (exercise: SpeakingExercise) => void;
}

export function SpeakingEditor({ exercise, library, onChange }: SpeakingEditorProps) {
  const messages = useMessages();
  const t = messages.lesson;
  const te = t.exercise;
  const [ex, setEx] = useState<SpeakingExercise>(exercise);

  const update = (next: SpeakingExercise) => {
    setEx(next);
    onChange(next);
  };

  const setPrompt = (fragment: RenderFragment) => {
    update({ ...ex, prompt: [fragment, ...ex.prompt.slice(1)] });
  };

  const setTarget = (fragment: RenderFragment) => {
    update({ ...ex, target: fragment });
  };

  const setFeedback = (key: "correct" | "incorrect", fragment: RenderFragment) => {
    update({ ...ex, feedback: { ...ex.feedback, [key]: [fragment] } });
  };

  const optionsSection = (
    <div className={styles.formGrid}>
      <div className={styles.callout}>
        <Icon name="mic" size={18} />
        <span>
          <strong>{t.speakCalloutStrong}</strong>
          <br />
          {t.speakCalloutBody}
        </span>
      </div>

      <FragmentField
        label={t.prompt}
        role="primary"
        fragment={ex.prompt[0]}
        library={library}
        onChange={setPrompt}
      />

      <FragmentField
        label={te.phraseTitle}
        help={te.phraseDesc}
        role="target"
        fragment={ex.target}
        library={library}
        onChange={setTarget}
      />
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
