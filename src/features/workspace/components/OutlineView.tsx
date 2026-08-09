import type { Lesson, LessonType, OutlineSection } from "@core/course";
import styles from "@features/workspace/components/OutlineView.module.css";

export interface OutlineMessages {
  readonly empty: string;
  readonly lessonTypes: Readonly<Record<LessonType, string>>;
}

interface OutlineViewProps {
  readonly outline: readonly OutlineSection[];
  readonly lessons: readonly Lesson[];
  readonly messages: OutlineMessages;
}

function formatOrder(position: number): string {
  return String(position).padStart(2, "0");
}

export function OutlineView({ outline, lessons, messages }: OutlineViewProps) {
  const lessonsById = new Map<string, Lesson>(lessons.map((lesson) => [lesson.id, lesson]));

  if (outline.length === 0) {
    return (
      <div className={styles.empty}>
        <p>{messages.empty}</p>
      </div>
    );
  }

  return (
    <div className={styles.outline}>
      {outline.map((section, sectionIndex) => (
        <section
          className={styles.unit}
          key={section.id}
          aria-labelledby={`outline-unit-${section.id}`}
        >
          <header className={styles.unitHeader}>
            <span className={styles.orderIndex} aria-hidden="true">
              {formatOrder(sectionIndex + 1)}
            </span>
            <h3 className={styles.unitName} id={`outline-unit-${section.id}`}>
              {section.title}
            </h3>
          </header>

          <ol className={styles.lessonList}>
            {section.lessonIds.map((lessonId, lessonIndex) => {
              const lesson = lessonsById.get(lessonId);
              return (
                <li className={styles.lesson} key={lessonId}>
                  <span className={styles.orderIndex} aria-hidden="true">
                    {formatOrder(lessonIndex + 1)}
                  </span>
                  <span className={styles.lessonTitle}>{lesson ? lesson.title : lessonId}</span>
                  {lesson && (
                    <span className={styles.lessonType}>{messages.lessonTypes[lesson.type]}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
