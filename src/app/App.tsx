import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import type { AvailableUpdate } from "@core/app-update";
import { createProjectSession, type ProjectDirectory, type RecentProject } from "@core/projects";
import { I18nProvider, LOCALES, getMessages, useMessages, type Locale } from "@shared/i18n";
import { ConfirmProvider } from "@shared/components/confirm-dialog";
import type { StatusTone } from "@shared/components/status";
import { StartScreen } from "@features/start";
import { SettingsDialog, type ThemePreference } from "@features/settings";
import { NewCourseDialog } from "@features/new-course";
import { WorkspaceShell, type WorkspaceSection } from "@features/workspace-shell";
import { SpreadsheetImport } from "@features/import";
import type { DocumentTable } from "@core/documents";
import { SPREADSHEET_EXTENSIONS } from "@core/documents";
import { CourseStructure, OutlineSearch } from "@features/course-structure";
import { LessonWorkspace } from "@features/lesson-workspace";
import type { MediaSelection } from "@features/media";
import { courseToRichLibrary, PartEditor, type SaveState } from "@features/lesson-editor";
import { DraftsToolbar, DraftsSearch, DraftsPanel } from "@features/drafts";
import { createAppServices } from "@app/services";
import { useCourseState } from "@app/useCourseState";
import { useProjectActions } from "@app/useProjectActions";
import { useOutlineActions } from "@app/useOutlineActions";
import { useContentActions } from "@app/useContentActions";
import { usePartActions } from "@app/usePartActions";
import { useMediaActions } from "@app/useMediaActions";
import { useDrafts } from "@app/useDrafts";
import styles from "@app/App.module.css";

const CourseDetails = lazy(() =>
  import("@features/course-details").then((m) => ({ default: m.CourseDetails })),
);
const CourseAttribution = lazy(() =>
  import("@features/attribution").then((m) => ({ default: m.CourseAttribution })),
);
const CourseContent = lazy(() =>
  import("@features/content").then((m) => ({ default: m.CourseContent })),
);
const CourseMedia = lazy(() => import("@features/media").then((m) => ({ default: m.CourseMedia })));
const PartPreview = lazy(() =>
  import("@features/part-preview").then((m) => ({ default: m.PartPreview })),
);

function initialThemePreference(): ThemePreference {
  const saved = localStorage.getItem("asakiri-theme");
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  return "system";
}

