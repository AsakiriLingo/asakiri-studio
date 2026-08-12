import { useState } from "react";
import type { Course, Lesson, TiptapDocument } from "@core/course";
import type { ProjectWriteResult } from "@core/project-writing";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { PanelHeader } from "@shared/components/panel";
import { WorkHeader, WorkInner } from "@shared/components/work-surface";
import { partKind } from "@features/lesson-editor/parts";
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
  readonly course: Course;
  readonly lesson: Lesson;
  readonly onBackToStructure: () => void;
  readonly onSaveDocument: (
    partId: string,
    document: TiptapDocument,
  ) => Promise<ProjectWriteResult>;
}

export function LessonEditor({
  course,
  lesson,
  onBackToStructure,
  onSaveDocument,
}: LessonEditorProps) {
  const messages = useMessages();
  const t = messages.lesson;
  const parts = lesson.parts;
  const [selectedId, setSelectedId] = useState(parts[0]?.id ?? "");
  const selectedPart = parts.find((part) => part.id === selectedId) ?? parts[0];

  const unitTitle = course.outline.find((section) => section.lessonIds.includes(lesson.id))?.title;
  const description = [unitTitle, t.parts(parts.length)].filter(Boolean).join(" · ");

  return (
    <WorkInner>
      <WorkHeader
        title={lesson.title}
        description={description}
        actions={
          <Button variant="ghost" onClick={onBackToStructure}>
            {t.courseStructure}
          </Button>
        }
      />

      {!selectedPart ? (
        <PanelHeader title={t.noPartsTitle} description={t.noPartsBody} />
      ) : (
        <div className={styles.layout}>
          <aside className={styles.outline} aria-label={t.partsAria}>
            <PanelHeader
              title={t.partsPanel}
              actions={
                <IconButton aria-label={t.addPart} size="sm">
                  <Icon name="plus" size={18} />
                </IconButton>
              }
              spread
            />
            <div className={styles.partOrder}>
              {parts.map((part, index) => {
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
                      aria-label={messages.common.reorder(part.title)}
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
                      <span className={styles.rowTitle}>{part.title}</span>
                      <span className={styles.rowDetail}>{t.kind[partKind(part.content)]}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>

          <PartEditor part={selectedPart} onSaveDocument={onSaveDocument} />
          <PartPreview part={selectedPart} />
        </div>
      )}
    </WorkInner>
  );
}
