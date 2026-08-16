import { useCallback, useEffect, useState, type ReactNode } from "react";
import type {
  Asset,
  Collection,
  ContentRecord,
  Course,
  CourseProject,
  CourseSources,
  Exercise,
  Lesson,
  OutlineSection,
  Part,
  TiptapDocument,
} from "@core/course";
import { createDefaultExercise, labelForFile, mediaTypeForFile, partSourceKey } from "@core/course";
import type { AvailableUpdate } from "@core/app-update";
import type { PickedMediaFile } from "@core/project-media";
import type { ProjectReadErrorCode } from "@core/project-reading";
import type { GitStatus } from "@core/project-system";
import type { ProjectWriteResult } from "@core/project-writing";
import { createProjectSession, type ProjectDirectory, type RecentProject } from "@core/projects";
import { I18nProvider, getMessages, type Locale } from "@shared/i18n";
import { ConfirmProvider } from "@shared/components/confirm-dialog";
import { StartScreen } from "@features/start";
import { NewCourseDialog } from "@features/new-course";
import { WorkspaceShell, type WorkspaceSection } from "@features/workspace-shell";
import { CourseStructure } from "@features/course-structure";
import { CourseContent } from "@features/content";
import { CourseMedia } from "@features/media";
import { CourseAttribution } from "@features/attribution";
import { CourseDetails } from "@features/course-details";
import { LessonEditor, exerciseTypeForKind, type PartKind } from "@features/lesson-editor";
import { createAppServices } from "@app/services";
import styles from "@app/App.module.css";

