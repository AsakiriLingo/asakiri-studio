import type { Exercise, Part, TiptapDocument } from "@core/course";
import { createDefaultExercise, partSourceKey } from "@core/course";
import type { ProjectWriteResult } from "@core/project-writing";
import { formatMessage, getMessages, type Locale } from "@shared/i18n";
import { exerciseTypeForKind, type PartKind } from "@features/lesson-editor";
import type { AppServices } from "@app/services";
import { WRITE_UNAVAILABLE } from "@app/course-state";
import type { CourseStateStore } from "@app/useCourseState";

export interface PartActions {
  readonly savePartDocument: (
    lessonId: string,
    partId: string,
    document: TiptapDocument,
  ) => Promise<ProjectWriteResult>;
  readonly savePartExercise: (
    lessonId: string,
    partId: string,
    exercise: Exercise,
  ) => Promise<ProjectWriteResult>;
  readonly savePartContentTitle: (
    lessonId: string,
    partId: string,
    title: string,
  ) => Promise<ProjectWriteResult>;
  readonly renamePart: (
    lessonId: string,
    partId: string,
    title: string,
  ) => Promise<ProjectWriteResult>;
  readonly deletePart: (lessonId: string, partId: string) => Promise<ProjectWriteResult>;
  readonly addPart: (lessonId: string, kind: PartKind) => Promise<string | null>;
  readonly reorderParts: (
    lessonId: string,
    orderedPartIds: readonly string[],
  ) => Promise<ProjectWriteResult>;
}

