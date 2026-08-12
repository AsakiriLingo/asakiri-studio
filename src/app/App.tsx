import { useCallback, useEffect, useState, type ReactNode } from "react";
import type {
  Asset,
  Collection,
  ContentRecord,
  Course,
  CourseProject,
  CourseSources,
  OutlineSection,
  TiptapDocument,
} from "@core/course";
import { labelForFile, mediaTypeForFile, partSourceKey } from "@core/course";
import type { PickedMediaFile } from "@core/project-media";
import type { ProjectReadErrorCode } from "@core/project-reading";
import type { GitStatus } from "@core/project-system";
import type { ProjectWriteResult } from "@core/project-writing";
import { createProjectSession, type ProjectDirectory } from "@core/projects";
import { I18nProvider, getMessages, type Locale } from "@shared/i18n";
import { ConfirmProvider } from "@shared/components/confirm-dialog";
import { StartScreen } from "@features/start";
import { NewCourseDialog } from "@features/new-course";
import { Integrations } from "@features/integrations";
import { WorkspaceShell, type WorkspaceSection } from "@features/workspace-shell";
import { CourseStructure } from "@features/course-structure";
import { CourseContent } from "@features/content";
import { CourseMedia } from "@features/media";
import { CourseDetails } from "@features/course-details";
import { LessonEditor } from "@features/lesson-editor";
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

type View = "start" | "new-course" | "integrations" | "workspace";

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

  const toggleTheme = () => {
    setIsDark((value) => !value);
  };

  const toggleLocale = () => {
    setLocale((value) => (value === "en" ? "ja" : "en"));
  };

  const enterWorkspace = (directory: ProjectDirectory) => {
    setProject(directory);
    setCourseState({ status: "loading" });
    setSection("details");
    setOpenLessonId(null);
    setView("workspace");
  };

  const openCourse = async () => {
    const directory = await services.directory.openProjectDirectory({
      dialogTitle: "Open an Asakiri course",
    });
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

  const importPickedMedia = async (
    picked: readonly PickedMediaFile[],
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

  const importAssetForField = async (): Promise<Asset | null> => {
    if (!project || courseState?.status !== "ready") return null;
    const picked = await services.mediaPicker.pickMediaFiles();
    if (picked.length === 0) return null;
    const { assets } = await importPickedMedia(picked.slice(0, 1));
    return assets[0] ?? null;
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
          onNewCourse={() => {
            setView("new-course");
          }}
          onOpenCourse={() => {
            void openCourse();
          }}
          onIntegrations={() => {
            setView("integrations");
          }}
          onToggleTheme={toggleTheme}
          onToggleLocale={toggleLocale}
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

    if (view === "integrations") {
      return (
        <Integrations
          isDark={isDark}
          onBack={goToStart}
          onToggleTheme={toggleTheme}
          onToggleLocale={toggleLocale}
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
        isDark={isDark}
        onNavigate={navigate}
        onBack={goToStart}
        onToggleTheme={toggleTheme}
        onToggleLocale={toggleLocale}
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
              onDeleteAsset={deleteAsset}
              onLoadPreview={loadAssetPreview}
            />
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
            />
          ) : (
            <CourseStructure
              course={course}
              onNewUnit={addUnit}
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