function initialDark(): boolean {
  const saved = localStorage.getItem("asakiri-theme");
  if (saved === "dark") return true;
  if (saved === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function initialLocale(): Locale {
  const saved = localStorage.getItem("asakiri-locale");
  if (saved === "en" || saved === "ja") return saved;
  return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
}

const PATREON_URL = "https://www.patreon.com/asakiri";

function initialSupportHidden(): boolean {
  return localStorage.getItem("asakiri-support-dismissed") === "true";
}

type View = "start" | "new-course" | "workspace";

type CourseState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly course: Course; readonly sources: CourseSources }
  | { readonly status: "failed"; readonly code: ProjectReadErrorCode };

export function App() {
  const [services] = useState(createAppServices);
  const [isDark, setIsDark] = useState(initialDark);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [view, setView] = useState<View>("start");
  const [section, setSection] = useState<WorkspaceSection>("lessons");
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectDirectory | null>(null);
  const [courseState, setCourseState] = useState<CourseState | null>(null);
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [updateInstalling, setUpdateInstalling] = useState(false);
  const [supportHidden, setSupportHidden] = useState(initialSupportHidden);
  const [recentProjects, setRecentProjects] = useState<readonly RecentProject[]>(() =>
    services.directory.listRecentProjects(),
  );

  const messages = getMessages(locale);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    localStorage.setItem("asakiri-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem("asakiri-locale", locale);
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    void services.appUpdate.check().then((available) => {
      if (!cancelled) setUpdate(available);
    });
    return () => {
      cancelled = true;
    };
  }, [services]);

  const installUpdate = async () => {
    setUpdateInstalling(true);
    try {
      await services.appUpdate.downloadAndInstall();
      await services.appUpdate.relaunch();
    } catch {
      setUpdateInstalling(false);
    }
  };

  useEffect(() => {
    if (!project) return;
    const session = createProjectSession(project);
    let cancelled = false;
    void services.reader.readCourse(session).then((result) => {
      if (cancelled) return;
      setCourseState(
        result.status === "ready"
          ? { status: "ready", course: result.data.course, sources: result.data.sources }
          : { status: "failed", code: result.code },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [project, services]);

  const openPatreon = () => {
    void services.links.open(PATREON_URL);
  };

  const dismissSupportLater = () => {
    setSupportHidden(true);
  };

  const dismissSupportForever = () => {
    localStorage.setItem("asakiri-support-dismissed", "true");
    setSupportHidden(true);
  };

  const toggleTheme = () => {
    setIsDark((value) => !value);
  };

  const selectLocale = (next: Locale) => {
    setLocale(next);
  };

  const enterWorkspace = (directory: ProjectDirectory) => {
    setProject(directory);
    setCourseState({ status: "loading" });
    setSection("details");
    setOpenLessonId(null);
    setView("workspace");
    setRecentProjects(services.directory.listRecentProjects());
  };

  const openCourse = async () => {
    const directory = await services.directory.openProjectDirectory({
      dialogTitle: "Open an Asakiri course",
    });
    if (directory) {
      enterWorkspace(directory);
    }
  };

  const openRecent = async (id: string) => {
    const directory = await services.directory.openRecentProject(id);
    if (directory) {
      enterWorkspace(directory);
    }
  };

  const goToStart = () => {
    setProject(null);
    setCourseState(null);
    setOpenLessonId(null);
    setView("start");
  };

  const navigate = (target: WorkspaceSection) => {
    setSection(target);
    setOpenLessonId(null);
  };

  const revealFolder = useCallback(() => {
    if (project) {
      void services.system.revealFolder(createProjectSession(project));
    }
  }, [project, services]);

  const readGitStatus = useCallback((): Promise<GitStatus> => {
    if (!project) {
      return Promise.resolve({ initialized: false, commitCount: 0, clean: true });
    }
    return services.system.readGitStatus(createProjectSession(project));
  }, [project, services]);

  const saveProject = async (nextProject: CourseProject): Promise<ProjectWriteResult> => {
    if (!project) {
      return { status: "failed", code: "unavailable" };
    }
    const session = createProjectSession(project);
    const result = await services.writer.updateProject(session, nextProject);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? { ...current, course: { ...current.course, project: nextProject } }
          : current,
      );
    }
    return result;
  };

  const addUnit = async (): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const unit: OutlineSection = {
      id: `unit_${crypto.randomUUID()}`,
      title: messages.structure.defaultUnitTitle(courseState.course.outline.length + 1),
      lessonIds: [],
    };
    const nextOutline = [...courseState.course.outline, unit];
    const session = createProjectSession(project);
    const result = await services.writer.updateOutline(session, nextOutline);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? { ...current, course: { ...current.course, outline: nextOutline } }
          : current,
      );
    }
    return result;
  };

  const renameUnit = async (unitId: string, title: string): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const nextOutline = courseState.course.outline.map((section) =>
      section.id === unitId ? { ...section, title } : section,
    );
    const session = createProjectSession(project);
    const result = await services.writer.updateOutline(session, nextOutline);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? { ...current, course: { ...current.course, outline: nextOutline } }
          : current,
      );
    }
    return result;
  };

  const deleteUnit = async (unitId: string): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const nextOutline = courseState.course.outline.filter((section) => section.id !== unitId);
    const session = createProjectSession(project);
    const result = await services.writer.updateOutline(session, nextOutline);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? { ...current, course: { ...current.course, outline: nextOutline } }
          : current,
      );
    }
    return result;
  };

  const addLesson = async (unitId: string): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const unit = courseState.course.outline.find((section) => section.id === unitId);
    if (!unit) {
      return { status: "failed", code: "unavailable" };
    }
    const lessonId = `lesson_${crypto.randomUUID()}`;
    const lessonPath = `lessons/${lessonId}/lesson.json`;
    const lesson: Lesson = {
      id: lessonId,
      title: messages.structure.defaultLessonTitle(unit.lessonIds.length + 1),
      parts: [],
    };
    const nextOutline = courseState.course.outline.map((section) =>
      section.id === unitId ? { ...section, lessonIds: [...section.lessonIds, lessonId] } : section,
    );
    const session = createProjectSession(project);
    const result = await services.writer.createLesson(session, lessonPath, lesson, nextOutline);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? {
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
            }
          : current,
      );
    }
    return result;
  };

  const renameLesson = async (lessonId: string, title: string): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const lessonPath = courseState.sources.lessons[lessonId];
    const lesson = courseState.course.lessons.find((entry) => entry.id === lessonId);
    if (lessonPath === undefined || !lesson) {
      return { status: "failed", code: "unavailable" };
    }
    const nextLesson: Lesson = { ...lesson, title };
    const session = createProjectSession(project);
    const result = await services.writer.updateLesson(session, lessonPath, nextLesson);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? {
              ...current,
              course: {
                ...current.course,
                lessons: current.course.lessons.map((entry) =>
                  entry.id === lessonId ? nextLesson : entry,
                ),
              },
            }
          : current,
      );
    }
    return result;
  };

  const deleteLesson = async (lessonId: string): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const lessonPath = courseState.sources.lessons[lessonId];
    const lesson = courseState.course.lessons.find((entry) => entry.id === lessonId);
    if (lessonPath === undefined || !lesson) {
      return { status: "failed", code: "unavailable" };
    }
    const nextOutline = courseState.course.outline.map((section) => ({
      ...section,
      lessonIds: section.lessonIds.filter((id) => id !== lessonId),
    }));
    const session = createProjectSession(project);
    const result = await services.writer.deleteLesson(session, lessonPath, nextOutline);
    if (result.status === "saved") {
      if (openLessonId === lessonId) setOpenLessonId(null);
      setCourseState((current) =>
        current?.status === "ready"
          ? {
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
            }
          : current,
      );
    }
    return result;
  };

  const reorderOutline = async (
    sections: readonly { readonly id: string; readonly lessonIds: readonly string[] }[],
  ): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const byId = new Map(courseState.course.outline.map((section) => [section.id, section]));
    const nextOutline: OutlineSection[] = [];
    for (const section of sections) {
      const existing = byId.get(section.id);
      if (existing) nextOutline.push({ ...existing, lessonIds: [...section.lessonIds] });
    }
    const session = createProjectSession(project);
    const result = await services.writer.updateOutline(session, nextOutline);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? { ...current, course: { ...current.course, outline: nextOutline } }
          : current,
      );
    }
    return result;
  };

  const saveRecord = async (record: ContentRecord): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const path = courseState.sources.records[record.id];
    if (path === undefined) {
      return { status: "failed", code: "unavailable" };
    }
    const session = createProjectSession(project);
    const result = await services.writer.updateRecord(session, path, record);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? {
              ...current,
              course: {
                ...current.course,
                records: current.course.records.map((entry) =>
                  entry.id === record.id ? record : entry,
                ),
              },
            }
          : current,
      );
    }
    return result;
  };

  const addRecord = async (record: ContentRecord): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const collectionPath = courseState.sources.collections[record.collectionId];
    if (collectionPath === undefined) {
      return { status: "failed", code: "unavailable" };
    }
    const recordPath = `content/records/${record.id}.json`;
    const session = createProjectSession(project);
    const result = await services.writer.createRecord(session, collectionPath, recordPath, record);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? {
              ...current,
              course: { ...current.course, records: [...current.course.records, record] },
              sources: {
                ...current.sources,
                records: { ...current.sources.records, [record.id]: recordPath },
              },
            }
          : current,
      );
    }
    return result;
  };

  const deleteRecord = async (recordId: string): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const recordPath = courseState.sources.records[recordId];
    const record = courseState.course.records.find((entry) => entry.id === recordId);
    if (recordPath === undefined || !record) {
      return { status: "failed", code: "unavailable" };
    }
    const collectionPath = courseState.sources.collections[record.collectionId];
    if (collectionPath === undefined) {
      return { status: "failed", code: "unavailable" };
    }
    const session = createProjectSession(project);
    const result = await services.writer.deleteRecord(session, collectionPath, recordPath);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? {
              ...current,
              course: {
                ...current.course,
                records: current.course.records.filter((entry) => entry.id !== recordId),
              },
            }
          : current,
      );
    }
    return result;
  };

  const addCollection = async (collection: Collection): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const collectionPath = `content/collections/${collection.id}.json`;
    const session = createProjectSession(project);
    const result = await services.writer.createCollection(session, collectionPath, collection);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? {
              ...current,
              course: {
                ...current.course,
                collections: [...current.course.collections, collection],
              },
              sources: {
                ...current.sources,
                collections: { ...current.sources.collections, [collection.id]: collectionPath },
              },
            }
          : current,
      );
    }
    return result;
  };

  const updateCollection = async (collection: Collection): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const collectionPath = courseState.sources.collections[collection.id];
    if (collectionPath === undefined) {
      return { status: "failed", code: "unavailable" };
    }
    const session = createProjectSession(project);
    const result = await services.writer.updateCollection(session, collectionPath, collection);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? {
              ...current,
              course: {
                ...current.course,
                collections: current.course.collections.map((entry) =>
                  entry.id === collection.id ? collection : entry,
                ),
              },
            }
          : current,
      );
    }
    return result;
  };

  const deleteCollection = async (collectionId: string): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const collectionPath = courseState.sources.collections[collectionId];
    if (collectionPath === undefined) {
      return { status: "failed", code: "unavailable" };
    }
    const recordIds = courseState.course.records
      .filter((entry) => entry.collectionId === collectionId)
      .map((entry) => entry.id);
    const recordPaths = recordIds
      .map((id) => courseState.sources.records[id])
      .filter((path): path is string => path !== undefined);
    const session = createProjectSession(project);
    const result = await services.writer.deleteCollection(session, collectionPath, recordPaths);
    if (result.status === "saved") {
      const removed = new Set(recordIds);
      setCourseState((current) =>
        current?.status === "ready"
          ? {
              ...current,
              course: {
                ...current.course,
                collections: current.course.collections.filter(
                  (entry) => entry.id !== collectionId,
                ),
                records: current.course.records.filter((entry) => !removed.has(entry.id)),
              },
            }
          : current,
      );
    }
    return result;
  };

  const savePartDocument = async (
    lessonId: string,
    partId: string,
    document: TiptapDocument,
  ): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const path = courseState.sources.parts[partSourceKey(lessonId, partId)];
    if (path === undefined) {
      return { status: "failed", code: "unavailable" };
    }
    const session = createProjectSession(project);
    const result = await services.writer.updatePartDocument(session, path, document);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? {
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
            }
          : current,
      );
    }
    return result;
  };

  const savePartExercise = async (
    lessonId: string,
    partId: string,
    exercise: Exercise,
  ): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const path = courseState.sources.parts[partSourceKey(lessonId, partId)];
    if (path === undefined) {
      return { status: "failed", code: "unavailable" };
    }
    const session = createProjectSession(project);
    const result = await services.writer.updatePartExercise(session, path, exercise);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? {
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
            }
          : current,
      );
    }
    return result;
  };

  const savePartContentTitle = async (
    lessonId: string,
    partId: string,
    title: string,
  ): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const lessonPath = courseState.sources.lessons[lessonId];
    if (lessonPath === undefined) {
      return { status: "failed", code: "unavailable" };
    }
    const session = createProjectSession(project);
    const result = await services.writer.updatePartContentTitle(session, lessonPath, partId, title);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? {
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
            }
          : current,
      );
    }
    return result;
  };

  const renamePart = async (
    lessonId: string,
    partId: string,
    title: string,
  ): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const lessonPath = courseState.sources.lessons[lessonId];
    if (lessonPath === undefined) {
      return { status: "failed", code: "unavailable" };
    }
    const session = createProjectSession(project);
    const result = await services.writer.updatePartTitle(session, lessonPath, partId, title);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? {
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
            }
          : current,
      );
    }
    return result;
  };

  const deletePart = async (lessonId: string, partId: string): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const lessonPath = courseState.sources.lessons[lessonId];
    const bodyPath = courseState.sources.parts[partSourceKey(lessonId, partId)];
    if (lessonPath === undefined || bodyPath === undefined) {
      return { status: "failed", code: "unavailable" };
    }
    const session = createProjectSession(project);
    const result = await services.writer.deletePart(session, lessonPath, partId, bodyPath);
    if (result.status === "saved") {
      const partKey = partSourceKey(lessonId, partId);
      setCourseState((current) =>
        current?.status === "ready"
          ? {
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
            }
          : current,
      );
    }
    return result;
  };

  const addPart = async (lessonId: string, kind: PartKind): Promise<string | null> => {
    if (!project || courseState?.status !== "ready") {
      return null;
    }
    const lessonPath = courseState.sources.lessons[lessonId];
    const lesson = courseState.course.lessons.find((entry) => entry.id === lessonId);
    if (lessonPath === undefined || !lesson) {
      return null;
    }
    const partId = `part_${crypto.randomUUID()}`;
    const lessonDir = lessonPath.split("/").slice(0, -1).join("/");
    const title = messages.lesson.defaultPartTitle(lesson.parts.length + 1);
    const session = createProjectSession(project);

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
      setCourseState((current) =>
        current?.status === "ready"
          ? {
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
            }
          : current,
      );
    }
    return result.status === "saved" ? partId : null;
  };

  const reorderParts = async (
    lessonId: string,
    orderedPartIds: readonly string[],
  ): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const lessonPath = courseState.sources.lessons[lessonId];
    if (lessonPath === undefined) {
      return { status: "failed", code: "unavailable" };
    }
    const session = createProjectSession(project);
    const result = await services.writer.reorderParts(session, lessonPath, orderedPartIds);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? {
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
            }
          : current,
      );
    }
    return result;
  };

  const importPickedMedia = async (
    picked: readonly PickedMediaFile[],
    metadata?: Readonly<Record<string, unknown>>,
  ): Promise<{ readonly assets: readonly Asset[]; readonly allOk: boolean }> => {
    if (!project) return { assets: [], allOk: false };
    const session = createProjectSession(project);
    const imported: { readonly asset: Asset; readonly assetPath: string }[] = [];
    let allOk = true;
    for (const file of picked) {
      const type = mediaTypeForFile(file.name);
      if (!type) {
        allOk = false;
        continue;
      }
      const id = `asset_${crypto.randomUUID()}`;
      const assetDir = `media/assets/${id}`;
      const assetPath = `${assetDir}/asset.json`;
      const asset: Asset = {
        id,
        kind: type.kind,
        label: labelForFile(file.name),
        availability: "ready",
        file: file.name,
        mimeType: type.mimeType,
        ...(metadata ? { metadata } : {}),
      };
      const result = await services.writer.importAsset(
        session,
        assetPath,
        `${assetDir}/${file.name}`,
        file.path,
        asset,
      );
      if (result.status === "saved") imported.push({ asset, assetPath });
      else allOk = false;
    }

    if (imported.length > 0) {
      setCourseState((current) =>
        current?.status === "ready"
          ? {
              ...current,
              course: {
                ...current.course,
                assets: [...current.course.assets, ...imported.map((entry) => entry.asset)],
              },
              sources: {
                ...current.sources,
                assets: {
                  ...current.sources.assets,
                  ...Object.fromEntries(imported.map((entry) => [entry.asset.id, entry.assetPath])),
                },
              },
            }
          : current,
      );
    }
    return { assets: imported.map((entry) => entry.asset), allOk };
  };

  const importMedia = async (): Promise<ProjectWriteResult | null> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const picked = await services.mediaPicker.pickMediaFiles();
    if (picked.length === 0) return null;
    const { allOk } = await importPickedMedia(picked);
    return allOk ? { status: "saved" } : { status: "failed", code: "unknown" };
  };

  const importMediaFolder = async (): Promise<ProjectWriteResult | null> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const picked = await services.mediaPicker.pickMediaFolder();
    if (picked.length === 0) return null;
    const { allOk } = await importPickedMedia(picked);
    return allOk ? { status: "saved" } : { status: "failed", code: "unknown" };
  };

  const importAssetForField = async (): Promise<Asset | null> => {
    if (!project || courseState?.status !== "ready") return null;
    const picked = await services.mediaPicker.pickMediaFiles();
    if (picked.length === 0) return null;
    const { assets } = await importPickedMedia(picked.slice(0, 1));
    return assets[0] ?? null;
  };

  const addRemoteMedia = async (
    url: string,
    fileName: string,
    metadata?: Readonly<Record<string, unknown>>,
  ): Promise<ProjectWriteResult | null> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const picked = await services.mediaSearch.downloadToTemp(url, fileName);
    if (!picked) return { status: "failed", code: "unknown" };
    const { allOk } = await importPickedMedia([picked], metadata);
    return allOk ? { status: "saved" } : { status: "failed", code: "unknown" };
  };

  const addTtsAudio = async (
    text: string,
    voice: string,
    fileName: string,
  ): Promise<ProjectWriteResult | null> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const picked = await services.tts.synthesizeToTemp(text, voice, fileName);
    if (!picked) return { status: "failed", code: "unknown" };
    const { allOk } = await importPickedMedia([picked]);
    return allOk ? { status: "saved" } : { status: "failed", code: "unknown" };
  };

  const addRecording = async (
    bytes: Uint8Array,
    mimeType: string,
    ext: string,
  ): Promise<ProjectWriteResult | null> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const id = `asset_${crypto.randomUUID()}`;
    const fileName = `recording-${id.slice(-6)}.${ext}`;
    const picked = await services.recording.saveToTemp(fileName, bytes);
    if (!picked) return { status: "failed", code: "unknown" };
    const assetDir = `media/assets/${id}`;
    const assetPath = `${assetDir}/asset.json`;
    const asset: Asset = {
      id,
      kind: "audio",
      label: labelForFile(fileName),
      availability: "ready",
      file: fileName,
      mimeType,
    };
    const session = createProjectSession(project);
    const result = await services.writer.importAsset(
      session,
      assetPath,
      `${assetDir}/${fileName}`,
      picked.path,
      asset,
    );
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? {
              ...current,
              course: { ...current.course, assets: [...current.course.assets, asset] },
              sources: {
                ...current.sources,
                assets: { ...current.sources.assets, [asset.id]: assetPath },
              },
            }
          : current,
      );
    }
    return result;
  };

  const saveAttribution = async (markdown: string): Promise<ProjectWriteResult> => {
    if (!project) {
      return { status: "failed", code: "unavailable" };
    }
    const session = createProjectSession(project);
    return services.writer.writeAttribution(session, markdown);
  };

  const renameAsset = async (assetId: string, rawName: string): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const asset = courseState.course.assets.find((entry) => entry.id === assetId);
    const assetPath = courseState.sources.assets[assetId];
    if (!asset || assetPath === undefined) {
      return { status: "failed", code: "unavailable" };
    }
    const currentName = asset.file ?? asset.expectedFile ?? "";
    const dot = currentName.lastIndexOf(".");
    const ext = dot > 0 ? currentName.slice(dot) : "";
    const base = rawName
      .trim()
      .replace(/\.[^.]*$/, "")
      .replace(/[/\\:*?"<>|]/g, "")
      .trim();
    if (base === "") return { status: "saved" };
    const nextName = `${base}${ext}`;
    if (nextName === currentName) return { status: "saved" };
    const nextAsset: Asset = {
      ...asset,
      label: labelForFile(nextName),
      ...(asset.file !== null ? { file: nextName } : { expectedFile: nextName }),
    };
    const session = createProjectSession(project);
    const result = await services.writer.renameAsset(session, assetPath, asset.file, nextAsset);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? {
              ...current,
              course: {
                ...current.course,
                assets: current.course.assets.map((entry) =>
                  entry.id === assetId ? nextAsset : entry,
                ),
              },
            }
          : current,
      );
    }
    return result;
  };

  const deleteAsset = async (assetId: string): Promise<ProjectWriteResult> => {
    if (!project || courseState?.status !== "ready") {
      return { status: "failed", code: "unavailable" };
    }
    const assetPath = courseState.sources.assets[assetId];
    if (assetPath === undefined) {
      return { status: "failed", code: "unavailable" };
    }
    const session = createProjectSession(project);
    const result = await services.writer.deleteAsset(session, assetPath);
    if (result.status === "saved") {
      setCourseState((current) =>
        current?.status === "ready"
          ? {
              ...current,
              course: {
                ...current.course,
                assets: current.course.assets.filter((entry) => entry.id !== assetId),
              },
            }
          : current,
      );
    }
    return result;
  };

  const loadAssetPreview = useCallback(
    async (assetId: string): Promise<string | null> => {
      if (!project || courseState?.status !== "ready") return null;
      const asset = courseState.course.assets.find((entry) => entry.id === assetId);
      const assetJsonPath = courseState.sources.assets[assetId];
      if (!asset?.file || assetJsonPath === undefined) return null;
      // The binary lives beside the asset.json descriptor.
      const dir = assetJsonPath.split("/").slice(0, -1).join("/");
      const binaryPath = dir ? `${dir}/${asset.file}` : asset.file;
      return services.assetReader.readAssetDataUrl(
        createProjectSession(project),
        binaryPath,
        asset.mimeType,
      );
    },
    [project, courseState, services],
  );

  function renderView(): ReactNode {
    if (view === "start") {
      return (
        <StartScreen
          isDark={isDark}
          update={update}
          updateInstalling={updateInstalling}
          recentProjects={recentProjects}
          showSupport={!supportHidden}
          onInstallUpdate={() => {
            void installUpdate();
          }}
          onSupport={openPatreon}
          onSupportLater={dismissSupportLater}
          onSupportDismiss={dismissSupportForever}
          onNewCourse={() => {
            setView("new-course");
          }}
          onOpenCourse={() => {
            void openCourse();
          }}
          onOpenRecent={(id) => {
            void openRecent(id);
          }}
          onToggleTheme={toggleTheme}
          onSelectLocale={selectLocale}
        />
      );
    }

    if (view === "new-course") {
      return (
        <NewCourseDialog
          onCancel={goToStart}
          createCourse={(name) =>
            services.creation.createCourse({
              name,
              dialogTitle: `Choose where to create ${name}`,
            })
          }
          onCreated={enterWorkspace}
        />
      );
    }

    const course = courseState?.status === "ready" ? courseState.course : null;
    const projectName = course?.project.title ?? project?.name ?? messages.workspace.fallbackName;
    const projectLocation = project?.locationLabel ?? "";
    const openLesson =
      course && openLessonId
        ? (course.lessons.find((lesson) => lesson.id === openLessonId) ?? null)
        : null;

    return (
      <WorkspaceShell
        projectName={projectName}
        projectLocation={projectLocation}
        active={section}
        onNavigate={navigate}
        onBack={goToStart}
      >
        {courseState?.status === "loading" ? (
          <WorkspaceMessage
            title={messages.workspace.openingTitle}
            body={messages.workspace.openingBody}
          />
        ) : courseState?.status === "failed" ? (
          <WorkspaceMessage
            title={messages.workspace.failedTitle}
            body={messages.workspace.failedBody}
          />
        ) : course ? (
          section === "details" ? (
            <CourseDetails
              course={course}
              location={projectLocation}
              onSaveProject={saveProject}
              onRevealFolder={revealFolder}
              onReadGitStatus={readGitStatus}
            />
          ) : section === "content" ? (
            <CourseContent
              course={course}
              onSaveRecord={saveRecord}
              onAddRecord={addRecord}
              onDeleteRecord={deleteRecord}
              onAddCollection={addCollection}
              onUpdateCollection={updateCollection}
              onDeleteCollection={deleteCollection}
              onImportAsset={importAssetForField}
              onLoadPreview={loadAssetPreview}
            />
          ) : section === "media" ? (
            <CourseMedia
              course={course}
              onImportMedia={importMedia}
              onImportMediaFolder={importMediaFolder}
              onDeleteAsset={deleteAsset}
              onLoadPreview={loadAssetPreview}
              onSearchImages={(query, page) => services.mediaSearch.searchImages(query, page)}
              onSearchAudio={(query, page) => services.mediaSearch.searchAudio(query, page)}
              onAddRemoteMedia={addRemoteMedia}
              onRenameAsset={renameAsset}
              onListTtsVoices={() => services.tts.listVoices()}
              onAddTtsAudio={addTtsAudio}
              onAddRecording={addRecording}
            />
          ) : section === "attribution" ? (
            <CourseAttribution course={course} onSaveAttribution={saveAttribution} />
          ) : openLesson ? (
            <LessonEditor
              course={course}
              lesson={openLesson}
              onBackToStructure={() => {
                setOpenLessonId(null);
              }}
              onSaveDocument={(partId, document) =>
                savePartDocument(openLesson.id, partId, document)
              }
              onSaveExercise={(partId, exercise) =>
                savePartExercise(openLesson.id, partId, exercise)
              }
              onSaveContentTitle={(partId, title) =>
                savePartContentTitle(openLesson.id, partId, title)
              }
              onRenamePart={(partId, title) => renamePart(openLesson.id, partId, title)}
              onDeletePart={(partId) => deletePart(openLesson.id, partId)}
              onAddPart={(kind) => addPart(openLesson.id, kind)}
              onReorderParts={(orderedIds) => reorderParts(openLesson.id, orderedIds)}
              onSaveRecord={saveRecord}
              onLoadAssetPreview={loadAssetPreview}
              onImportMedia={importAssetForField}
            />
          ) : (
            <CourseStructure
              course={course}
              onNewUnit={addUnit}
              onRenameUnit={renameUnit}
              onDeleteUnit={deleteUnit}
              onAddLesson={addLesson}
              onRenameLesson={renameLesson}
              onDeleteLesson={deleteLesson}
              onReorderOutline={reorderOutline}
              onOpenLesson={(lessonId) => {
                setOpenLessonId(lessonId);
              }}
            />
          )
        ) : null}
      </WorkspaceShell>
    );
  }

  return (
    <I18nProvider locale={locale}>
      <ConfirmProvider>{renderView()}</ConfirmProvider>
    </I18nProvider>
  );
}

function WorkspaceMessage({ title, body }: { readonly title: string; readonly body: string }) {
  return (
    <div className={styles.message}>
      <h1 className={styles.messageTitle}>{title}</h1>
      <p className={styles.messageBody}>{body}</p>
    </div>
  );
}
