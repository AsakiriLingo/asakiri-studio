import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Course, Lesson, OutlineSection } from "@core/course";
import type { ProjectWriteResult } from "@core/project-writing";
import { useFormat, useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { useConfirm } from "@shared/components/confirm-dialog";
import { Field, TextInput } from "@shared/components/form";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { Status } from "@shared/components/status";
import { WorkInner } from "@shared/components/work-surface";
import styles from "@features/course-structure/CourseStructure.module.css";

function orderLabel(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function chevronClass(collapsed: boolean): string {
  return [styles.unitChevron, collapsed ? styles.chevronCollapsed : ""].filter(Boolean).join(" ");
}

function LessonRow({
  lesson,
  index,
  variant,
  onOpen,
  onOpenSettings,
}: {
  readonly lesson: Lesson;
  readonly index: number;
  readonly variant: "page" | "sidebar";
  readonly onOpen: () => void;
  readonly onOpenSettings: () => void;
}) {
  const messages = useMessages();
  const t = messages.structure;
  const format = useFormat();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const [partsCollapsed, setPartsCollapsed] = useState(false);

  if (variant === "sidebar") {
    const hasParts = lesson.parts.length > 0;
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={[styles.lessonNode, isDragging ? styles.dragging : ""].filter(Boolean).join(" ")}
      >
        <div className={[styles.treeRow, styles.lessonRow].join(" ")}>
          {hasParts ? (
            <button
              type="button"
              className={styles.disclosure}
              aria-expanded={!partsCollapsed}
              aria-label={
                partsCollapsed
                  ? format(t.expandUnit, { unit: lesson.title })
                  : format(t.collapseUnit, { unit: lesson.title })
              }
              onClick={() => {
                setPartsCollapsed((value) => !value);
              }}
            >
              <Icon
                aria-hidden="true"
                className={chevronClass(partsCollapsed)}
                name="chevron-down"
                size={16}
              />
            </button>
          ) : (
            <span className={styles.disclosureSpacer} aria-hidden="true" />
          )}
          <Icon className={styles.typeIcon} name="lessons" size={16} aria-hidden="true" />
          <button type="button" className={styles.treeMain} onClick={onOpen}>
            <span className={styles.rowTitle}>{lesson.title}</span>
          </button>
          <button
            type="button"
            className={styles.dragHandle}
            aria-label={format(messages.common.reorder, { label: lesson.title })}
            {...attributes}
            {...listeners}
          >
            <Icon name="grip" size={16} />
          </button>
        </div>
        {hasParts && !partsCollapsed ? (
          <div className={styles.partList}>
            {lesson.parts.map((part) => (
              <button key={part.id} type="button" className={styles.treeRow} onClick={onOpen}>
                <span className={styles.disclosureSpacer} aria-hidden="true" />
                <Icon className={styles.typeIcon} name="file-text" size={16} aria-hidden="true" />
                <span className={styles.rowTitle}>{part.title}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[styles.orderedRow, isDragging ? styles.dragging : ""].filter(Boolean).join(" ")}
    >
      <button
        type="button"
        className={styles.reorderHandle}
        aria-label={format(messages.common.reorder, { label: lesson.title })}
        {...attributes}
        {...listeners}
      >
        <Icon name="grip" size={18} />
      </button>
      <span className={styles.orderIndex}>{orderLabel(index)}</span>
      <button type="button" className={styles.orderedMain} onClick={onOpen}>
        <span className={styles.rowTitle}>{lesson.title}</span>
        <span className={styles.rowDetail}>{format(t.parts, { count: lesson.parts.length })}</span>
      </button>
      <IconButton
        aria-label={format(t.lessonSettings, { lesson: lesson.title })}
        onClick={onOpenSettings}
      >
        <Icon name="edit" size={18} />
      </IconButton>
    </div>
  );
}

function useReorderSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

function UnitBlock({
  unit,
  index,
  lessons,
  collapsed,
  addingLesson,
  variant,
  onToggleCollapsed,
  onAddLesson,
  onOpenSettings,
  onOpenLesson,
  onOpenLessonSettings,
}: {
  readonly unit: OutlineSection;
  readonly index: number;
  readonly lessons: readonly Lesson[];
  readonly collapsed: boolean;
  readonly addingLesson: boolean;
  readonly variant: "page" | "sidebar";
  readonly onToggleCollapsed: () => void;
  readonly onAddLesson: () => void;
  readonly onOpenSettings: () => void;
  readonly onOpenLesson: (lessonId: string) => void;
  readonly onOpenLessonSettings: (lessonId: string) => void;
}) {
  const sidebar = variant === "sidebar";
  const messages = useMessages();
  const t = messages.structure;
  const format = useFormat();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: unit.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const lessonsId = `unit-lessons-${unit.id}`;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={[styles.unitBlock, isDragging ? styles.dragging : ""].filter(Boolean).join(" ")}
    >
      <header className={styles.unitHeader}>
        <button
          type="button"
          className={styles.reorderHandle}
          aria-label={format(messages.common.reorder, { label: unit.title })}
          {...attributes}
          {...listeners}
        >
          <Icon name="grip" size={18} />
        </button>
        <span className={[styles.orderIndex, styles.unitIndex].join(" ")}>{orderLabel(index)}</span>
        <button
          type="button"
          className={styles.unitToggle}
          aria-expanded={!collapsed}
          aria-controls={lessonsId}
          aria-label={
            collapsed
              ? format(t.expandUnit, { unit: unit.title })
              : format(t.collapseUnit, { unit: unit.title })
          }
          onClick={onToggleCollapsed}
        >
          <Icon
            aria-hidden="true"
            className={chevronClass(collapsed)}
            name="chevron-down"
            size={18}
          />
          {sidebar ? (
            <Icon className={styles.typeIcon} name="folder" size={16} aria-hidden="true" />
          ) : null}
          <span className={styles.unitHeading}>
            <span className={styles.unitName}>{unit.title}</span>
            <span className={styles.rowDetail}>
              {format(t.unitLessons, { count: lessons.length })}
            </span>
          </span>
        </button>
        <div className={styles.unitActions}>
          {sidebar ? (
            <IconButton aria-label={t.addLesson} disabled={addingLesson} onClick={onAddLesson}>
              <Icon name="plus" size={18} />
            </IconButton>
          ) : (
            <Button variant="ghost" disabled={addingLesson} onClick={onAddLesson}>
              <Icon name="plus" size={18} />
              {t.addLesson}
            </Button>
          )}
          {sidebar ? null : (
            <IconButton
              aria-label={format(t.unitSettings, { unit: unit.title })}
              onClick={onOpenSettings}
            >
              <Icon name="edit" size={18} />
            </IconButton>
          )}
        </div>
      </header>

      {collapsed ? null : (
        <SortableContext
          items={lessons.map((lesson) => lesson.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            className={styles.lessonOrder}
            id={lessonsId}
            aria-label={format(t.lessonsAria, { unit: unit.title })}
          >
            {lessons.length === 0 ? <p className={styles.unitEmpty}>{t.unitEmpty}</p> : null}
            {lessons.map((lesson, lessonIndex) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                index={lessonIndex}
                variant={variant}
                onOpen={() => {
                  onOpenLesson(lesson.id);
                }}
                onOpenSettings={() => {
                  onOpenLessonSettings(lesson.id);
                }}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </article>
  );
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
  readonly onAddLesson: (unitId: string) => Promise<ProjectWriteResult>;
  readonly onRenameLesson: (lessonId: string, title: string) => Promise<ProjectWriteResult>;
  readonly onDeleteLesson: (lessonId: string) => Promise<ProjectWriteResult>;
  readonly onReorderOutline: (
    sections: readonly { readonly id: string; readonly lessonIds: readonly string[] }[],
  ) => Promise<ProjectWriteResult>;
  readonly onOpenLesson: (lessonId: string) => void;
  readonly variant?: "page" | "sidebar";
}

interface UnitLayout {
  readonly id: string;
  readonly lessonIds: readonly string[];
}

function outlineToLayout(outline: readonly OutlineSection[]): UnitLayout[] {
  return outline.map((section) => ({ id: section.id, lessonIds: [...section.lessonIds] }));
}

function sameLayout(layout: readonly UnitLayout[], outline: readonly OutlineSection[]): boolean {
  if (layout.length !== outline.length) return false;
  return layout.every((unit, unitIndex) => {
    const section = outline[unitIndex];
    if (!section) return false;
    if (section.id !== unit.id) return false;
    if (section.lessonIds.length !== unit.lessonIds.length) return false;
    return section.lessonIds.every((lessonId, index) => lessonId === unit.lessonIds[index]);
  });
}

export function CourseStructure({
  course,
  onNewUnit,
  onRenameUnit,
  onDeleteUnit,
  onAddLesson,
  onRenameLesson,
  onDeleteLesson,
  onReorderOutline,
  onOpenLesson,
  variant = "page",
}: CourseStructureProps) {
  const messages = useMessages();
  const t = messages.structure;
  const format = useFormat();
  const confirm = useConfirm();
  const [creating, setCreating] = useState(false);
  const [addingUnitId, setAddingUnitId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [settingsUnitId, setSettingsUnitId] = useState<string | null>(null);
  const [settingsLessonId, setSettingsLessonId] = useState<string | null>(null);
  const [collapsedUnitIds, setCollapsedUnitIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  const toggleUnitCollapsed = (unitId: string) => {
    setCollapsedUnitIds((current) => {
      const next = new Set(current);
      if (!next.delete(unitId)) next.add(unitId);
      return next;
    });
  };

  const expandUnit = (unitId: string) => {
    setCollapsedUnitIds((current) => {
      if (!current.has(unitId)) return current;
      const next = new Set(current);
      next.delete(unitId);
      return next;
    });
  };

  const allCollapsed =
    course.outline.length > 0 &&
    course.outline.every((section) => collapsedUnitIds.has(section.id));

  const toggleAllUnits = () => {
    setCollapsedUnitIds(
      allCollapsed ? new Set<string>() : new Set(course.outline.map((section) => section.id)),
    );
  };

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
      description: format(t.confirmDeleteUnitBody, { unit: unit.title }),
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

  const settingsLesson =
    settingsLessonId === null ? null : (lessonById.get(settingsLessonId) ?? null);

  const createLesson = async (unitId: string) => {
    setAddingUnitId(unitId);
    setFailed(false);
    const result = await onAddLesson(unitId);
    setAddingUnitId(null);
    report(result);
  };

  const renameLesson = (lesson: Lesson, title: string) => {
    const next = title.trim();
    if (next === "" || next === lesson.title) return;
    setFailed(false);
    void onRenameLesson(lesson.id, next).then(report);
  };

  const removeLesson = async (lesson: Lesson) => {
    const ok = await confirm({
      title: t.confirmDeleteLessonTitle,
      description: format(t.confirmDeleteLessonBody, { lesson: lesson.title }),
      confirmLabel: t.deleteLesson,
      tone: "danger",
    });
    if (!ok) return;
    setSettingsLessonId(null);
    setFailed(false);
    report(await onDeleteLesson(lesson.id));
  };

  const sensors = useReorderSensors();
  const [layout, setLayout] = useState<UnitLayout[]>(() => outlineToLayout(course.outline));
  const [syncedOutline, setSyncedOutline] = useState(course.outline);
  const [activeId, setActiveId] = useState<string | null>(null);
  const layoutRef = useRef(layout);

  if (activeId === null && course.outline !== syncedOutline) {
    setSyncedOutline(course.outline);
    setLayout(outlineToLayout(course.outline));
  }

  const commitLayout = (next: UnitLayout[]) => {
    layoutRef.current = next;
    setLayout(next);
  };

  const isUnitId = (id: string) => layoutRef.current.some((unit) => unit.id === id);

  const containerOf = (id: string): string | null => {
    if (isUnitId(id)) return id;
    const owner = layoutRef.current.find((unit) => unit.lessonIds.includes(id));
    return owner ? owner.id : null;
  };

  const persistLayout = (next: UnitLayout[]) => {
    if (sameLayout(next, course.outline)) return;
    setFailed(false);
    void onReorderOutline(next).then(report);
  };

  const handleDragStart = (event: DragStartEvent) => {
    layoutRef.current = layout;
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeLessonId = String(active.id);
    const overId = String(over.id);
    if (isUnitId(activeLessonId)) return;
    const fromUnit = containerOf(activeLessonId);
    const toUnit = containerOf(overId);
    if (!fromUnit || !toUnit || fromUnit === toUnit) return;

    const current = layoutRef.current;
    const target = current.find((unit) => unit.id === toUnit);
    if (!target) return;
    const overIsUnit = isUnitId(overId);
    const overIndex = overIsUnit ? target.lessonIds.length : target.lessonIds.indexOf(overId);
    const insertAt = overIndex < 0 ? target.lessonIds.length : overIndex;

    commitLayout(
      current.map((unit) => {
        if (unit.id === fromUnit) {
          return { ...unit, lessonIds: unit.lessonIds.filter((id) => id !== activeLessonId) };
        }
        if (unit.id === toUnit) {
          const next = unit.lessonIds.filter((id) => id !== activeLessonId);
          next.splice(insertAt, 0, activeLessonId);
          return { ...unit, lessonIds: next };
        }
        return unit;
      }),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeIdStr = String(active.id);
    setActiveId(null);
    if (!over) {
      commitLayout(outlineToLayout(course.outline));
      return;
    }
    const overId = String(over.id);
    const current = layoutRef.current;

    if (isUnitId(activeIdStr)) {
      const from = current.findIndex((unit) => unit.id === activeIdStr);
      const to = current.findIndex((unit) => unit.id === overId);
      if (from === -1 || to === -1 || from === to) return;
      const next = arrayMove(current, from, to);
      commitLayout(next);
      persistLayout(next);
      return;
    }

    const toUnit = containerOf(overId);
    const originUnit =
      course.outline.find((section) => section.lessonIds.includes(activeIdStr))?.id ??
      containerOf(activeIdStr);
    if (!toUnit || !originUnit) {
      commitLayout(outlineToLayout(course.outline));
      return;
    }
    expandUnit(toUnit);

    if (originUnit === toUnit) {
      const unit = current.find((entry) => entry.id === toUnit);
      let next = current;
      if (unit) {
        const ids = [...unit.lessonIds];
        const from = ids.indexOf(activeIdStr);
        const to = isUnitId(overId) ? ids.length - 1 : ids.indexOf(overId);
        if (from !== -1 && to !== -1 && from !== to) {
          const reordered = arrayMove(ids, from, to);
          next = current.map((entry) =>
            entry.id === toUnit ? { ...entry, lessonIds: reordered } : entry,
          );
          commitLayout(next);
        }
      }
      persistLayout(next);
      return;
    }

    const target = current.find((entry) => entry.id === toUnit);
    if (!target) {
      commitLayout(outlineToLayout(course.outline));
      return;
    }
    const baseIds = target.lessonIds.filter((id) => id !== activeIdStr);
    const overIndex = isUnitId(overId) ? baseIds.length : baseIds.indexOf(overId);
    const insertAt = overIndex < 0 ? baseIds.length : overIndex;
    const next = current.map((unit) => {
      if (unit.id === toUnit) {
        const ids = unit.lessonIds.filter((id) => id !== activeIdStr);
        ids.splice(insertAt, 0, activeIdStr);
        return { ...unit, lessonIds: ids };
      }
      if (unit.id === originUnit) {
        return { ...unit, lessonIds: unit.lessonIds.filter((id) => id !== activeIdStr) };
      }
      return unit;
    });
    commitLayout(next);
    persistLayout(next);
  };

  const activeLesson = activeId === null ? null : (lessonById.get(activeId) ?? null);
  const unitById = useMemo(
    () => new Map<string, OutlineSection>(course.outline.map((section) => [section.id, section])),
    [course.outline],
  );

  return (
    <WorkInner
      className={variant === "sidebar" ? [styles.inner, styles.sidebar].join(" ") : styles.inner}
    >
      {variant === "sidebar" ? (
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>{messages.lessonWorkspace.outline}</span>
          <div className={styles.sidebarHeaderActions}>
            {course.outline.length > 0 ? (
              <IconButton
                aria-label={allCollapsed ? t.expandAll : t.collapseAll}
                onClick={toggleAllUnits}
              >
                <Icon name={allCollapsed ? "arrows-expand" : "minimize"} size={18} />
              </IconButton>
            ) : null}
            <IconButton
              aria-label={t.newUnit}
              disabled={creating}
              onClick={() => {
                void createUnit();
              }}
            >
              <Icon name="plus" size={18} />
            </IconButton>
          </div>
        </div>
      ) : (
        <div className={styles.actionsRow}>
          <Button
            size="compact"
            disabled={creating}
            onClick={() => {
              void createUnit();
            }}
          >
            <Icon name="plus" size={18} />
            {t.newUnit}
          </Button>
          <div className={styles.actionsEnd}>
            {failed ? <Status tone="warning">{messages.common.saveFailed}</Status> : null}
            {course.outline.length > 0 ? (
              <Button variant="ghost" size="compact" onClick={toggleAllUnits}>
                <Icon
                  aria-hidden="true"
                  className={chevronClass(allCollapsed)}
                  name="chevron-down"
                  size={18}
                />
                {allCollapsed ? t.expandAll : t.collapseAll}
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {course.outline.length === 0 ? (
        <p className={styles.empty}>{t.empty}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            setActiveId(null);
            commitLayout(outlineToLayout(course.outline));
          }}
        >
          <SortableContext
            items={layout.map((unit) => unit.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={styles.unitStack} aria-label="Course units">
              {layout.map((unitLayout, unitIndex) => {
                const unit = unitById.get(unitLayout.id);
                if (!unit) return null;
                const lessons = unitLayout.lessonIds
                  .map((lessonId) => lessonById.get(lessonId))
                  .filter((lesson): lesson is Lesson => lesson !== undefined);
                return (
                  <UnitBlock
                    key={unit.id}
                    unit={unit}
                    index={unitIndex}
                    lessons={lessons}
                    collapsed={collapsedUnitIds.has(unit.id)}
                    addingLesson={addingUnitId === unit.id}
                    variant={variant}
                    onToggleCollapsed={() => {
                      toggleUnitCollapsed(unit.id);
                    }}
                    onAddLesson={() => {
                      expandUnit(unit.id);
                      void createLesson(unit.id);
                    }}
                    onOpenSettings={() => {
                      setFailed(false);
                      setSettingsUnitId(unit.id);
                    }}
                    onOpenLesson={onOpenLesson}
                    onOpenLessonSettings={(lessonId) => {
                      setFailed(false);
                      setSettingsLessonId(lessonId);
                    }}
                  />
                );
              })}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeLesson ? (
              <div className={[styles.orderedRow, styles.dragOverlay].join(" ")}>
                <span className={styles.reorderHandle}>
                  <Icon name="grip" size={18} />
                </span>
                <span className={styles.orderIndex} />
                <span className={styles.orderedMain}>
                  <span className={styles.rowTitle}>{activeLesson.title}</span>
                  <span className={styles.rowDetail}>
                    {format(t.parts, { count: activeLesson.parts.length })}
                  </span>
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
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

      {settingsLesson ? (
        <Modal
          label={t.lessonSettingsLabel}
          onClose={() => {
            setSettingsLessonId(null);
          }}
        >
          <div className={styles.dialogHeader}>
            <h2 className={styles.dialogTitle}>{t.lessonSettingsLabel}</h2>
          </div>
          <div className={styles.dialogBody}>
            <Field label={t.lessonTitleLabel}>
              <TextInput
                key={`lesson-name-${settingsLesson.id}`}
                defaultValue={settingsLesson.title}
                autoComplete="off"
                onBlur={(event) => {
                  renameLesson(settingsLesson, event.currentTarget.value);
                }}
              />
            </Field>
          </div>
          <div className={styles.dialogActions}>
            <Button
              variant="danger"
              onClick={() => {
                void removeLesson(settingsLesson);
              }}
            >
              {t.deleteLesson}
            </Button>
            <span className={styles.barSpacer} />
            <Button
              onClick={() => {
                setSettingsLessonId(null);
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
