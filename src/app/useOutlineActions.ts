import type { CourseSources, Lesson, OutlineSection, Part } from "@core/course";
import { partSourceKey } from "@core/course";
import type { DuplicatedLesson, DuplicatedPart, ProjectWriteResult } from "@core/project-writing";
import { formatMessage, getMessages, type Locale } from "@shared/i18n";
import type { AppServices } from "@app/services";
import { WRITE_UNAVAILABLE, type ReadyCourseState } from "@app/course-state";
import type { CourseStateStore } from "@app/useCourseState";

interface LessonPlan {
  readonly copy: DuplicatedLesson;
  readonly lesson: Lesson;
  readonly lessonSource: readonly [string, string];
  readonly partSources: readonly (readonly [string, string])[];
}

function insertAfter(ids: readonly string[], afterId: string, newId: string): string[] {
  const index = ids.indexOf(afterId);
  if (index === -1) return [...ids, newId];
  return [...ids.slice(0, index + 1), newId, ...ids.slice(index + 1)];
}

function planLessonDuplicate(
  sourceLesson: Lesson,
  sourceLessonPath: string,
  newTitle: string,
  sources: CourseSources,
): LessonPlan | null {
  const newLessonId = `lesson_${crypto.randomUUID()}`;
  const newLessonDir = `lessons/${newLessonId}`;
  const parts: DuplicatedPart[] = [];
  const newParts: Part[] = [];
  const partSources: (readonly [string, string])[] = [];
  for (const part of sourceLesson.parts) {
    const sourceBodyPath = sources.parts[partSourceKey(sourceLesson.id, part.id)];
    if (sourceBodyPath === undefined) return null;
    const newPartId = `part_${crypto.randomUUID()}`;
    const basename = sourceBodyPath.split("/").pop() ?? "body.json";
    const newBodyPath = `${newLessonDir}/parts/${newPartId}/${basename}`;
    parts.push({ newId: newPartId, sourceBodyPath, newBodyPath });
    newParts.push({ ...part, id: newPartId });
    partSources.push([partSourceKey(newLessonId, newPartId), newBodyPath]);
  }
  return {
    copy: {
      sourceLessonPath,
      newLessonPath: `${newLessonDir}/lesson.json`,
      newLessonId,
      newTitle,
      parts,
    },
    lesson: { id: newLessonId, title: newTitle, parts: newParts },
    lessonSource: [newLessonId, `${newLessonDir}/lesson.json`],
    partSources,
  };
}

function applyLessonPlans(
  current: ReadyCourseState,
  plans: readonly LessonPlan[],
  nextOutline: readonly OutlineSection[],
): ReadyCourseState {
  return {
    ...current,
    course: {
      ...current.course,
      lessons: [...current.course.lessons, ...plans.map((plan) => plan.lesson)],
      outline: nextOutline,
    },
    sources: {
      ...current.sources,
      lessons: {
        ...current.sources.lessons,
        ...Object.fromEntries(plans.map((plan) => plan.lessonSource)),
      },
      parts: {
        ...current.sources.parts,
        ...Object.fromEntries(plans.flatMap((plan) => plan.partSources)),
      },
    },
  };
}

export interface OutlineActions {
  readonly addUnit: () => Promise<ProjectWriteResult>;
  readonly renameUnit: (unitId: string, title: string) => Promise<ProjectWriteResult>;
  readonly deleteUnit: (unitId: string) => Promise<ProjectWriteResult>;
  readonly duplicateUnit: (unitId: string) => Promise<ProjectWriteResult>;
  readonly addLesson: (unitId: string) => Promise<ProjectWriteResult>;
  readonly renameLesson: (lessonId: string, title: string) => Promise<ProjectWriteResult>;
  readonly deleteLesson: (lessonId: string) => Promise<ProjectWriteResult>;
  readonly duplicateLesson: (lessonId: string) => Promise<ProjectWriteResult>;
  readonly moveLessonToUnit: (lessonId: string, unitId: string) => Promise<ProjectWriteResult>;
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

  const duplicateUnit = (unitId: string): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, sources, apply }) => {
      const unit = course.outline.find((section) => section.id === unitId);
      if (!unit) {
        return WRITE_UNAVAILABLE;
      }
      const plans: LessonPlan[] = [];
      for (const lessonId of unit.lessonIds) {
        const lesson = course.lessons.find((entry) => entry.id === lessonId);
        const sourceLessonPath = sources.lessons[lessonId];
        if (!lesson || sourceLessonPath === undefined) {
          return WRITE_UNAVAILABLE;
        }
        const plan = planLessonDuplicate(lesson, sourceLessonPath, lesson.title, sources);
        if (!plan) {
          return WRITE_UNAVAILABLE;
        }
        plans.push(plan);
      }
      const newSection: OutlineSection = {
        id: `unit_${crypto.randomUUID()}`,
        title: formatMessage(locale, messages.common.copyTitle, { title: unit.title }),
        lessonIds: plans.map((plan) => plan.lesson.id),
      };
      const index = course.outline.findIndex((section) => section.id === unitId);
      const nextOutline = [
        ...course.outline.slice(0, index + 1),
        newSection,
        ...course.outline.slice(index + 1),
      ];
      const result = await services.writer.duplicateLessons(
        session,
        plans.map((plan) => plan.copy),
        nextOutline,
      );
      if (result.status === "saved") {
        apply((current) => applyLessonPlans(current, plans, nextOutline));
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

  const duplicateLesson = (lessonId: string): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, sources, apply }) => {
      const lesson = course.lessons.find((entry) => entry.id === lessonId);
      const sourceLessonPath = sources.lessons[lessonId];
      if (!lesson || sourceLessonPath === undefined) {
        return WRITE_UNAVAILABLE;
      }
      const newTitle = formatMessage(locale, messages.common.copyTitle, { title: lesson.title });
      const plan = planLessonDuplicate(lesson, sourceLessonPath, newTitle, sources);
      if (!plan) {
        return WRITE_UNAVAILABLE;
      }
      const nextOutline = course.outline.map((section) =>
        section.lessonIds.includes(lessonId)
          ? { ...section, lessonIds: insertAfter(section.lessonIds, lessonId, plan.lesson.id) }
          : section,
      );
      const result = await services.writer.duplicateLessons(session, [plan.copy], nextOutline);
      if (result.status === "saved") {
        apply((current) => applyLessonPlans(current, [plan], nextOutline));
      }
      return result;
    });

  const moveLessonToUnit = (lessonId: string, unitId: string): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, apply }) => {
      if (!course.outline.some((section) => section.id === unitId)) {
        return WRITE_UNAVAILABLE;
      }
      const nextOutline = course.outline.map((section) => {
        const without = section.lessonIds.filter((id) => id !== lessonId);
        if (section.id === unitId) {
          return { ...section, lessonIds: [...without, lessonId] };
        }
        return without.length === section.lessonIds.length
          ? section
          : { ...section, lessonIds: without };
      });
      const result = await services.writer.updateOutline(session, nextOutline);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: { ...current.course, outline: nextOutline },
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

  return {
    addUnit,
    renameUnit,
    deleteUnit,
    duplicateUnit,
    addLesson,
    renameLesson,
    deleteLesson,
    duplicateLesson,
    moveLessonToUnit,
    reorderOutline,
  };
}
