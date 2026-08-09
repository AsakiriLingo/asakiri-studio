import { useMemo } from "react";
import type { Course, Lesson } from "@core/course";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Icon } from "@shared/components/icon";
import { WorkHeader, WorkInner } from "@shared/components/work-surface";
import styles from "@features/course-structure/CourseStructure.module.css";

function orderLabel(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export interface CourseStructureProps {
  readonly course: Course;
  readonly onOpenLesson: (lessonId: string) => void;
}

export function CourseStructure({ course, onOpenLesson }: CourseStructureProps) {
  const messages = useMessages();
  const t = messages.structure;
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
          <Button>
            <Icon name="plus" size={18} />
            {t.newUnit}
          </Button>
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
                  <Button variant="ghost" className={styles.addLesson}>
                    <Icon name="plus" size={18} />
                    {t.addLesson}
                  </Button>
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
    </WorkInner>
  );
}
