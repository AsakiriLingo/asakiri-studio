import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
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
import { ContextMenu } from "@base-ui/react/context-menu";
import { Dialog } from "@base-ui/react/dialog";
import type { Course, Lesson, OutlineSection, Part, PartKind } from "@core/course";
import { PART_KINDS, partKind } from "@core/course";
import type { ProjectWriteResult } from "@core/project-writing";
import { useFormat, useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { useConfirm } from "@shared/components/confirm-dialog";
import { Field, TextInput } from "@shared/components/form";
import { Icon, type IconName } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { Status } from "@shared/components/status";
import { WorkInner } from "@shared/components/work-surface";
import styles from "@features/course-structure/CourseStructure.module.css";

const LARGE_LESSON_COUNT = 40;
const LARGE_PART_COUNT = 400;

function orderLabel(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function chevronClass(collapsed: boolean): string {
  return [styles.unitChevron, collapsed ? styles.chevronCollapsed : ""].filter(Boolean).join(" ");
}

function partIconName(part: Part): IconName {
  switch (partKind(part.content)) {
    case "rich-text":
    case "unknown":
      return "file-text";
    case "speak":
      return "mic";
    case "listen":
      return "headphones";
    default:
      return "dumbbell";
  }
}

interface OutlineResultLesson {
  readonly lesson: Lesson;
  readonly parts: readonly Part[];
}

interface OutlineResultUnit {
  readonly section: OutlineSection;
  readonly lessons: readonly OutlineResultLesson[];
}

function OutlineResults({
  course,
  lessonById,
  query,
  selectedId,
  onOpenPart,
}: {
  readonly course: Course;
  readonly lessonById: ReadonlyMap<string, Lesson>;
  readonly query: string;
  readonly selectedId?: string | undefined;
  readonly onOpenPart?: ((lessonId: string, partId: string) => void) | undefined;
}) {
  const messages = useMessages();
  const needle = query.trim().toLowerCase();
  const hit = (title: string) => title.toLowerCase().includes(needle);

  const groups = course.outline
    .map((section): OutlineResultUnit | null => {
      const unitHit = hit(section.title);
      const lessons = section.lessonIds
        .map((id) => lessonById.get(id))
        .filter((lesson): lesson is Lesson => lesson !== undefined)
        .map((lesson): OutlineResultLesson | null => {
          const lessonHit = hit(lesson.title);
          const parts = lessonHit ? lesson.parts : lesson.parts.filter((part) => hit(part.title));
          return lessonHit || parts.length > 0 ? { lesson, parts } : null;
        })
        .filter((entry): entry is OutlineResultLesson => entry !== null);
      return unitHit || lessons.length > 0 ? { section, lessons } : null;
    })
    .filter((group): group is OutlineResultUnit => group !== null);

  if (groups.length === 0) {
    return <p className={styles.empty}>{messages.common.noResults}</p>;
  }

  return (
    <div className={styles.results}>
      {groups.map((group) => (
        <div key={group.section.id} className={styles.resultUnit}>
          <span className={styles.resultUnitTitle}>{group.section.title}</span>
          {group.lessons.map((entry) => (
            <div key={entry.lesson.id} className={styles.resultLesson}>
              <span className={styles.resultLessonTitle}>{entry.lesson.title}</span>
              {entry.parts.map((part) => (
                <button
                  key={part.id}
                  type="button"
                  className={[
                    styles.resultPart,
                    part.id === selectedId ? styles.resultPartActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onOpenPart?.(entry.lesson.id, part.id)}
                >
                  <Icon
                    className={styles.typeIcon}
                    name={partIconName(part)}
                    size={16}
                    aria-hidden="true"
                  />
                  <span className={styles.rowTitle}>{part.title}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function RenameInput({
  defaultValue,
  ariaLabel,
  onCommit,
  onCancel,
}: {
  readonly defaultValue: string;
  readonly ariaLabel: string;
  readonly onCommit: (value: string) => void;
  readonly onCancel: () => void;
}) {
  return (
    <input
      className={styles.renameInput}
      defaultValue={defaultValue}
      aria-label={ariaLabel}
      autoComplete="off"
      autoFocus
      onFocus={(event) => {
        event.currentTarget.select();
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit(event.currentTarget.value);
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      onBlur={(event) => {
        onCommit(event.currentTarget.value);
      }}
    />
  );
}

function RowMenu({
  trigger,
  onRename,
  onDelete,
}: {
  readonly trigger: ReactElement;
  readonly onRename: () => void;
  readonly onDelete: () => void;
}) {
  const messages = useMessages();
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={trigger} />
      <ContextMenu.Portal>
        <ContextMenu.Positioner className={styles.menuPositioner}>
          <ContextMenu.Popup className={styles.menuPopup}>
            <ContextMenu.Item className={styles.menuItem} onClick={onRename}>
              {messages.common.rename}
            </ContextMenu.Item>
            <ContextMenu.Item
              className={[styles.menuItem, styles.menuItemDanger].join(" ")}
              onClick={onDelete}
            >
              {messages.common.delete}
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

const LessonRow = memo(function LessonRow({
  lesson,
  index,
  variant,
  selectedPartId,
  collapseParts,
  onOpenSettings,
  onOpenPart,
  onRename,
  onRequestDelete,
  onRenamePart,
  onRequestDeletePart,
  onReorderParts,
  onRequestAddPart,
}: {
  readonly lesson: Lesson;
  readonly index: number;
  readonly variant: "page" | "sidebar";
  readonly selectedPartId?: string | undefined;
  readonly collapseParts: boolean;
  readonly onOpenSettings: (lessonId: string) => void;
  readonly onOpenPart: (lessonId: string, partId: string) => void;
  readonly onRename: (lesson: Lesson, title: string) => void;
  readonly onRequestDelete: (lesson: Lesson) => void;
  readonly onRenamePart: (lesson: Lesson, part: Part, title: string) => void;
  readonly onRequestDeletePart: (lesson: Lesson, part: Part) => void;
  readonly onReorderParts?:
    | ((lessonId: string, orderedPartIds: readonly string[]) => Promise<ProjectWriteResult>)
    | undefined;
  readonly onRequestAddPart?: ((lessonId: string) => void) | undefined;
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
  const containsSelected =
    selectedPartId !== undefined && lesson.parts.some((part) => part.id === selectedPartId);
  const [partsCollapsed, setPartsCollapsed] = useState(() => collapseParts && !containsSelected);
  const [wasSelected, setWasSelected] = useState(containsSelected);
  const [editing, setEditing] = useState(false);

  if (containsSelected !== wasSelected) {
    setWasSelected(containsSelected);
    if (containsSelected) setPartsCollapsed(false);
  }

  const handleOpenSettings = useCallback(() => {
    onOpenSettings(lesson.id);
  }, [onOpenSettings, lesson.id]);
  const handleRename = useCallback(
    (title: string) => {
      onRename(lesson, title);
    },
    [onRename, lesson],
  );
  const handleRequestDelete = useCallback(() => {
    onRequestDelete(lesson);
  }, [onRequestDelete, lesson]);
  const handleOpenPart = useCallback(
    (partId: string) => {
      onOpenPart(lesson.id, partId);
    },
    [onOpenPart, lesson.id],
  );
  const handleRenamePart = useCallback(
    (part: Part, title: string) => {
      onRenamePart(lesson, part, title);
    },
    [onRenamePart, lesson],
  );
  const handleRequestDeletePart = useCallback(
    (part: Part) => {
      onRequestDeletePart(lesson, part);
    },
    [onRequestDeletePart, lesson],
  );
  const handleRequestAddPart = useCallback(() => {
    onRequestAddPart?.(lesson.id);
  }, [onRequestAddPart, lesson.id]);

  if (variant === "sidebar") {
    const hasParts = lesson.parts.length > 0;
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={[styles.lessonNode, isDragging ? styles.dragging : ""].filter(Boolean).join(" ")}
      >
        <RowMenu
          onRename={() => {
            setEditing(true);
          }}
          onDelete={handleRequestDelete}
          trigger={
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
              {editing ? (
                <RenameInput
                  defaultValue={lesson.title}
                  ariaLabel={t.lessonTitleLabel}
                  onCommit={(value) => {
                    setEditing(false);
                    handleRename(value);
                  }}
                  onCancel={() => {
                    setEditing(false);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className={styles.treeMain}
                  onClick={() => {
                    setPartsCollapsed((value) => !value);
                  }}
                  onDoubleClick={() => {
                    setEditing(true);
                  }}
                >
                  <span className={styles.rowTitle}>{lesson.title}</span>
                </button>
              )}
              {onRequestAddPart ? (
                <IconButton
                  className={styles.rowAction}
                  aria-label={messages.lesson.addPartTitle}
                  onClick={handleRequestAddPart}
                >
                  <Icon name="plus" size={16} />
                </IconButton>
              ) : null}
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
          }
        />
        {hasParts && !partsCollapsed ? (
          <PartList
            lesson={lesson}
            selectedPartId={selectedPartId}
            onOpenPart={handleOpenPart}
            onReorderParts={onReorderParts}
            onRenamePart={handleRenamePart}
            onRequestDeletePart={handleRequestDeletePart}
          />
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
      <button type="button" className={styles.orderedMain}>
        <span className={styles.rowTitle}>{lesson.title}</span>
        <span className={styles.rowDetail}>{format(t.parts, { count: lesson.parts.length })}</span>
      </button>
      <IconButton
        aria-label={format(t.lessonSettings, { lesson: lesson.title })}
        onClick={handleOpenSettings}
      >
        <Icon name="edit" size={18} />
      </IconButton>
    </div>
  );
});

function useReorderSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

const SortablePartRow = memo(function SortablePartRow({
  part,
  selected,
  reorderable,
  onOpen,
  onRename,
  onRequestDelete,
}: {
  readonly part: Part;
  readonly selected: boolean;
  readonly reorderable: boolean;
  readonly onOpen: (partId: string) => void;
  readonly onRename: (part: Part, title: string) => void;
  readonly onRequestDelete: (part: Part) => void;
}) {
  const messages = useMessages();
  const format = useFormat();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: part.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const [editing, setEditing] = useState(false);
  const handleOpen = useCallback(() => {
    onOpen(part.id);
  }, [onOpen, part.id]);
  const handleRequestDelete = useCallback(() => {
    onRequestDelete(part);
  }, [onRequestDelete, part]);

  return (
    <div ref={setNodeRef} style={style}>
      <RowMenu
        onRename={() => {
          setEditing(true);
        }}
        onDelete={handleRequestDelete}
        trigger={
          <div
            className={[
              styles.treeRow,
              selected ? styles.active : "",
              isDragging ? styles.dragging : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className={styles.disclosureSpacer} aria-hidden="true" />
            <Icon
              className={styles.typeIcon}
              name={partIconName(part)}
              size={16}
              aria-hidden="true"
            />
            {editing ? (
              <RenameInput
                defaultValue={part.title}
                ariaLabel={messages.lesson.partTitleLabel}
                onCommit={(value) => {
                  setEditing(false);
                  onRename(part, value);
                }}
                onCancel={() => {
                  setEditing(false);
                }}
              />
            ) : (
              <button
                type="button"
                className={styles.treeMain}
                aria-current={selected ? "page" : undefined}
                onClick={handleOpen}
                onDoubleClick={() => {
                  setEditing(true);
                }}
              >
                <span className={styles.rowTitle}>{part.title}</span>
              </button>
            )}
            {reorderable ? (
              <button
                type="button"
                className={styles.dragHandle}
                aria-label={format(messages.common.reorder, { label: part.title })}
                {...attributes}
                {...listeners}
              >
                <Icon name="grip" size={16} />
              </button>
            ) : null}
          </div>
        }
      />
    </div>
  );
});

function PartList({
  lesson,
  selectedPartId,
  onOpenPart,
  onReorderParts,
  onRenamePart,
  onRequestDeletePart,
}: {
  readonly lesson: Lesson;
  readonly selectedPartId?: string | undefined;
  readonly onOpenPart: (partId: string) => void;
  readonly onReorderParts?:
    | ((lessonId: string, orderedPartIds: readonly string[]) => Promise<ProjectWriteResult>)
    | undefined;
  readonly onRenamePart: (part: Part, title: string) => void;
  readonly onRequestDeletePart: (part: Part) => void;
}) {
  const sensors = useReorderSensors();
  const ids = lesson.parts.map((part) => part.id);
  const reorderable = onReorderParts !== undefined;

  const handleDragEnd = (event: DragEndEvent) => {
    if (!onReorderParts) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    void onReorderParts(lesson.id, arrayMove([...ids], from, to));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={styles.partList}>
          {lesson.parts.map((part) => (
            <SortablePartRow
              key={part.id}
              part={part}
              selected={part.id === selectedPartId}
              reorderable={reorderable}
              onOpen={onOpenPart}
              onRename={onRenamePart}
              onRequestDelete={onRequestDeletePart}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

const UnitBlock = memo(function UnitBlock({
  unit,
  index,
  lessons,
  collapsed,
  addingLesson,
  variant,
  selectedPartId,
  collapseParts,
  onToggleCollapsed,
  onAddLesson,
  onOpenSettings,
  onRename,
  onRequestDelete,
  onOpenPart,
  onOpenLessonSettings,
  onRenameLesson,
  onRequestDeleteLesson,
  onRenamePart,
  onRequestDeletePart,
  onReorderParts,
  onRequestAddPart,
}: {
  readonly unit: OutlineSection;
  readonly index: number;
  readonly lessons: readonly Lesson[];
  readonly collapsed: boolean;
  readonly addingLesson: boolean;
  readonly variant: "page" | "sidebar";
  readonly selectedPartId?: string | undefined;
  readonly collapseParts: boolean;
  readonly onToggleCollapsed: (unitId: string) => void;
  readonly onAddLesson: (unitId: string) => void;
  readonly onOpenSettings: (unitId: string) => void;
  readonly onRename: (unit: OutlineSection, title: string) => void;
  readonly onRequestDelete: (unit: OutlineSection) => void;
  readonly onOpenPart: (lessonId: string, partId: string) => void;
  readonly onOpenLessonSettings: (lessonId: string) => void;
  readonly onRenameLesson: (lesson: Lesson, title: string) => void;
  readonly onRequestDeleteLesson: (lesson: Lesson) => void;
  readonly onRenamePart: (lesson: Lesson, part: Part, title: string) => void;
  readonly onRequestDeletePart: (lesson: Lesson, part: Part) => void;
  readonly onReorderParts?:
    | ((lessonId: string, orderedPartIds: readonly string[]) => Promise<ProjectWriteResult>)
    | undefined;
  readonly onRequestAddPart?: ((lessonId: string) => void) | undefined;
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
  const [editing, setEditing] = useState(false);

  const handleToggleCollapsed = useCallback(() => {
    onToggleCollapsed(unit.id);
  }, [onToggleCollapsed, unit.id]);
  const handleAddLesson = useCallback(() => {
    onAddLesson(unit.id);
  }, [onAddLesson, unit.id]);
  const handleOpenSettings = useCallback(() => {
    onOpenSettings(unit.id);
  }, [onOpenSettings, unit.id]);
  const handleRequestDelete = useCallback(() => {
    onRequestDelete(unit);
  }, [onRequestDelete, unit]);

  const commitRename = (value: string) => {
    setEditing(false);
    onRename(unit, value);
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={[styles.unitBlock, isDragging ? styles.dragging : ""].filter(Boolean).join(" ")}
    >
      {sidebar ? (
        <ContextMenu.Root>
          <ContextMenu.Trigger
            render={
              <header className={styles.unitHeader}>
                <button
                  type="button"
                  className={styles.disclosure}
                  aria-expanded={!collapsed}
                  aria-controls={lessonsId}
                  aria-label={
                    collapsed
                      ? format(t.expandUnit, { unit: unit.title })
                      : format(t.collapseUnit, { unit: unit.title })
                  }
                  onClick={handleToggleCollapsed}
                >
                  <Icon
                    aria-hidden="true"
                    className={chevronClass(collapsed)}
                    name="chevron-down"
                    size={16}
                  />
                </button>
                <Icon className={styles.typeIcon} name="folder" size={16} aria-hidden="true" />
                {editing ? (
                  <input
                    className={styles.renameInput}
                    defaultValue={unit.title}
                    aria-label={t.unitTitleLabel}
                    autoComplete="off"
                    autoFocus
                    onFocus={(event) => {
                      event.currentTarget.select();
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitRename(event.currentTarget.value);
                      } else if (event.key === "Escape") {
                        event.preventDefault();
                        setEditing(false);
                      }
                    }}
                    onBlur={(event) => {
                      commitRename(event.currentTarget.value);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className={styles.treeMain}
                    onClick={handleToggleCollapsed}
                    onDoubleClick={() => {
                      setEditing(true);
                    }}
                  >
                    <span className={styles.unitName}>{unit.title}</span>
                  </button>
                )}
                <div className={styles.unitActions}>
                  <IconButton
                    aria-label={t.addLesson}
                    disabled={addingLesson}
                    onClick={handleAddLesson}
                  >
                    <Icon name="plus" size={18} />
                  </IconButton>
                </div>
                <button
                  type="button"
                  className={styles.reorderHandle}
                  aria-label={format(messages.common.reorder, { label: unit.title })}
                  {...attributes}
                  {...listeners}
                >
                  <Icon name="grip" size={16} />
                </button>
              </header>
            }
          />
          <ContextMenu.Portal>
            <ContextMenu.Positioner className={styles.menuPositioner}>
              <ContextMenu.Popup className={styles.menuPopup}>
                <ContextMenu.Item
                  className={styles.menuItem}
                  onClick={() => {
                    setEditing(true);
                  }}
                >
                  {messages.common.rename}
                </ContextMenu.Item>
                <ContextMenu.Item
                  className={[styles.menuItem, styles.menuItemDanger].join(" ")}
                  onClick={handleRequestDelete}
                >
                  {messages.common.delete}
                </ContextMenu.Item>
              </ContextMenu.Popup>
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        </ContextMenu.Root>
      ) : (
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
          <span className={[styles.orderIndex, styles.unitIndex].join(" ")}>
            {orderLabel(index)}
          </span>
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
            onClick={handleToggleCollapsed}
          >
            <Icon
              aria-hidden="true"
              className={chevronClass(collapsed)}
              name="chevron-down"
              size={18}
            />
            <span className={styles.unitHeading}>
              <span className={styles.unitName}>{unit.title}</span>
              <span className={styles.rowDetail}>
                {format(t.unitLessons, { count: lessons.length })}
              </span>
            </span>
          </button>
          <div className={styles.unitActions}>
            <Button variant="ghost" disabled={addingLesson} onClick={handleAddLesson}>
              <Icon name="plus" size={18} />
              {t.addLesson}
            </Button>
            <IconButton
              aria-label={format(t.unitSettings, { unit: unit.title })}
              onClick={handleOpenSettings}
            >
              <Icon name="edit" size={18} />
            </IconButton>
          </div>
        </header>
      )}

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
                selectedPartId={selectedPartId}
                collapseParts={collapseParts}
                onOpenSettings={onOpenLessonSettings}
                onOpenPart={onOpenPart}
                onRename={onRenameLesson}
                onRequestDelete={onRequestDeleteLesson}
                onRenamePart={onRenamePart}
                onRequestDeletePart={onRequestDeletePart}
                onReorderParts={onReorderParts}
                onRequestAddPart={onRequestAddPart}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </article>
  );
});

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
    <Dialog.Root
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.overlay} />
        <Dialog.Popup className={styles.dialog}>
          <div className={styles.dialogHeader}>
            <Dialog.Title className={styles.dialogTitle}>{label}</Dialog.Title>
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
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
  readonly onOpenPart?: ((lessonId: string, partId: string) => void) | undefined;
  readonly selectedId?: string | undefined;
  readonly onReorderParts?:
    | ((lessonId: string, orderedPartIds: readonly string[]) => Promise<ProjectWriteResult>)
    | undefined;
  readonly onAddPart?: ((lessonId: string, kind: PartKind) => void) | undefined;
  readonly onRenamePart?:
    ((lessonId: string, partId: string, title: string) => Promise<ProjectWriteResult>) | undefined;
  readonly onDeletePart?:
    ((lessonId: string, partId: string) => Promise<ProjectWriteResult>) | undefined;
  readonly query?: string;
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
  onOpenPart,
  selectedId,
  onReorderParts,
  onAddPart,
  onRenamePart,
  onDeletePart,
  query = "",
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
  const [addingPartLessonId, setAddingPartLessonId] = useState<string | null>(null);
  const [collapsedUnitIds, setCollapsedUnitIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  const toggleUnitCollapsed = useCallback((unitId: string) => {
    setCollapsedUnitIds((current) => {
      const next = new Set(current);
      if (!next.delete(unitId)) next.add(unitId);
      return next;
    });
  }, []);

  const expandUnit = useCallback((unitId: string) => {
    setCollapsedUnitIds((current) => {
      if (!current.has(unitId)) return current;
      const next = new Set(current);
      next.delete(unitId);
      return next;
    });
  }, []);

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

  const report = useCallback((result: ProjectWriteResult) => {
    setFailed(result.status !== "saved");
  }, []);

  const reorderPartsWithReport = useMemo(() => {
    if (!onReorderParts) return undefined;
    return (lessonId: string, orderedPartIds: readonly string[]) =>
      onReorderParts(lessonId, orderedPartIds).then((result) => {
        report(result);
        return result;
      });
  }, [onReorderParts, report]);

  const createUnit = useCallback(async () => {
    setCreating(true);
    setFailed(false);
    const result = await onNewUnit();
    setCreating(false);
    report(result);
  }, [onNewUnit, report]);

  const renameUnit = useCallback(
    (unit: OutlineSection, title: string) => {
      const next = title.trim();
      if (next === "" || next === unit.title) return;
      setFailed(false);
      void onRenameUnit(unit.id, next).then(report);
    },
    [onRenameUnit, report],
  );

  const removeUnit = useCallback(
    async (unit: OutlineSection) => {
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
    },
    [confirm, t, format, onDeleteUnit, report],
  );

  const requestDeleteUnit = useCallback(
    (unit: OutlineSection) => {
      void removeUnit(unit);
    },
    [removeUnit],
  );

  const lessonById = useMemo(
    () => new Map<string, Lesson>(course.lessons.map((lesson) => [lesson.id, lesson])),
    [course.lessons],
  );

  const settingsLesson =
    settingsLessonId === null ? null : (lessonById.get(settingsLessonId) ?? null);

  const createLesson = useCallback(
    async (unitId: string) => {
      setAddingUnitId(unitId);
      setFailed(false);
      const result = await onAddLesson(unitId);
      setAddingUnitId(null);
      report(result);
    },
    [onAddLesson, report],
  );

  const renameLesson = useCallback(
    (lesson: Lesson, title: string) => {
      const next = title.trim();
      if (next === "" || next === lesson.title) return;
      setFailed(false);
      void onRenameLesson(lesson.id, next).then(report);
    },
    [onRenameLesson, report],
  );

  const removeLesson = useCallback(
    async (lesson: Lesson) => {
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
    },
    [confirm, t, format, onDeleteLesson, report],
  );

  const requestDeleteLesson = useCallback(
    (lesson: Lesson) => {
      void removeLesson(lesson);
    },
    [removeLesson],
  );

  const renamePart = useCallback(
    (lesson: Lesson, part: Part, title: string) => {
      const next = title.trim();
      if (next === "" || next === part.title || !onRenamePart) return;
      setFailed(false);
      void onRenamePart(lesson.id, part.id, next).then(report);
    },
    [onRenamePart, report],
  );

  const removePart = useCallback(
    async (lesson: Lesson, part: Part) => {
      if (!onDeletePart) return;
      const ok = await confirm({
        title: messages.lesson.confirmDeletePartTitle,
        description: format(messages.lesson.confirmDeletePartBody, { title: part.title }),
        confirmLabel: messages.lesson.deletePart,
        tone: "danger",
      });
      if (!ok) return;
      setFailed(false);
      report(await onDeletePart(lesson.id, part.id));
    },
    [onDeletePart, confirm, messages, format, report],
  );

  const requestDeletePart = useCallback(
    (lesson: Lesson, part: Part) => {
      void removePart(lesson, part);
    },
    [removePart],
  );

  const handleAddLesson = useCallback(
    (unitId: string) => {
      expandUnit(unitId);
      void createLesson(unitId);
    },
    [expandUnit, createLesson],
  );

  const openUnitSettings = useCallback((unitId: string) => {
    setFailed(false);
    setSettingsUnitId(unitId);
  }, []);

  const openLessonSettings = useCallback((lessonId: string) => {
    setFailed(false);
    setSettingsLessonId(lessonId);
  }, []);

  const handleOpenPart = useCallback(
    (lessonId: string, partId: string) => {
      onOpenPart?.(lessonId, partId);
    },
    [onOpenPart],
  );

  const requestAddPart = useCallback((lessonId: string) => {
    setAddingPartLessonId(lessonId);
  }, []);

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
    void onReorderOutline(next).then((result) => {
      report(result);
      if (result.status !== "saved") {
        setSyncedOutline(course.outline);
        setLayout(outlineToLayout(course.outline));
      }
    });
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

  const collapsePartsByDefault = useMemo(() => {
    if (course.lessons.length > LARGE_LESSON_COUNT) return true;
    let parts = 0;
    for (const lesson of course.lessons) {
      parts += lesson.parts.length;
      if (parts > LARGE_PART_COUNT) return true;
    }
    return false;
  }, [course.lessons]);

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
                size="sm"
                aria-label={allCollapsed ? t.expandAll : t.collapseAll}
                onClick={toggleAllUnits}
              >
                <Icon name={allCollapsed ? "arrows-expand" : "minimize"} size={18} />
              </IconButton>
            ) : null}
            <IconButton
              size="sm"
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
            {failed ? <Status tone="error">{messages.common.saveFailed}</Status> : null}
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

      {query.trim() !== "" ? (
        <OutlineResults
          course={course}
          lessonById={lessonById}
          query={query}
          selectedId={selectedId}
          onOpenPart={onOpenPart}
        />
      ) : course.outline.length === 0 ? (
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
                    selectedPartId={selectedId}
                    collapseParts={collapsePartsByDefault}
                    onToggleCollapsed={toggleUnitCollapsed}
                    onAddLesson={handleAddLesson}
                    onOpenSettings={openUnitSettings}
                    onRename={renameUnit}
                    onRequestDelete={requestDeleteUnit}
                    onOpenPart={handleOpenPart}
                    onOpenLessonSettings={openLessonSettings}
                    onRenameLesson={renameLesson}
                    onRequestDeleteLesson={requestDeleteLesson}
                    onRenamePart={renamePart}
                    onRequestDeletePart={requestDeletePart}
                    onReorderParts={reorderPartsWithReport}
                    onRequestAddPart={onAddPart ? requestAddPart : undefined}
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

      {onAddPart && addingPartLessonId !== null ? (
        <Modal
          label={messages.lesson.addPartTitle}
          onClose={() => {
            setAddingPartLessonId(null);
          }}
        >
          <div className={styles.dialogBody}>
            <div className={styles.typeList}>
              {PART_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={styles.typeOption}
                  onClick={() => {
                    onAddPart(addingPartLessonId, kind);
                    setAddingPartLessonId(null);
                  }}
                >
                  {messages.lesson.kind[kind]}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      ) : null}
    </WorkInner>
  );
}
