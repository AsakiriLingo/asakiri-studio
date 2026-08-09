import { useState } from "react";
import { Button } from "@shared/components/button";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { PanelHeader } from "@shared/components/panel";
import { WorkHeader, WorkInner } from "@shared/components/work-surface";
import { LESSON_PARTS } from "@features/lesson-editor/parts";
import { PartEditor } from "@features/lesson-editor/PartEditor";
import { PartPreview } from "@features/lesson-editor/PartPreview";
import styles from "@features/lesson-editor/LessonEditor.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

function orderLabel(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export interface LessonEditorProps {
  readonly onBackToStructure: () => void;
}

export function LessonEditor({ onBackToStructure }: LessonEditorProps) {
  const [selectedId, setSelectedId] = useState(LESSON_PARTS[0]?.id ?? "");
  const selectedPart = LESSON_PARTS.find((part) => part.id === selectedId) ?? LESSON_PARTS[0];

  if (!selectedPart) {
    return null;
  }

  return (
    <WorkInner>
      <WorkHeader
        title="Welcome to Japanese"
        description="Getting started · 8 parts · autosaved locally"
        actions={
          <Button variant="ghost" onClick={onBackToStructure}>
            Course structure
          </Button>
        }
      />

      <div className={styles.layout}>
        <aside className={styles.outline} aria-label="Ordered lesson parts">
          <PanelHeader
            title="Lesson parts"
            actions={
              <IconButton aria-label="Add lesson part" size="sm">
                <Icon name="plus" size={18} />
              </IconButton>
            }
            spread
          />
          <div className={styles.partOrder}>
            {LESSON_PARTS.map((part, index) => {
              const isSelected = part.id === selectedPart.id;
              return (
                <div
                  key={part.id}
                  className={joinClassNames(
                    styles.orderedRow,
                    isSelected ? styles.selected : undefined,
                  )}
                >
                  <button
                    type="button"
                    className={styles.reorderHandle}
                    aria-label={`Reorder ${part.name}. Use the up and down arrow keys.`}
                  >
                    <Icon name="grip" size={18} />
                  </button>
                  <span className={joinClassNames(styles.orderIndex, styles.mono)}>
                    {orderLabel(index)}
                  </span>
                  <button
                    type="button"
                    className={styles.orderedMain}
                    aria-current={isSelected ? "page" : undefined}
                    onClick={() => {
                      setSelectedId(part.id);
                    }}
                  >
                    <span className={styles.rowTitle}>{part.name}</span>
                    <span className={styles.rowDetail}>{part.outlineDetail}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <PartEditor part={selectedPart} />
        <PartPreview part={selectedPart} />
      </div>
    </WorkInner>
  );
}