export function usePartActions(
  services: AppServices,
  store: CourseStateStore,
  locale: Locale,
): PartActions {
  const messages = getMessages(locale);

  const savePartDocument = (
    lessonId: string,
    partId: string,
    document: TiptapDocument,
  ): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, sources, apply }) => {
      const path = sources.parts[partSourceKey(lessonId, partId)];
      if (path === undefined) {
        return WRITE_UNAVAILABLE;
      }
      const result = await services.writer.updatePartDocument(session, path, document);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            lessons: current.course.lessons.map((lesson) =>
              lesson.id !== lessonId
                ? lesson
                : {
                    ...lesson,
                    parts: lesson.parts.map((part) =>
                      part.id === partId && part.content.kind === "tiptap"
                        ? { ...part, content: { kind: "tiptap", document } }
                        : part,
                    ),
                  },
            ),
          },
        }));
      }
      return result;
    });

  const savePartExercise = (
    lessonId: string,
    partId: string,
    exercise: Exercise,
  ): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, sources, apply }) => {
      const path = sources.parts[partSourceKey(lessonId, partId)];
      if (path === undefined) {
        return WRITE_UNAVAILABLE;
      }
      const result = await services.writer.updatePartExercise(session, path, exercise);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            lessons: current.course.lessons.map((lesson) =>
              lesson.id !== lessonId
                ? lesson
                : {
                    ...lesson,
                    parts: lesson.parts.map((part) =>
                      part.id === partId && part.content.kind === "exercise"
                        ? { ...part, content: { kind: "exercise", exercise } }
                        : part,
                    ),
                  },
            ),
          },
        }));
      }
      return result;
    });

  const savePartContentTitle = (
    lessonId: string,
    partId: string,
    title: string,
  ): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, sources, apply }) => {
      const lessonPath = sources.lessons[lessonId];
      if (lessonPath === undefined) {
        return WRITE_UNAVAILABLE;
      }
      const result = await services.writer.updatePartContentTitle(
        session,
        lessonPath,
        partId,
        title,
      );
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            lessons: current.course.lessons.map((lesson) =>
              lesson.id !== lessonId
                ? lesson
                : {
                    ...lesson,
                    parts: lesson.parts.map((part) =>
                      part.id === partId && part.content.kind === "tiptap"
                        ? {
                            ...part,
                            content: {
                              kind: "tiptap",
                              document: part.content.document,
                              ...(title === "" ? {} : { title }),
                            },
                          }
                        : part,
                    ),
                  },
            ),
          },
        }));
      }
      return result;
    });

  const renamePart = (
    lessonId: string,
    partId: string,
    title: string,
  ): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, sources, apply }) => {
      const lessonPath = sources.lessons[lessonId];
      if (lessonPath === undefined) {
        return WRITE_UNAVAILABLE;
      }
      const result = await services.writer.updatePartTitle(session, lessonPath, partId, title);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            lessons: current.course.lessons.map((lesson) =>
              lesson.id !== lessonId
                ? lesson
                : {
                    ...lesson,
                    parts: lesson.parts.map((part) =>
                      part.id === partId ? { ...part, title } : part,
                    ),
                  },
            ),
          },
        }));
      }
      return result;
    });

  const deletePart = (lessonId: string, partId: string): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, sources, apply }) => {
      const lessonPath = sources.lessons[lessonId];
      const bodyPath = sources.parts[partSourceKey(lessonId, partId)];
      if (lessonPath === undefined || bodyPath === undefined) {
        return WRITE_UNAVAILABLE;
      }
      const result = await services.writer.deletePart(session, lessonPath, partId, bodyPath);
      if (result.status === "saved") {
        const partKey = partSourceKey(lessonId, partId);
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            lessons: current.course.lessons.map((lesson) =>
              lesson.id !== lessonId
                ? lesson
                : { ...lesson, parts: lesson.parts.filter((part) => part.id !== partId) },
            ),
          },
          sources: {
            ...current.sources,
            parts: Object.fromEntries(
              Object.entries(current.sources.parts).filter(([key]) => key !== partKey),
            ),
          },
        }));
      }
      return result;
    });

  const addPart = (lessonId: string, kind: PartKind): Promise<string | null> =>
    store.withCourse<string | null>(null, async ({ session, course, sources, apply }) => {
      const lessonPath = sources.lessons[lessonId];
      const lesson = course.lessons.find((entry) => entry.id === lessonId);
      if (lessonPath === undefined || !lesson) {
        return null;
      }
      const partId = `part_${crypto.randomUUID()}`;
      const lessonDir = lessonPath.split("/").slice(0, -1).join("/");
      const title = formatMessage(locale, messages.lesson.defaultPartTitle, {
        order: lesson.parts.length + 1,
      });

      let bodyPath: string;
      let part: Part;
      let result: ProjectWriteResult;
      if (kind === "rich-text") {
        bodyPath = `${lessonDir}/parts/${partId}/document.json`;
        const document: TiptapDocument = { type: "doc", content: [{ type: "paragraph" }] };
        part = { id: partId, title, content: { kind: "tiptap", document } };
        result = await services.writer.createPart(
          session,
          lessonPath,
          bodyPath,
          { id: partId, title },
          document,
        );
      } else {
        bodyPath = `${lessonDir}/parts/${partId}/exercise.json`;
        const exercise = createDefaultExercise(exerciseTypeForKind(kind));
        part = { id: partId, title, content: { kind: "exercise", exercise } };
        result = await services.writer.createExercisePart(
          session,
          lessonPath,
          bodyPath,
          { id: partId, title },
          exercise,
        );
      }

      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            lessons: current.course.lessons.map((entry) =>
              entry.id !== lessonId ? entry : { ...entry, parts: [...entry.parts, part] },
            ),
          },
          sources: {
            ...current.sources,
            parts: {
              ...current.sources.parts,
              [partSourceKey(lessonId, partId)]: bodyPath,
            },
          },
        }));
      }
      return result.status === "saved" ? partId : null;
    });

  const reorderParts = (
    lessonId: string,
    orderedPartIds: readonly string[],
  ): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, sources, apply }) => {
      const lessonPath = sources.lessons[lessonId];
      if (lessonPath === undefined) {
        return WRITE_UNAVAILABLE;
      }
      const result = await services.writer.reorderParts(session, lessonPath, orderedPartIds);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            lessons: current.course.lessons.map((entry) => {
              if (entry.id !== lessonId) return entry;
              const byId = new Map(entry.parts.map((part) => [part.id, part]));
              const parts = orderedPartIds
                .map((id) => byId.get(id))
                .filter((part): part is Part => part !== undefined);
              return { ...entry, parts };
            }),
          },
        }));
      }
      return result;
    });

  return {
    savePartDocument,
    savePartExercise,
    savePartContentTitle,
    renamePart,
    deletePart,
    addPart,
    reorderParts,
  };
}
