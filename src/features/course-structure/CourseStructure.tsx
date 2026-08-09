import { Button } from "@shared/components/button";
import { Icon } from "@shared/components/icon";
import { Tag, type TagVariant } from "@shared/components/tag";
import { WorkHeader, WorkInner } from "@shared/components/work-surface";
import styles from "@features/course-structure/CourseStructure.module.css";

interface LessonRow {
  readonly id: string;
  readonly title: string;
  readonly parts: number;
  readonly status: string;
  readonly statusVariant: TagVariant;
}

interface UnitRow {
  readonly id: string;
  readonly title: string;
  readonly lessons: readonly LessonRow[];
}

const UNITS: readonly UnitRow[] = [
  {
    id: "unit-getting-started",
    title: "Getting started",
    lessons: [
      {
        id: "lesson-welcome",
        title: "Welcome to Japanese",
        parts: 8,
        status: "Draft",
        statusVariant: "accent",
      },
      {
        id: "lesson-writing-systems",
        title: "Writing systems",
        parts: 3,
        status: "Draft",
        statusVariant: "default",
      },
    ],
  },
  {
    id: "unit-first-words",
    title: "First words",
    lessons: [
      {
        id: "lesson-everyday-nouns",
        title: "Everyday nouns",
        parts: 2,
        status: "Draft",
        statusVariant: "default",
      },
    ],
  },
];

function orderLabel(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function lessonCount(count: number): string {
  return count === 1 ? "1 lesson" : `${String(count)} lessons`;
}

function partCount(count: number): string {
  return count === 1 ? "1 part" : `${String(count)} parts`;
}

export interface CourseStructureProps {
  readonly onOpenLesson: (lessonId: string) => void;
}

export function CourseStructure({ onOpenLesson }: CourseStructureProps) {
  return (
    <WorkInner className={styles.inner}>
      <WorkHeader
        title="Course structure"
        description="Units contain lessons. Open a lesson to arrange its exercises, rich media, and other parts."
        actions={
          <Button>
            <Icon name="plus" size={18} />
            New unit
          </Button>
        }
      />

      <div className={styles.unitStack} aria-label="Course units">
        {UNITS.map((unit, unitIndex) => (
          <article key={unit.id} className={styles.unitBlock}>
            <header className={styles.unitHeader}>
              <button
                type="button"
                className={styles.reorderHandle}
                aria-label={`Reorder ${unit.title}. Use the up and down arrow keys.`}
              >
                <Icon name="grip" size={18} />
              </button>
              <span className={styles.orderIndex}>{orderLabel(unitIndex)}</span>
              <span>
                <span className={styles.unitName}>{unit.title}</span>
                <span className={styles.rowDetail}>Unit · {lessonCount(unit.lessons.length)}</span>
              </span>
              <Button variant="ghost" className={styles.addLesson}>
                <Icon name="plus" size={18} />
                Add lesson
              </Button>
            </header>

            <div className={styles.lessonOrder} aria-label={`Lessons in ${unit.title}`}>
              {unit.lessons.map((lesson, lessonIndex) => (
                <div key={lesson.id} className={styles.orderedRow}>
                  <button
                    type="button"
                    className={styles.reorderHandle}
                    aria-label={`Reorder ${lesson.title}. Use the up and down arrow keys.`}
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
                    <span className={styles.rowDetail}>{partCount(lesson.parts)}</span>
                  </button>
                  <Tag variant={lesson.statusVariant}>{lesson.status}</Tag>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </WorkInner>
  );
}