function systemPrefersDark(): boolean {
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

function initialSupportEnabled(): boolean {
  return localStorage.getItem("asakiri-support-dismissed") !== "true";
}

function initialAutoUpdate(): boolean {
  return localStorage.getItem("asakiri-auto-update") !== "false";
}

type View = "start" | "new-course" | "workspace";

export function App() {
  const [services] = useState(createAppServices);
  const [themePreference, setThemePreference] = useState<ThemePreference>(initialThemePreference);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appVersion, setAppVersion] = useState("");
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [view, setView] = useState<View>("start");
  const [section, setSection] = useState<WorkspaceSection>("lessons");
  const [openPartId, setOpenPartId] = useState<string | null>(null);
  const [draftSelectedId, setDraftSelectedId] = useState<string | null>(null);
  const [draftQuery, setDraftQuery] = useState("");
  const [draftHitActive, setDraftHitActive] = useState(0);
  const [draftHitTotal, setDraftHitTotal] = useState(0);
  const [outlineQuery, setOutlineQuery] = useState("");
  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  const [referenceCollapsed, setReferenceCollapsed] = useState(false);
  const [collectionsCollapsed, setCollectionsCollapsed] = useState(false);
  const [mediaInspectorCollapsed, setMediaInspectorCollapsed] = useState(false);
  const [mediaSelection, setMediaSelection] = useState<MediaSelection>({
    kind: "view",
    view: "all",
  });
  const [mediaSelectedId, setMediaSelectedId] = useState<string | null>(null);
  const [partSaveState, setPartSaveState] = useState<SaveState>("idle");
  const [savedPartId, setSavedPartId] = useState<string | null>(null);

  if (openPartId !== savedPartId) {
    setSavedPartId(openPartId);
    setPartSaveState("idle");
  }
  const [spreadsheet, setSpreadsheet] = useState<{
    readonly fileName: string;
    readonly tables: readonly DocumentTable[];
  } | null>(null);
  const [importNotice, setImportNotice] = useState<"readFailed" | "noTables" | null>(null);
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [updateInstalling, setUpdateInstalling] = useState(false);
  const [updateFailed, setUpdateFailed] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(initialAutoUpdate);
  const [supportPromptEnabled, setSupportPromptEnabled] = useState(initialSupportEnabled);
  const [supportHiddenSession, setSupportHiddenSession] = useState(false);
  const [recentProjects, setRecentProjects] = useState<readonly RecentProject[]>(() =>
    services.directory.listRecentProjects(),
  );

  const store = useCourseState(services);
  const { project, courseState } = store;

  const closeLessonAfterDelete = (lessonId: string) => {
    const ready = store.courseState?.status === "ready" ? store.courseState.course : null;
    const lesson = ready?.lessons.find((entry) => entry.id === lessonId);
    if (!lesson) return;
    setOpenPartId((current) =>
      current && lesson.parts.some((part) => part.id === current) ? null : current,
    );
  };

  const { saveProject, saveAttribution } = useProjectActions(services, store);
  const outlineActions = useOutlineActions(services, store, locale, closeLessonAfterDelete);
  const contentActions = useContentActions(services, store);
  const partActions = usePartActions(services, store, locale);
  const mediaActions = useMediaActions(services, store);
  const draftActions = useDrafts(services, store);

  const openPartView = (_lessonId: string, partId: string) => {
    setOpenPartId(partId);
  };

  const deletePart = async (lessonId: string, partId: string) => {
    const result = await partActions.deletePart(lessonId, partId);
    setOpenPartId((current) => (current === partId ? null : current));
    return result;
  };

  const messages = getMessages(locale);
  const isDark = themePreference === "dark" || (themePreference === "system" && systemDark);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = isDark ? "dark" : "light";
    root.dataset.themePreference = themePreference;
    localStorage.setItem("asakiri-theme", themePreference);
  }, [isDark, themePreference]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setSystemDark(query.matches);
    };
    query.addEventListener("change", onChange);
    return () => {
      query.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem("asakiri-locale", locale);
  }, [locale]);

  useEffect(() => {
    localStorage.setItem("asakiri-auto-update", autoUpdate ? "true" : "false");
  }, [autoUpdate]);

  useEffect(() => {
    localStorage.setItem("asakiri-support-dismissed", supportPromptEnabled ? "false" : "true");
  }, [supportPromptEnabled]);

  useEffect(() => {
    if (!autoUpdate) return;
    let cancelled = false;
    void services.appUpdate.check().then((available) => {
      if (!cancelled) setUpdate(available);
    });
    return () => {
      cancelled = true;
    };
  }, [services, autoUpdate]);

  useEffect(() => {
    let cancelled = false;
    void services.appUpdate.getCurrentVersion().then((value) => {
      if (!cancelled) setAppVersion(value);
    });
    return () => {
      cancelled = true;
    };
  }, [services]);

  useEffect(
    () =>
      services.menu.onOpenPreferences(() => {
        setSettingsOpen(true);
      }),
    [services],
  );

  const installUpdate = async () => {
    setUpdateInstalling(true);
    setUpdateFailed(false);
    try {
      await services.appUpdate.downloadAndInstall();
      await services.appUpdate.relaunch();
    } catch {
      setUpdateInstalling(false);
      setUpdateFailed(true);
    }
  };

  const openPatreon = () => {
    void services.links.open(PATREON_URL);
  };

  const dismissSupportLater = () => {
    setSupportHiddenSession(true);
  };

  const dismissSupportForever = () => {
    setSupportPromptEnabled(false);
  };

  const changeSupportPrompt = (enabled: boolean) => {
    setSupportPromptEnabled(enabled);
    if (enabled) setSupportHiddenSession(false);
  };

  const clearRecents = () => {
    services.directory.clearRecentProjects();
    setRecentProjects([]);
  };

  const checkForUpdates = useCallback(async () => {
    const available = await services.appUpdate.check();
    setUpdate(available);
    return available;
  }, [services]);

  const selectLocale = (next: Locale) => {
    setLocale(next);
  };

  const enterWorkspace = (directory: ProjectDirectory) => {
    store.openProject(directory);
    setSection("lessons");
    setOpenPartId(null);
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
    setOpenPartId(null);
    setView("start");
  };

  const navigate = (target: WorkspaceSection) => {
    setSection(target);
  };

  const openDraft = (id: string | null) => {
    setDraftSelectedId(id);
    setDraftQuery("");
    setDraftHitActive(0);
    setDraftHitTotal(0);
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
          update={update}
          updateInstalling={updateInstalling}
          updateFailed={updateFailed}
          recentProjects={recentProjects}
          showSupport={supportPromptEnabled && !supportHiddenSession}
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
          onOpenSettings={() => {
            setSettingsOpen(true);
          }}
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
    const openPartLesson =
      course && openPartId
        ? (course.lessons.find((lesson) => lesson.parts.some((part) => part.id === openPartId)) ??
          null)
        : null;
    const openPart = openPartLesson
      ? (openPartLesson.parts.find((part) => part.id === openPartId) ?? null)
      : null;
    const saveStatus =
      section === "lessons" && openPart && partSaveState !== "idle"
        ? {
            label:
              partSaveState === "saving"
                ? messages.common.saving
                : partSaveState === "failed"
                  ? messages.common.saveFailed
                  : messages.common.saved,
            tone: (partSaveState === "failed" ? "warning" : "default") as StatusTone,
          }
        : undefined;

    return (
      <WorkspaceShell
        projectName={projectName}
        projectLocation={projectLocation}
        active={section}
        onNavigate={navigate}
        onBack={goToStart}
        onOpenSettings={() => {
          setSettingsOpen(true);
        }}
        saveStatus={saveStatus}
        flush={course !== null}
      >
        {courseState?.status === "loading" ? null : courseState?.status === "failed" ? (
          <WorkspaceMessage
            title={messages.workspace.failedTitle}
            body={messages.workspace.failedBody}
          />
        ) : course ? (
          section === "details" ? (
            <Suspense fallback={null}>
              <CourseDetails
                course={course}
                location={projectLocation}
                onSaveProject={saveProject}
                onRevealFolder={revealFolder}
                onImportImage={mediaActions.importAssetForField}
                onLoadAssetPreview={mediaActions.loadAssetPreview}
                attributionSlot={
                  <CourseAttribution course={course} onSaveAttribution={saveAttribution} />
                }
              />
            </Suspense>
          ) : section === "content" ? (
            <Suspense fallback={null}>
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
                sidebarCollapsed={collectionsCollapsed}
                onSidebarCollapsedChange={setCollectionsCollapsed}
              />
            </Suspense>
          ) : section === "media" ? (
            <Suspense fallback={null}>
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
                inspectorCollapsed={mediaInspectorCollapsed}
                onInspectorCollapsedChange={setMediaInspectorCollapsed}
                selection={mediaSelection}
                onSelectionChange={setMediaSelection}
                selectedId={mediaSelectedId}
                onSelectedIdChange={setMediaSelectedId}
                onMoveAsset={mediaActions.moveAssetToFolder}
                onCreateFolder={mediaActions.createFolder}
                onRenameFolder={mediaActions.renameFolder}
                onDeleteFolder={mediaActions.deleteFolder}
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
            </Suspense>
          ) : (
            <LessonWorkspace
              outlineSlot={
                <CourseStructure
                  variant="sidebar"
                  course={course}
                  selectedId={openPartId ?? undefined}
                  onNewUnit={outlineActions.addUnit}
                  onRenameUnit={outlineActions.renameUnit}
                  onDeleteUnit={outlineActions.deleteUnit}
                  onAddLesson={outlineActions.addLesson}
                  onRenameLesson={outlineActions.renameLesson}
                  onDeleteLesson={outlineActions.deleteLesson}
                  onReorderOutline={outlineActions.reorderOutline}
                  onOpenPart={openPartView}
                  onReorderParts={partActions.reorderParts}
                  onAddPart={(lessonId, kind) => {
                    void partActions.addPart(lessonId, kind).then((partId) => {
                      if (partId) setOpenPartId(partId);
                    });
                  }}
                  onRenamePart={partActions.renamePart}
                  onDeletePart={deletePart}
                  query={outlineQuery}
                />
              }
              outlineFooter={
                course.outline.length > 0 ? (
                  <OutlineSearch value={outlineQuery} onChange={setOutlineQuery} />
                ) : undefined
              }
              outlineCollapsed={outlineCollapsed}
              onOutlineCollapsedChange={setOutlineCollapsed}
              referenceCollapsed={referenceCollapsed}
              onReferenceCollapsedChange={setReferenceCollapsed}
              editorSlot={
                openPart && openPartLesson ? (
                  <Suspense fallback={null}>
                    <PartEditor
                      part={openPart}
                      course={course}
                      onSaveDocument={(partId, document) =>
                        partActions.savePartDocument(openPartLesson.id, partId, document)
                      }
                      onSaveExercise={(partId, exercise) =>
                        partActions.savePartExercise(openPartLesson.id, partId, exercise)
                      }
                      onSaveRecord={contentActions.saveRecord}
                      onLoadAssetPreview={mediaActions.loadAssetPreview}
                      onImportMedia={mediaActions.importAssetForField}
                      onSaveStateChange={setPartSaveState}
                    />
                  </Suspense>
                ) : undefined
              }
              previewSlot={
                openPart ? (
                  <Suspense fallback={null}>
                    <PartPreview
                      part={openPart}
                      course={course}
                      library={courseToRichLibrary(course)}
                      onLoadAssetPreview={mediaActions.loadAssetPreview}
                    />
                  </Suspense>
                ) : undefined
              }
              draftsSlot={
                <Suspense fallback={null}>
                  <DraftsPanel
                    drafts={draftActions.drafts}
                    query={draftQuery}
                    searchActive={draftHitActive}
                    onSearchTotal={setDraftHitTotal}
                    selectedId={draftSelectedId}
                    onSelect={openDraft}
                    onUpdate={draftActions.updateDraft}
                    onRename={draftActions.renameDraft}
                    onDelete={draftActions.deleteDraft}
                    library={courseToRichLibrary(course)}
                    onLoadAssetPreview={mediaActions.loadAssetPreview}
                  />
                </Suspense>
              }
              draftsActions={
                <DraftsToolbar
                  editing={draftSelectedId !== null}
                  onBack={() => {
                    openDraft(null);
                  }}
                  onCreate={draftActions.createDraft}
                  onUpload={draftActions.uploadDraft}
                  onOpen={openDraft}
                />
              }
              draftsFooter={
                draftSelectedId !== null ? (
                  <DraftsSearch
                    value={draftQuery}
                    total={draftHitTotal}
                    active={draftHitActive}
                    onChange={(next) => {
                      setDraftQuery(next);
                      setDraftHitActive(0);
                    }}
                    onPrev={() => {
                      setDraftHitActive((current) =>
                        draftHitTotal === 0 ? 0 : (current - 1 + draftHitTotal) % draftHitTotal,
                      );
                    }}
                    onNext={() => {
                      setDraftHitActive((current) =>
                        draftHitTotal === 0 ? 0 : (current + 1) % draftHitTotal,
                      );
                    }}
                  />
                ) : undefined
              }
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
        <div className={styles.titlebar} data-tauri-drag-region />
        {renderView()}
        {view === "workspace" && courseState?.status === "loading" ? (
          <div className={styles.openingOverlay} role="presentation">
            <div className={styles.openingDialog} role="alertdialog" aria-busy="true">
              <p className={styles.openingTitle}>{messages.workspace.openingTitle}</p>
              <p className={styles.openingBody}>{messages.workspace.openingBody}</p>
            </div>
          </div>
        ) : null}
        {importDialog}
        {importNotice !== null ? (
          <ImportNotice
            code={importNotice}
            onDismiss={() => {
              setImportNotice(null);
            }}
          />
        ) : null}
        <SettingsDialog
          open={settingsOpen}
          onClose={() => {
            setSettingsOpen(false);
          }}
          themePreference={themePreference}
          onThemePreferenceChange={setThemePreference}
          locale={locale}
          onLocaleChange={selectLocale}
          version={appVersion}
          update={update}
          updateInstalling={updateInstalling}
          updateFailed={updateFailed}
          checkForUpdates={checkForUpdates}
          onInstallUpdate={() => {
            void installUpdate();
          }}
          autoUpdate={autoUpdate}
          onAutoUpdateChange={setAutoUpdate}
          supportPromptEnabled={supportPromptEnabled}
          onSupportPromptChange={changeSupportPrompt}
          recentCount={recentProjects.length}
          onClearRecents={clearRecents}
          onSupport={openPatreon}
          onOpenExternal={(url) => {
            void services.links.open(url);
          }}
          listAvailableVoices={() => services.tts.listAvailableVoices()}
          downloadVoice={(voiceId, onProgress) => services.tts.downloadVoice(voiceId, onProgress)}
          removeVoice={(voiceId) => services.tts.removeVoice(voiceId)}
        />
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
