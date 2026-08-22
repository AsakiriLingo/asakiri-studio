import { useState, type ReactNode } from "react";
import { useMessages } from "@shared/i18n";
import { Icon } from "@shared/components/icon";
import styles from "@features/lesson-editor/LessonEditor.module.css";

export interface ExerciseShellProps {
  readonly options: ReactNode;
  readonly feedback: ReactNode;
}

export function ExerciseShell({ options, feedback }: ExerciseShellProps) {
  const te = useMessages().lesson.exercise;
  const [open, setOpen] = useState(false);

  return (
    <>
      {options}
      <div className={styles.feedbackSection}>
        <button
          type="button"
          className={styles.feedbackToggle}
          aria-expanded={open}
          onClick={() => {
            setOpen((value) => !value);
          }}
        >
          <Icon
            aria-hidden="true"
            name="chevron-down"
            size={18}
            className={[styles.feedbackChevron, open ? "" : styles.feedbackChevronCollapsed]
              .filter(Boolean)
              .join(" ")}
          />
          <span className={styles.feedbackToggleTitle}>{te.feedbackTitle}</span>
        </button>
        {open ? (
          <div className={styles.feedbackBody}>
            <p className={styles.feedbackDesc}>{te.feedbackDesc}</p>
            {feedback}
          </div>
        ) : null}
      </div>
    </>
  );
}
