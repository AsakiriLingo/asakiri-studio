import { useState, type ReactNode } from "react";
import { useMessages } from "@shared/i18n";
import styles from "@features/lesson-editor/LessonEditor.module.css";

export interface ExerciseShellProps {
  readonly options: ReactNode;
  readonly feedback: ReactNode;
}

export function ExerciseShell({ options, feedback }: ExerciseShellProps) {
  const messages = useMessages();
  const t = messages.lesson;
  const [tab, setTab] = useState<"options" | "feedback">("options");

  return (
    <>
      <div className={styles.lessonType} role="tablist" aria-label={t.editorModesAria}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "options"}
          className={styles.tab}
          onClick={() => {
            setTab("options");
          }}
        >
          {t.tabOptions}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "feedback"}
          className={styles.tab}
          onClick={() => {
            setTab("feedback");
          }}
        >
          {t.tabFeedback}
        </button>
      </div>
      {tab === "options" ? options : feedback}
    </>
  );
}
