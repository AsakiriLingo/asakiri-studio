import type { Lesson, OutlineSection } from "@core/course";
import type { ProjectWriteResult } from "@core/project-writing";
import { formatMessage, getMessages, type Locale } from "@shared/i18n";
import type { AppServices } from "@app/services";
import { WRITE_UNAVAILABLE } from "@app/course-state";
import type { CourseStateStore } from "@app/useCourseState";

export interface OutlineActions {
  readonly addUnit: () => Promise<ProjectWriteResult>;
  readonly renameUnit: (unitId: string, title: string) => Promise<ProjectWriteResult>;
  readonly deleteUnit: (unitId: string) => Promise<ProjectWriteResult>;
  readonly addLesson: (unitId: string) => Promise<ProjectWriteResult>;
  readonly renameLesson: (lessonId: string, title: string) => Promise<ProjectWriteResult>;
  readonly deleteLesson: (lessonId: string) => Promise<ProjectWriteResult>;
  readonly reorderOutline: (
    sections: readonly { readonly id: string; readonly lessonIds: readonly string[] }[],
  ) => Promise<ProjectWriteResult>;
}

export function useOutlineActions(
  services: AppServices,
  store: CourseStateStore,
  locale: Locale,
  onLessonDeleted: (lessonId: string) => void,
): OutlineActions {
  const messages = getMessages(locale);

  const addUnit = (): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, apply }) => {
      const unit: OutlineSection = {
        id: `unit_${crypto.randomUUID()}`,
        title: formatMessage(locale, messages.structure.defaultUnitTitle, {
          order: course.outline.length + 1,
        }),
        lessonIds: [],
      };
      const nextOutline = [...course.outline, unit];
      const result = await services.writer.updateOutline(session, nextOutline);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: { ...current.course, outline: nextOutline },
        }));
      }
      return result;
    });

  const renameUnit = (unitId: string, title: string): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, apply }) => {
      const nextOutline = course.outline.map((section) =>
        section.id === unitId ? { ...section, title } : section,
      );
      const result = await services.writer.updateOutline(session, nextOutline);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: { ...current.course, outline: nextOutline },
        }));
      }
      return result;
    });

  const deleteUnit = (unitId: string): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, apply }) => {
      const nextOutline = course.outline.filter((section) => section.id !== unitId);
      const result = await services.writer.updateOutline(session, nextOutline);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: { ...current.course, outline: nextOutline },
        }));
      }
      return result;
    });

  const addLesson = (unitId: string): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, apply }) => {
      const unit = course.outline.find((section) => section.id === unitId);
      if (!unit) {
        return WRITE_UNAVAILABLE;
      }
      const lessonId = `lesson_${crypto.randomUUID()}`;
      const lessonPath = `lessons/${lessonId}/lesson.json`;
      const lesson: Lesson = {
        id: lessonId,
        title: formatMessage(locale, messages.structure.defaultLessonTitle, {
          order: unit.lessonIds.length + 1,
        }),
        parts: [],
      };
      const nextOutline = course.outline.map((section) =>
        section.id === unitId
          ? { ...section, lessonIds: [...section.lessonIds, lessonId] }
          : section,
      );
      const result = await services.writer.createLesson(session, lessonPath, lesson, nextOutline);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            lessons: [...current.course.lessons, lesson],
            outline: nextOutline,
          },
          sources: {
            ...current.sources,
            lessons: { ...current.sources.lessons, [lessonId]: lessonPath },
          },
        }));
      }
      return result;
    });

  const renameLesson = (lessonId: string, title: string): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, sources, apply }) => {
      const lessonPath = sources.lessons[lessonId];
      const lesson = course.lessons.find((entry) => entry.id === lessonId);
      if (lessonPath === undefined || !lesson) {
        return WRITE_UNAVAILABLE;
      }
      const nextLesson: Lesson = { ...lesson, title };
      const result = await services.writer.updateLesson(session, lessonPath, nextLesson);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            lessons: current.course.lessons.map((entry) =>
              entry.id === lessonId ? nextLesson : entry,
            ),
          },
        }));
      }
      return result;
    });

  const deleteLesson = (lessonId: string): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, sources, apply }) => {
      const lessonPath = sources.lessons[lessonId];
      const lesson = course.lessons.find((entry) => entry.id === lessonId);
      if (lessonPath === undefined || !lesson) {
        return WRITE_UNAVAILABLE;
      }
      const nextOutline = course.outline.map((section) => ({
        ...section,
        lessonIds: section.lessonIds.filter((id) => id !== lessonId),
      }));
      const result = await services.writer.deleteLesson(session, lessonPath, nextOutline);
      if (result.status === "saved") {
        onLessonDeleted(lessonId);
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            lessons: current.course.lessons.filter((entry) => entry.id !== lessonId),
            outline: nextOutline,
          },
          sources: {
            ...current.sources,
            lessons: Object.fromEntries(
              Object.entries(current.sources.lessons).filter(([id]) => id !== lessonId),
            ),
            parts: Object.fromEntries(
              Object.entries(current.sources.parts).filter(
                ([key]) => !key.startsWith(`${lessonId}::`),
              ),
            ),
          },
        }));
      }
      return result;
    });

  const reorderOutline = (
    sections: readonly { readonly id: string; readonly lessonIds: readonly string[] }[],
  ): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, apply }) => {
      const byId = new Map(course.outline.map((section) => [section.id, section]));
      const nextOutline: OutlineSection[] = [];
      for (const section of sections) {
        const existing = byId.get(section.id);
        if (existing) nextOutline.push({ ...existing, lessonIds: [...section.lessonIds] });
      }
      const result = await services.writer.updateOutline(session, nextOutline);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: { ...current.course, outline: nextOutline },
        }));
      }
      return result;
    });

  return { addUnit, renameUnit, deleteUnit, addLesson, renameLesson, deleteLesson, reorderOutline };
}
