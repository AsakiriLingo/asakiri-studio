import { useState, type ReactNode } from "react";
import type { Asset, ContentRecord, Course, Lesson, Part, TiptapDocument } from "@core/course";
import type { ProjectWriteResult } from "@core/project-writing";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { useConfirm } from "@shared/components/confirm-dialog";
import { Field, TextInput } from "@shared/components/form";
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

export interface LessonEditorProps {
  readonly course: Course;
  readonly lesson: Lesson;
  readonly onBackToStructure: () => void;
  readonly onSaveDocument: (
    partId: string,
    document: TiptapDocument,
  ) => Promise<ProjectWriteResult>;
  readonly onRenamePart: (partId: string, title: string) => Promise<ProjectWriteResult>;
  readonly onDeletePart: (partId: string) => Promise<ProjectWriteResult>;
  readonly onSaveRecord: (record: ContentRecord) => Promise<ProjectWriteResult>;
  readonly onLoadAssetPreview: (assetId: string) => Promise<string | null>;
  readonly onImportMedia: () => Promise<Asset | null>;
}

export function LessonEditor({
  course,
  lesson,
  onBackToStructure,
  onSaveDocument,
  onRenamePart,
  onDeletePart,
  onSaveRecord,
  onLoadAssetPreview,
  onImportMedia,
}: LessonEditorProps) {
  const messages = useMessages();
  const t = messages.lesson;
  const confirm = useConfirm();
  const parts = lesson.parts;
  const [selectedId, setSelectedId] = useState(parts[0]?.id ?? "");
  const selectedPart = parts.find((part) => part.id === selectedId) ?? parts[0];
  const [settingsPartId, setSettingsPartId] = useState<string | null>(null);
  const settingsPart =
    settingsPartId === null ? null : (parts.find((part) => part.id === settingsPartId) ?? null);

  const renamePart = (part: Part, title: string) => {
    const next = title.trim();
    if (next === "" || next === part.title) return;
    void onRenamePart(part.id, next);
  };

  const removePart = async (part: Part) => {
    const ok = await confirm({
      title: t.confirmDeletePartTitle,
      description: t.confirmDeletePartBody(part.title),
      confirmLabel: t.deletePart,
      tone: "danger",
    });
    if (!ok) return;
    setSettingsPartId(null);
    void onDeletePart(part.id);
  };

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
                    <IconButton
                      aria-label={t.partSettings(part.title)}
                      size="sm"
                      onClick={() => {
                        setSettingsPartId(part.id);
                      }}
                    >
                      <Icon name="edit" size={18} />
                    </IconButton>
                  </div>
                );
              })}
            </div>
          </aside>

          <PartEditor
            part={selectedPart}
            course={course}
            onSaveDocument={onSaveDocument}
            onSaveRecord={onSaveRecord}
            onLoadAssetPreview={onLoadAssetPreview}
            onImportMedia={onImportMedia}
          />
          <PartPreview
            part={selectedPart}
            course={course}
            onLoadAssetPreview={onLoadAssetPreview}
          />
        </div>
      )}

      {settingsPart ? (
        <Modal
          label={t.partSettingsLabel}
          onClose={() => {
            setSettingsPartId(null);
          }}
        >
          <div className={styles.dialogHeader}>
            <h2 className={styles.dialogTitle}>{t.partSettingsLabel}</h2>
          </div>
          <div className={styles.dialogBody}>
            <Field label={t.partTitleLabel}>
              <TextInput
                key={`part-name-${settingsPart.id}`}
                defaultValue={settingsPart.title}
                autoComplete="off"
                onBlur={(event) => {
                  renamePart(settingsPart, event.currentTarget.value);
                }}
              />
            </Field>
          </div>
          <div className={styles.dialogActions}>
            <Button
              variant="danger"
              onClick={() => {
                void removePart(settingsPart);
              }}
            >
              {t.deletePart}
            </Button>
            <span className={styles.barSpacer} />
            <Button
              onClick={() => {
                setSettingsPartId(null);
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
