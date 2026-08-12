import { useMemo, useState, type ReactNode } from "react";
import type { Course, Lesson, OutlineSection } from "@core/course";
import type { ProjectWriteResult } from "@core/project-writing";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { useConfirm } from "@shared/components/confirm-dialog";
import { Field, TextInput } from "@shared/components/form";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { Status } from "@shared/components/status";
import { WorkHeader, WorkInner } from "@shared/components/work-surface";
import styles from "@features/course-structure/CourseStructure.module.css";

function orderLabel(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function Modal({
  label,
  onClose,
  children,
}: {
  readonly label: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        {children}
      </div>
    </div>
  );
}

export interface CourseStructureProps {
  readonly course: Course;
  readonly onNewUnit: () => Promise<ProjectWriteResult>;
  readonly onRenameUnit: (unitId: string, title: string) => Promise<ProjectWriteResult>;
  readonly onDeleteUnit: (unitId: string) => Promise<ProjectWriteResult>;
  readonly onOpenLesson: (lessonId: string) => void;
}

export function CourseStructure({
  course,
  onNewUnit,
  onRenameUnit,
  onDeleteUnit,
  onOpenLesson,
}: CourseStructureProps) {
  const messages = useMessages();
  const t = messages.structure;
  const confirm = useConfirm();
  const [creating, setCreating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [settingsUnitId, setSettingsUnitId] = useState<string | null>(null);

  const settingsUnit =
    settingsUnitId === null
      ? null
      : (course.outline.find((section) => section.id === settingsUnitId) ?? null);

  const report = (result: ProjectWriteResult) => {
    setFailed(result.status !== "saved");
  };

  const createUnit = async () => {
    setCreating(true);
    setFailed(false);
    const result = await onNewUnit();
    setCreating(false);
    report(result);
  };

  const renameUnit = (unit: OutlineSection, title: string) => {
    const next = title.trim();
    if (next === "" || next === unit.title) return;
    setFailed(false);
    void onRenameUnit(unit.id, next).then(report);
  };

  const removeUnit = async (unit: OutlineSection) => {
    const ok = await confirm({
      title: t.confirmDeleteUnitTitle,
      description: t.confirmDeleteUnitBody(unit.title),
      confirmLabel: t.deleteUnit,
      tone: "danger",
    });
    if (!ok) return;
    setSettingsUnitId(null);
    setFailed(false);
    report(await onDeleteUnit(unit.id));
  };

  const lessonById = useMemo(
    () => new Map<string, Lesson>(course.lessons.map((lesson) => [lesson.id, lesson])),
    [course.lessons],
  );

  return (
    <WorkInner className={styles.inner}>
      <WorkHeader
        title={t.title}
        description={t.description}
        actions={
          <>
            {failed ? <Status tone="warning">{messages.common.saveFailed}</Status> : null}
            <Button
              disabled={creating}
              onClick={() => {
                void createUnit();
              }}
            >
              <Icon name="plus" size={18} />
              {t.newUnit}
            </Button>
          </>
        }
      />

      {course.outline.length === 0 ? (
        <p className={styles.empty}>{t.empty}</p>
      ) : (
        <div className={styles.unitStack} aria-label="Course units">
          {course.outline.map((unit, unitIndex) => {
            const lessons = unit.lessonIds
              .map((lessonId) => lessonById.get(lessonId))
              .filter((lesson): lesson is Lesson => lesson !== undefined);
            return (
              <article key={unit.id} className={styles.unitBlock}>
                <header className={styles.unitHeader}>
                  <button
                    type="button"
                    className={styles.reorderHandle}
                    aria-label={messages.common.reorder(unit.title)}
                  >
                    <Icon name="grip" size={18} />
                  </button>
                  <span className={styles.orderIndex}>{orderLabel(unitIndex)}</span>
                  <span>
                    <span className={styles.unitName}>{unit.title}</span>
                    <span className={styles.rowDetail}>{t.unitLessons(lessons.length)}</span>
                  </span>
                  <div className={styles.unitActions}>
                    <Button variant="ghost">
                      <Icon name="plus" size={18} />
                      {t.addLesson}
                    </Button>
                    <IconButton
                      aria-label={t.unitSettings(unit.title)}
                      onClick={() => {
                        setFailed(false);
                        setSettingsUnitId(unit.id);
                      }}
                    >
                      <Icon name="details" size={18} />
                    </IconButton>
                  </div>
                </header>

                <div className={styles.lessonOrder} aria-label={t.lessonsAria(unit.title)}>
                  {lessons.map((lesson, lessonIndex) => (
                    <div key={lesson.id} className={styles.orderedRow}>
                      <button
                        type="button"
                        className={styles.reorderHandle}
                        aria-label={messages.common.reorder(lesson.title)}
                      >
                        <Icon name="grip" size={18} />
                      </button>
                      <span className={styles.orderIndex}>{orderLabel(lessonIndex)}</span>
                      <button
                        type="button"
                        className={styles.orderedMain}
                        onClick={() => {
                          onOpenLesson(lesson.id);
                        }}
                      >
                        <span className={styles.rowTitle}>{lesson.title}</span>
                        <span className={styles.rowDetail}>{t.parts(lesson.parts.length)}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {settingsUnit ? (
        <Modal
          label={t.unitSettingsLabel}
          onClose={() => {
            setSettingsUnitId(null);
          }}
        >
          <div className={styles.dialogHeader}>
            <h2 className={styles.dialogTitle}>{t.unitSettingsLabel}</h2>
          </div>
          <div className={styles.dialogBody}>
            <Field label={t.unitTitleLabel}>
              <TextInput
                key={`unit-name-${settingsUnit.id}`}
                defaultValue={settingsUnit.title}
                autoComplete="off"
                onBlur={(event) => {
                  renameUnit(settingsUnit, event.currentTarget.value);
                }}
              />
            </Field>
          </div>
          <div className={styles.dialogActions}>
            <Button
              variant="danger"
              onClick={() => {
                void removeUnit(settingsUnit);
              }}
            >
              {t.deleteUnit}
            </Button>
            <span className={styles.barSpacer} />
            <Button
              onClick={() => {
                setSettingsUnitId(null);
              }}
            >
              {messages.common.done}
            </Button>
          </div>
        </Modal>
      ) : null}
    </WorkInner>
  );
}
