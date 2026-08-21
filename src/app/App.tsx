import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { AvailableUpdate } from "@core/app-update";
import { createProjectSession, type ProjectDirectory, type RecentProject } from "@core/projects";
import { I18nProvider, LOCALES, getMessages, useMessages, type Locale } from "@shared/i18n";
import { ConfirmProvider } from "@shared/components/confirm-dialog";
import { StartScreen } from "@features/start";
import { NewCourseDialog } from "@features/new-course";
import { WorkspaceShell, type WorkspaceSection } from "@features/workspace-shell";
import { SpreadsheetImport } from "@features/import";
import type { DocumentTable } from "@core/documents";
import { SPREADSHEET_EXTENSIONS } from "@core/documents";
import { CourseStructure } from "@features/course-structure";
import { CourseContent } from "@features/content";
import { CourseMedia } from "@features/media";
import { CourseAttribution } from "@features/attribution";
import { CourseDetails } from "@features/course-details";
import { LessonEditor } from "@features/lesson-editor";
import { createAppServices } from "@app/services";
import { useCourseState } from "@app/useCourseState";
import { useProjectActions } from "@app/useProjectActions";
import { useOutlineActions } from "@app/useOutlineActions";
import { useContentActions } from "@app/useContentActions";
import { usePartActions } from "@app/usePartActions";
import { useMediaActions } from "@app/useMediaActions";
import styles from "@app/App.module.css";

function initialDark(): boolean {
  const saved = localStorage.getItem("asakiri-theme");
  if (saved === "dark") return true;
  if (saved === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function initialLocale(): Locale {
  const saved = localStorage.getItem("asakiri-locale");
  const stored = LOCALES.find((locale) => locale === saved);
  if (stored) return stored;
  const language = navigator.language.toLowerCase();
  return LOCALES.find((locale) => language.startsWith(locale)) ?? "en";
}

const PATREON_URL = "https://www.patreon.com/asakiri";

function initialSupportHidden(): boolean {
  return localStorage.getItem("asakiri-support-dismissed") === "true";
}

type View = "start" | "new-course" | "workspace";

export function App() {
  const [services] = useState(createAppServices);
  const [isDark, setIsDark] = useState(initialDark);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [view, setView] = useState<View>("start");
  const [section, setSection] = useState<WorkspaceSection>("lessons");
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [spreadsheet, setSpreadsheet] = useState<{
    readonly fileName: string;
    readonly tables: readonly DocumentTable[];
  } | null>(null);
  const [importNotice, setImportNotice] = useState<"readFailed" | "noTables" | null>(null);
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [updateInstalling, setUpdateInstalling] = useState(false);
  const [supportHidden, setSupportHidden] = useState(initialSupportHidden);
  const [recentProjects, setRecentProjects] = useState<readonly RecentProject[]>(() =>
    services.directory.listRecentProjects(),
  );

  const store = useCourseState(services);
  const { project, courseState } = store;

  const closeLessonAfterDelete = (lessonId: string) => {
    setOpenLessonId((current) => (current === lessonId ? null : current));
  };

  const { saveProject, saveAttribution } = useProjectActions(services, store);
  const outlineActions = useOutlineActions(services, store, locale, closeLessonAfterDelete);
  const contentActions = useContentActions(services, store);
  const partActions = usePartActions(services, store, locale);
  const mediaActions = useMediaActions(services, store);

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
    store.openProject(directory);
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
    store.closeProject();
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

  const pickSpreadsheet = async (): Promise<void> => {
    setImportNotice(null);
    const picked = await services.documents.pickDocument(SPREADSHEET_EXTENSIONS);
    if (!picked) return;
    const read = await services.documents.readDocument(picked.path);
    if (read.status !== "ready") {
      setImportNotice("readFailed");
      return;
    }
    if (read.document.tables.length === 0) {
      setImportNotice("noTables");
      return;
    }
    setSpreadsheet({ fileName: picked.name, tables: read.document.tables });
  };

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
        flagCode={course?.project.taughtFlag}
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
              onImportImage={mediaActions.importAssetForField}
              onLoadAssetPreview={mediaActions.loadAssetPreview}
            />
          ) : section === "content" ? (
            <CourseContent
              course={course}
              onSaveRecord={contentActions.saveRecord}
              onAddRecord={contentActions.addRecord}
              onDeleteRecord={contentActions.deleteRecord}
              onAddCollection={contentActions.addCollection}
              onUpdateCollection={contentActions.updateCollection}
              onDeleteCollection={contentActions.deleteCollection}
              onImportAsset={mediaActions.importAssetForField}
              onImportSpreadsheet={pickSpreadsheet}
              onLoadPreview={mediaActions.loadAssetPreview}
            />
          ) : section === "media" ? (
            <CourseMedia
              course={course}
              onImportMedia={mediaActions.importMedia}
              onImportMediaFolder={mediaActions.importMediaFolder}
              onDeleteAsset={mediaActions.deleteAsset}
              onLoadPreview={mediaActions.loadAssetPreview}
              onSearchImages={(query, page) => services.mediaSearch.searchImages(query, page)}
              onSearchAudio={(query, page) => services.mediaSearch.searchAudio(query, page)}
              onAddRemoteMedia={mediaActions.addRemoteMedia}
              onRenameAsset={mediaActions.renameAsset}
              onListTtsVoices={() => services.tts.listVoices()}
              onPreviewTtsVoice={mediaActions.previewTtsVoice}
              onListAvailableVoices={() => services.tts.listAvailableVoices()}
              onDownloadVoice={(voiceId, onProgress) =>
                services.tts.downloadVoice(voiceId, onProgress)
              }
              onRemoveVoice={(voiceId) => services.tts.removeVoice(voiceId)}
              onAddTtsAudio={mediaActions.addTtsAudio}
              onAddRecording={mediaActions.addRecording}
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
                partActions.savePartDocument(openLesson.id, partId, document)
              }
              onSaveExercise={(partId, exercise) =>
                partActions.savePartExercise(openLesson.id, partId, exercise)
              }
              onSaveContentTitle={(partId, title) =>
                partActions.savePartContentTitle(openLesson.id, partId, title)
              }
              onRenamePart={(partId, title) => partActions.renamePart(openLesson.id, partId, title)}
              onDeletePart={(partId) => partActions.deletePart(openLesson.id, partId)}
              onAddPart={(kind) => partActions.addPart(openLesson.id, kind)}
              onReorderParts={(orderedIds) => partActions.reorderParts(openLesson.id, orderedIds)}
              onSaveRecord={contentActions.saveRecord}
              onLoadAssetPreview={mediaActions.loadAssetPreview}
              onImportMedia={mediaActions.importAssetForField}
            />
          ) : (
            <CourseStructure
              course={course}
              onNewUnit={outlineActions.addUnit}
              onRenameUnit={outlineActions.renameUnit}
              onDeleteUnit={outlineActions.deleteUnit}
              onAddLesson={outlineActions.addLesson}
              onRenameLesson={outlineActions.renameLesson}
              onDeleteLesson={outlineActions.deleteLesson}
              onReorderOutline={outlineActions.reorderOutline}
              onOpenLesson={(lessonId) => {
                setOpenLessonId(lessonId);
              }}
            />
          )
        ) : null}
      </WorkspaceShell>
    );
  }

  const importDialog = spreadsheet ? (
    <SpreadsheetImport
      fileName={spreadsheet.fileName}
      tables={spreadsheet.tables}
      collections={courseState?.status === "ready" ? courseState.course.collections : []}
      records={courseState?.status === "ready" ? courseState.course.records : []}
      locales={
        courseState?.status === "ready"
          ? [
              courseState.course.project.defaultLocale,
              ...courseState.course.project.learningLocales,
            ]
          : ["en"]
      }
      defaultLocale={
        courseState?.status === "ready" ? courseState.course.project.defaultLocale : "en"
      }
      onCancel={() => {
        setSpreadsheet(null);
      }}
      onImport={contentActions.commitSpreadsheet}
    />
  ) : null;

  return (
    <I18nProvider locale={locale}>
      <ConfirmProvider>
        {renderView()}
        {importDialog}
        {importNotice !== null ? (
          <ImportNotice
            code={importNotice}
            onDismiss={() => {
              setImportNotice(null);
            }}
          />
        ) : null}
      </ConfirmProvider>
    </I18nProvider>
  );
}

function ImportNotice({
  code,
  onDismiss,
}: {
  readonly code: "readFailed" | "noTables";
  readonly onDismiss: () => void;
}) {
  const messages = useMessages();
  return (
    <div className={styles.importNotice} role="alert">
      <span>{code === "noTables" ? messages.importer.noTables : messages.importer.readFailed}</span>
      <button type="button" className={styles.importDismiss} onClick={onDismiss}>
        {messages.common.done}
      </button>
    </div>
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
