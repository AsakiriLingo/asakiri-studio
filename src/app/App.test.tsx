import type { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Asset,
  Collection,
  ContentRecord,
  Course,
  CourseProject,
  CourseSources,
  Exercise,
  Part,
  TiptapDocument,
} from "@core/course";
import { createDefaultExercise } from "@core/course";
import type { AvailableUpdate } from "@core/app-update";
import type { TtsSaveResult } from "@core/tts";
import type { PickedMediaFile } from "@core/project-media";
import type { ProjectWriteResult } from "@core/project-writing";
import type { ProjectDirectory, ProjectSession, RecentProject } from "@core/projects";
import type { DocumentTable } from "@core/documents";
import { getMessages } from "@shared/i18n";
import { installMatchMediaMock } from "../test/install-match-media-mock";
import { App } from "@app/App";

interface StartProps {
  readonly update: AvailableUpdate | null;
  readonly updateInstalling: boolean;
  readonly recentProjects: readonly RecentProject[];
  readonly showSupport: boolean;
  readonly onInstallUpdate: () => void;
  readonly onSupport: () => void;
  readonly onSupportLater: () => void;
  readonly onSupportDismiss: () => void;
  readonly onNewCourse: () => void;
  readonly onOpenCourse: () => void;
  readonly onOpenRecent: (id: string) => void;
  readonly onOpenSettings: () => void;
}

interface SettingsProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly themePreference: string;
  readonly onThemePreferenceChange: (preference: string) => void;
  readonly locale: string;
  readonly onLocaleChange: (locale: string) => void;
  readonly version: string;
  readonly update: AvailableUpdate | null;
  readonly updateInstalling: boolean;
  readonly checkForUpdates: () => Promise<AvailableUpdate | null>;
  readonly onInstallUpdate: () => void;
  readonly onSupport: () => void;
  readonly onOpenExternal: (url: string) => void;
}

interface ShellProps {
  readonly projectName: string;
  readonly projectLocation: string;
  readonly active: string;
  readonly onNavigate: (section: string) => void;
  readonly onBack: () => void;
  readonly children: ReactNode;
}

interface DetailsProps {
  readonly course: Course;
  readonly location: string;
  readonly onSaveProject: (
    update: (current: CourseProject) => CourseProject,
  ) => Promise<ProjectWriteResult>;
  readonly onRevealFolder: () => void;
  readonly onImportImage: () => Promise<Asset | null>;
  readonly onLoadAssetPreview: (assetId: string) => Promise<string | null>;
  readonly attributionSlot?: ReactNode;
}

interface StructureProps {
  readonly course: Course;
  readonly onNewUnit: () => Promise<ProjectWriteResult>;
  readonly onRenameUnit: (unitId: string, title: string) => Promise<ProjectWriteResult>;
  readonly onDeleteUnit: (unitId: string) => Promise<ProjectWriteResult>;
  readonly onAddLesson: (unitId: string) => Promise<ProjectWriteResult>;
  readonly onRenameLesson: (lessonId: string, title: string) => Promise<ProjectWriteResult>;
  readonly onDeleteLesson: (lessonId: string) => Promise<ProjectWriteResult>;
  readonly onReorderOutline: (
    sections: readonly { readonly id: string; readonly lessonIds: readonly string[] }[],
  ) => Promise<ProjectWriteResult>;
  readonly onOpenPart: (lessonId: string, partId: string) => void;
  readonly onReorderParts: (
    lessonId: string,
    orderedPartIds: readonly string[],
  ) => Promise<ProjectWriteResult>;
  readonly onAddPart: (lessonId: string, kind: string) => void;
  readonly onRenamePart: (
    lessonId: string,
    partId: string,
    title: string,
  ) => Promise<ProjectWriteResult>;
  readonly onDeletePart: (lessonId: string, partId: string) => Promise<ProjectWriteResult>;
  readonly onDuplicateUnit?: (unitId: string) => Promise<ProjectWriteResult>;
  readonly onDuplicateLesson?: (lessonId: string) => Promise<ProjectWriteResult>;
  readonly onDuplicatePart?: (lessonId: string, partId: string) => Promise<ProjectWriteResult>;
  readonly onMoveLesson?: (lessonId: string, unitId: string) => Promise<ProjectWriteResult>;
  readonly selectedId?: string;
}

interface ContentProps {
  readonly course: Course;
  readonly onSaveRecord: (record: ContentRecord) => Promise<ProjectWriteResult>;
  readonly onAddRecord: (record: ContentRecord) => Promise<ProjectWriteResult>;
  readonly onDeleteRecord: (recordId: string) => Promise<ProjectWriteResult>;
  readonly onAddCollection: (collection: Collection) => Promise<ProjectWriteResult>;
  readonly onUpdateCollection: (collection: Collection) => Promise<ProjectWriteResult>;
  readonly onDeleteCollection: (collectionId: string) => Promise<ProjectWriteResult>;
  readonly onImportAsset: () => Promise<Asset | null>;
  readonly onImportSpreadsheet: () => Promise<void>;
  readonly onLoadPreview: (assetId: string) => Promise<string | null>;
}

interface MediaProps {
  readonly course: Course;
  readonly onImportMedia: () => Promise<ProjectWriteResult | null>;
  readonly onImportMediaFolder: () => Promise<ProjectWriteResult | null>;
  readonly onDeleteAsset: (assetId: string) => Promise<ProjectWriteResult>;
  readonly onLoadPreview: (assetId: string) => Promise<string | null>;
  readonly onSearchImages: (query: string, page: number) => Promise<unknown>;
  readonly onSearchAudio: (query: string, page: number) => Promise<unknown>;
  readonly onAddRemoteMedia: (
    url: string,
    fileName: string,
    metadata?: Readonly<Record<string, unknown>>,
  ) => Promise<ProjectWriteResult | null>;
  readonly onRenameAsset: (assetId: string, name: string) => Promise<ProjectWriteResult>;
  readonly onListTtsVoices: () => Promise<unknown>;
  readonly onPreviewTtsVoice: (text: string, voice: string) => Promise<string>;
  readonly onListAvailableVoices: () => Promise<unknown>;
  readonly onDownloadVoice: (
    voiceId: string,
    onProgress?: (downloaded: number, total: number) => void,
  ) => Promise<boolean>;
  readonly onRemoveVoice: (voiceId: string) => Promise<boolean>;
  readonly onAddTtsAudio: (text: string, voice: string, fileName: string) => Promise<TtsSaveResult>;
  readonly onAddRecording: (
    bytes: Uint8Array,
    mimeType: string,
    ext: string,
  ) => Promise<ProjectWriteResult | null>;
}

interface AttributionProps {
  readonly course: Course;
  readonly onSaveAttribution: (markdown: string) => Promise<ProjectWriteResult>;
}

interface PartProps {
  readonly course: Course;
  readonly part: Part;
  readonly onSaveDocument: (
    partId: string,
    document: TiptapDocument,
  ) => Promise<ProjectWriteResult>;
  readonly onSaveExercise: (partId: string, exercise: Exercise) => Promise<ProjectWriteResult>;
}

interface PartPreviewProps {
  readonly course: Course;
  readonly part: Part;
  readonly library: unknown;
}

interface NewCourseProps {
  readonly onCancel: () => void;
  readonly createCourse: (name: string) => Promise<unknown>;
  readonly onCreated: (directory: ProjectDirectory) => void;
}

interface ImporterProps {
  readonly fileName: string;
  readonly tables: readonly DocumentTable[];
  readonly onCancel: () => void;
  readonly onImport: (
    request: unknown,
    onProgress: (written: number) => void,
  ) => Promise<ProjectWriteResult>;
}

interface Captured {
  start?: StartProps;
  settings?: SettingsProps;
  shell?: ShellProps;
  details?: DetailsProps;
  structure?: StructureProps;
  content?: ContentProps;
  media?: MediaProps;
  attribution?: AttributionProps;
  part?: PartProps;
  partPreview?: PartPreviewProps;
  newCourse?: NewCourseProps;
  importer?: ImporterProps;
}

const captured = vi.hoisted((): Record<string, unknown> => ({})) as Captured;

vi.mock("@features/start", () => ({
  StartScreen: (props: StartProps) => {
    captured.start = props;
    return <div data-testid="start" />;
  },
}));

vi.mock("@features/settings", () => ({
  SettingsDialog: (props: SettingsProps) => {
    captured.settings = props;
    return <div data-testid="settings" />;
  },
}));

vi.mock("@features/workspace-shell", () => ({
  WorkspaceShell: (props: ShellProps) => {
    captured.shell = props;
    return <div data-testid="shell">{props.children}</div>;
  },
}));

vi.mock("@features/course-details/CourseDetails", () => ({
  CourseDetails: (props: DetailsProps) => {
    captured.details = props;
    return <div data-testid="details">{props.attributionSlot}</div>;
  },
}));

vi.mock("@features/course-structure", () => ({
  CourseStructure: (props: StructureProps) => {
    captured.structure = props;
    return <div data-testid="structure" />;
  },
  OutlineSearch: () => <div data-testid="outline-search" />,
}));

vi.mock("@features/content/CourseContent", () => ({
  CourseContent: (props: ContentProps) => {
    captured.content = props;
    return <div data-testid="content" />;
  },
}));

vi.mock("@features/media/CourseMedia", () => ({
  CourseMedia: (props: MediaProps) => {
    captured.media = props;
    return <div data-testid="media" />;
  },
}));

vi.mock("@features/attribution/CourseAttribution", () => ({
  CourseAttribution: (props: AttributionProps) => {
    captured.attribution = props;
    return <div data-testid="attribution" />;
  },
}));

vi.mock("@features/lesson-editor/PartEditor", () => ({
  PartEditor: (props: PartProps) => {
    captured.part = props;
    return <div data-testid="part-editor" />;
  },
}));

vi.mock("@features/lesson-editor/rich-library", () => ({
  courseToRichLibrary: () => ({}),
}));

vi.mock("@features/part-preview/PartPreview", () => ({
  PartPreview: (props: PartPreviewProps) => {
    captured.partPreview = props;
    return <div data-testid="part-preview" />;
  },
}));

vi.mock("@features/new-course", () => ({
  NewCourseDialog: (props: NewCourseProps) => {
    captured.newCourse = props;
    return <div data-testid="new-course" />;
  },
}));

vi.mock("@features/import", () => ({
  SpreadsheetImport: (props: ImporterProps) => {
    captured.importer = props;
    return <div data-testid="importer" />;
  },
}));

const box = vi.hoisted((): { services: unknown } => ({ services: undefined }));

vi.mock("@app/services", () => ({
  createAppServices: () => box.services,
}));

const SAVED: ProjectWriteResult = { status: "saved" };
const MESSAGES = getMessages("en");

const DIR_A: ProjectDirectory = { id: "p1", name: "Course A", locationLabel: "/tmp/a" };
const DIR_B: ProjectDirectory = { id: "p2", name: "Course B", locationLabel: "/tmp/b" };

function makeProject(title: string): CourseProject {
  return {
    id: `course_${title.toLowerCase().replace(/\s+/g, "_")}`,
    title,
    subtitle: "",
    description: "",
    defaultLocale: "en",
    learningLocales: ["ja"],
    taughtFlag: "jp",
    taughtFlagAssetId: null,
    level: "a1",
    estimatedLength: "",
    version: "",
    releasedOn: "",
    license: "bySa",
    copyrightHolder: "",
    copyrightYear: "",
    coverAssetId: null,
    contributors: [],
    funding: [],
    sponsors: [],
  };
}

const DOCUMENT: TiptapDocument = { type: "doc", content: [] };

function makeCourse(title: string): Course {
  return {
    project: makeProject(title),
    collections: [{ id: "c0", name: "Vocabulary", fields: [] }],
    records: [{ id: "r0", collectionId: "c0", fields: {} }],
    assets: [
      {
        id: "a1",
        kind: "image",
        label: "cat",
        availability: "ready",
        file: "cat.png",
        mimeType: "image/png",
      },
    ],
    lessons: [
      {
        id: "l1",
        title: "Lesson 1",
        parts: [
          { id: "part1", title: "Reading", content: { kind: "tiptap", document: DOCUMENT } },
          {
            id: "part2",
            title: "Quiz",
            content: { kind: "exercise", exercise: createDefaultExercise("multiple-choice") },
          },
        ],
      },
    ],
    mediaFolders: [],
    outline: [{ id: "u1", title: "Unit 1", lessonIds: ["l1"] }],
  };
}

const SOURCES: CourseSources = {
  project: "project.json",
  collections: { c0: "content/collections/c0.json" },
  records: { r0: "content/records/r0.json" },
  assets: { a1: "media/assets/a1/asset.json" },
  lessons: { l1: "lessons/l1/lesson.json" },
  parts: {
    "l1::part1": "lessons/l1/parts/part1/document.json",
    "l1::part2": "lessons/l1/parts/part2/exercise.json",
  },
};

function makeWriter() {
  return {
    updateProject: vi.fn().mockResolvedValue(SAVED),
    updateOutline: vi.fn().mockResolvedValue(SAVED),
    updateRecord: vi.fn().mockResolvedValue(SAVED),
    updatePartDocument: vi.fn().mockResolvedValue(SAVED),
    updatePartExercise: vi.fn().mockResolvedValue(SAVED),
    updatePartContentTitle: vi.fn().mockResolvedValue(SAVED),
    updatePartTitle: vi.fn().mockResolvedValue(SAVED),
    deletePart: vi.fn().mockResolvedValue(SAVED),
    createPart: vi.fn().mockResolvedValue(SAVED),
    createExercisePart: vi.fn().mockResolvedValue(SAVED),
    reorderParts: vi.fn().mockResolvedValue(SAVED),
    duplicatePart: vi.fn().mockResolvedValue(SAVED),
    duplicateLessons: vi.fn().mockResolvedValue(SAVED),
    createLesson: vi.fn().mockResolvedValue(SAVED),
    updateLesson: vi.fn().mockResolvedValue(SAVED),
    deleteLesson: vi.fn().mockResolvedValue(SAVED),
    createRecord: vi.fn().mockResolvedValue(SAVED),
    createRecords: vi.fn().mockResolvedValue(SAVED),
    deleteRecord: vi.fn().mockResolvedValue(SAVED),
    createCollection: vi.fn().mockResolvedValue(SAVED),
    deleteCollection: vi.fn().mockResolvedValue(SAVED),
    updateCollection: vi.fn().mockResolvedValue(SAVED),
    importAsset: vi.fn().mockResolvedValue(SAVED),
    deleteAsset: vi.fn().mockResolvedValue(SAVED),
    writeAttribution: vi.fn().mockResolvedValue(SAVED),
    renameAsset: vi.fn().mockResolvedValue(SAVED),
    importDraft: vi.fn().mockResolvedValue(SAVED),
    updateDraft: vi.fn().mockResolvedValue(SAVED),
    renameDraft: vi.fn().mockResolvedValue(SAVED),
    deleteDraft: vi.fn().mockResolvedValue(SAVED),
  };
}

function makeServices() {
  const writer = makeWriter();
  const services = {
    creation: {
      createCourse: vi.fn().mockResolvedValue({ status: "created", directory: DIR_A }),
    },
    directory: {
      listRecentProjects: vi.fn().mockReturnValue([DIR_A]),
      openProjectDirectory: vi.fn().mockResolvedValue(DIR_A),
      openRecentProject: vi
        .fn()
        .mockImplementation((id: string) =>
          Promise.resolve(id === "p1" ? DIR_A : id === "p2" ? DIR_B : null),
        ),
      forgetRecentProject: vi.fn(),
      clearRecentProjects: vi.fn(),
    },
    reader: {
      readCourse: vi.fn().mockImplementation((session: ProjectSession) =>
        Promise.resolve({
          status: "ready",
          data: {
            course: makeCourse(session.id === "p1" ? "Course A" : "Course B"),
            sources: SOURCES,
          },
        }),
      ),
      readDrafts: vi.fn().mockResolvedValue({
        status: "ready",
        data: { drafts: [], sources: { manifest: ".asakiri/drafts/drafts.json", bodies: {} } },
      }),
    },
    writer,
    system: { revealFolder: vi.fn().mockResolvedValue(undefined) },
    mediaPicker: {
      pickMediaFiles: vi.fn().mockResolvedValue([]),
      pickMediaFolder: vi.fn().mockResolvedValue([]),
    },
    assetReader: { readAssetDataUrl: vi.fn().mockResolvedValue("data:image/png;base64,xyz") },
    mediaSearch: {
      searchImages: vi.fn().mockResolvedValue({ items: [], page: 1 }),
      searchAudio: vi.fn().mockResolvedValue({ items: [], page: 1 }),
      downloadToTemp: vi.fn().mockResolvedValue({ name: "remote.png", path: "/tmp/remote.png" }),
    },
    appUpdate: {
      check: vi.fn().mockResolvedValue(null),
      downloadAndInstall: vi.fn().mockResolvedValue(undefined),
      relaunch: vi.fn().mockResolvedValue(undefined),
      getCurrentVersion: vi.fn().mockResolvedValue("0.2.5"),
    },
    menu: { onOpenPreferences: vi.fn().mockReturnValue(() => undefined) },
    appWindow: {
      focusCourseWindow: vi.fn().mockResolvedValue(false),
      setCourseWindow: vi.fn().mockResolvedValue(undefined),
    },
    links: { open: vi.fn().mockResolvedValue(undefined) },
    tts: {
      listVoices: vi.fn().mockResolvedValue([]),
      listAvailableVoices: vi.fn().mockResolvedValue([]),
      previewVoice: vi.fn().mockResolvedValue("data:audio/wav;base64,abc"),
      downloadVoice: vi.fn().mockResolvedValue(true),
      removeVoice: vi.fn().mockResolvedValue(true),
      synthesizeToTemp: vi.fn().mockResolvedValue({ name: "speech.wav", path: "/tmp/speech.wav" }),
    },
    recording: {
      saveToTemp: vi.fn().mockResolvedValue({ name: "rec.m4a", path: "/tmp/rec.m4a" }),
    },
    documents: {
      pickDocument: vi.fn().mockResolvedValue(null),
      readDocument: vi.fn().mockResolvedValue({ status: "failed", code: "unknown" }),
    },
  };
  return { services, writer };
}

type Services = ReturnType<typeof makeServices>["services"];

let services: Services;
let writer: ReturnType<typeof makeWriter>;

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

function must<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`${label} was not rendered`);
  return value;
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function openWorkspace() {
  render(<App />);
  await act(async () => {
    must(captured.start, "StartScreen").onOpenRecent("p1");
    await Promise.resolve();
  });
  await waitFor(() => {
    expect(captured.shell).toBeDefined();
  });
}

async function navigate(section: string) {
  await act(async () => {
    must(captured.shell, "WorkspaceShell").onNavigate(section);
    await Promise.resolve();
  });
  if (section === "details") {
    await waitFor(() => {
      expect(captured.details).toBeDefined();
    });
  } else if (section === "content") {
    await waitFor(() => {
      expect(captured.content).toBeDefined();
    });
  } else if (section === "media") {
    await waitFor(() => {
      expect(captured.media).toBeDefined();
    });
  }
}

beforeEach(() => {
  installMatchMediaMock();
  Object.defineProperty(window, "localStorage", {
    value: createMemoryStorage(),
    configurable: true,
  });
  localStorage.setItem("asakiri-theme", "light");
  delete captured.start;
  delete captured.shell;
  delete captured.details;
  delete captured.structure;
  delete captured.content;
  delete captured.media;
  delete captured.attribution;
  delete captured.part;
  delete captured.partPreview;
  delete captured.newCourse;
  delete captured.importer;
  const built = makeServices();
  services = built.services;
  writer = built.writer;
  box.services = services;
});

describe("App", () => {
  it("opens a recent project and shows its details", async () => {
    await openWorkspace();
    await navigate("details");

    const details = must(captured.details, "CourseDetails");
    expect(details.course.project.title).toBe("Course A");
    expect(must(captured.shell, "WorkspaceShell").projectName).toBe("Course A");
    expect(must(captured.shell, "WorkspaceShell").projectLocation).toBe("/tmp/a");
    expect(services.appWindow.setCourseWindow).toHaveBeenCalledWith(DIR_A);
  });

  it("focuses the existing window when the course is already open elsewhere", async () => {
    services.appWindow.focusCourseWindow.mockResolvedValue(true);

    render(<App />);
    await act(async () => {
      must(captured.start, "StartScreen").onOpenRecent("p1");
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(services.appWindow.focusCourseWindow).toHaveBeenCalledWith(DIR_A);
    });

    expect(captured.shell).toBeUndefined();
    expect(services.reader.readCourse).not.toHaveBeenCalled();
    expect(services.appWindow.setCourseWindow).not.toHaveBeenCalled();
  });

  it("shows the failure message when the course cannot be read", async () => {
    services.reader.readCourse.mockResolvedValue({ status: "failed", code: "unknown" });

    render(<App />);
    await act(async () => {
      must(captured.start, "StartScreen").onOpenRecent("p1");
      await Promise.resolve();
    });

    expect(await screen.findByText(MESSAGES.workspace.failedTitle)).toBeInTheDocument();
  });

  it("offers to remove a missing recent course and returns to start", async () => {
    services.reader.readCourse.mockResolvedValue({ status: "failed", code: "missing" });

    render(<App />);
    await act(async () => {
      must(captured.start, "StartScreen").onOpenRecent("p1");
      await Promise.resolve();
    });

    expect(await screen.findByText(MESSAGES.workspace.missingTitle)).toBeInTheDocument();

    const removeButton = screen.getByRole("button", { name: MESSAGES.workspace.forgetRecent });
    await act(async () => {
      fireEvent.click(removeButton);
      await Promise.resolve();
    });

    expect(services.directory.forgetRecentProject).toHaveBeenCalledWith("p1");
    expect(screen.getByTestId("start")).toBeInTheDocument();
    expect(screen.queryByText(MESSAGES.workspace.missingTitle)).not.toBeInTheDocument();
  });

  it("serializes overlapping project saves so both edits survive", async () => {
    await openWorkspace();
    await navigate("details");
    const details = must(captured.details, "CourseDetails");

    const first = deferred<ProjectWriteResult>();
    const second = deferred<ProjectWriteResult>();
    writer.updateProject.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    let saveA: Promise<ProjectWriteResult> = Promise.resolve(SAVED);
    let saveB: Promise<ProjectWriteResult> = Promise.resolve(SAVED);
    await act(async () => {
      saveA = details.onSaveProject((current) => ({ ...current, title: "New Title" }));
      saveB = details.onSaveProject((current) => ({ ...current, subtitle: "New Sub" }));
      await Promise.resolve();
    });

    expect(writer.updateProject).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve(SAVED);
      await saveA;
    });

    expect(writer.updateProject).toHaveBeenCalledTimes(2);
    const [, secondPayload] = writer.updateProject.mock.calls[1] as [ProjectSession, CourseProject];
    expect(secondPayload.title).toBe("New Title");
    expect(secondPayload.subtitle).toBe("New Sub");

    await act(async () => {
      second.resolve(SAVED);
      await saveB;
    });

    const latest = must(captured.details, "CourseDetails");
    expect(latest.course.project.title).toBe("New Title");
    expect(latest.course.project.subtitle).toBe("New Sub");
  });

  it("drops a save that completes after switching projects", async () => {
    await openWorkspace();
    await navigate("details");
    const details = must(captured.details, "CourseDetails");

    const pending = deferred<ProjectWriteResult>();
    writer.updateProject.mockReturnValueOnce(pending.promise);

    let save: Promise<ProjectWriteResult> = Promise.resolve(SAVED);
    await act(async () => {
      save = details.onSaveProject((current) => ({ ...current, title: "Sneaky" }));
      await Promise.resolve();
    });

    await act(async () => {
      must(captured.shell, "WorkspaceShell").onBack();
      await Promise.resolve();
    });
    await act(async () => {
      must(captured.start, "StartScreen").onOpenRecent("p2");
      await Promise.resolve();
    });
    await navigate("details");
    await waitFor(() => {
      expect(must(captured.details, "CourseDetails").course.project.title).toBe("Course B");
    });

    await act(async () => {
      pending.resolve(SAVED);
      await save;
    });

    expect(must(captured.details, "CourseDetails").course.project.title).toBe("Course B");
  });

  it("edits the outline through the structure section", async () => {
    await openWorkspace();
    await navigate("lessons");
    const structure = must(captured.structure, "CourseStructure");

    await act(async () => {
      await structure.onNewUnit();
    });
    let outline = must(captured.structure, "CourseStructure").course.outline;
    expect(outline).toHaveLength(2);
    const newUnitId = outline[1]?.id ?? "";

    await act(async () => {
      await structure.onRenameUnit(newUnitId, "Renamed Unit");
    });
    outline = must(captured.structure, "CourseStructure").course.outline;
    expect(outline[1]?.title).toBe("Renamed Unit");

    await act(async () => {
      await structure.onReorderOutline([
        { id: newUnitId, lessonIds: [] },
        { id: "u1", lessonIds: ["l1"] },
      ]);
    });
    outline = must(captured.structure, "CourseStructure").course.outline;
    expect(outline[0]?.id).toBe(newUnitId);

    await act(async () => {
      await structure.onDeleteUnit(newUnitId);
    });
    outline = must(captured.structure, "CourseStructure").course.outline;
    expect(outline).toHaveLength(1);
  });

  it("duplicates a unit, a lesson, and a part", async () => {
    await openWorkspace();
    await navigate("lessons");
    const structure = must(captured.structure, "CourseStructure");

    await act(async () => {
      await structure.onDuplicatePart?.("l1", "part1");
    });
    let course = must(captured.structure, "CourseStructure").course;
    const lesson = course.lessons.find((entry: Course["lessons"][number]) => entry.id === "l1");
    expect(lesson?.parts).toHaveLength(3);
    expect(lesson?.parts[1]?.title).toBe("Reading copy");
    expect(services.writer.duplicatePart).toHaveBeenCalledTimes(1);

    await act(async () => {
      await structure.onDuplicateLesson?.("l1");
    });
    course = must(captured.structure, "CourseStructure").course;
    expect(course.lessons).toHaveLength(2);
    expect(course.outline[0]?.lessonIds).toHaveLength(2);
    expect(course.lessons[1]?.title).toBe("Lesson 1 copy");

    await act(async () => {
      await structure.onDuplicateUnit?.("u1");
    });
    course = must(captured.structure, "CourseStructure").course;
    expect(course.outline).toHaveLength(2);
    expect(course.outline[1]?.title).toBe("Unit 1 copy");
    expect(course.outline[1]?.lessonIds).toHaveLength(2);
    expect(services.writer.duplicateLessons).toHaveBeenCalledTimes(2);
  });

  it("keeps a deleted unit's lesson and moves it into another unit", async () => {
    await openWorkspace();
    await navigate("lessons");
    let structure = must(captured.structure, "CourseStructure");

    await act(async () => {
      await structure.onNewUnit();
    });
    structure = must(captured.structure, "CourseStructure");
    const newUnitId = structure.course.outline[1]?.id ?? "";

    await act(async () => {
      await structure.onDeleteUnit("u1");
    });
    let course = must(captured.structure, "CourseStructure").course;
    expect(course.lessons.some((entry) => entry.id === "l1")).toBe(true);
    expect(course.outline.some((section) => section.lessonIds.includes("l1"))).toBe(false);

    await act(async () => {
      await must(captured.structure, "CourseStructure").onMoveLesson?.("l1", newUnitId);
    });
    course = must(captured.structure, "CourseStructure").course;
    expect(course.outline.find((section) => section.id === newUnitId)?.lessonIds).toContain("l1");
  });

  it("creates, renames, and deletes lessons", async () => {
    await openWorkspace();
    await navigate("lessons");
    const structure = must(captured.structure, "CourseStructure");

    await act(async () => {
      await structure.onAddLesson("u1");
    });
    let course = must(captured.structure, "CourseStructure").course;
    expect(course.lessons).toHaveLength(2);
    expect(course.outline[0]?.lessonIds).toHaveLength(2);
    const addedId = course.lessons[1]?.id ?? "";

    await act(async () => {
      await structure.onRenameLesson(addedId, "Renamed Lesson");
    });
    course = must(captured.structure, "CourseStructure").course;
    expect(course.lessons[1]?.title).toBe("Renamed Lesson");

    await act(async () => {
      await structure.onDeleteLesson(addedId);
    });
    course = must(captured.structure, "CourseStructure").course;
    expect(course.lessons).toHaveLength(1);

    const missing = await structure.onAddLesson("nope");
    expect(missing).toEqual({ status: "failed", code: "unavailable" });
  });

  it("edits lesson parts from the outline and part editor", async () => {
    await openWorkspace();
    await navigate("lessons");

    const lessonParts = () => {
      const course = must(captured.structure, "CourseStructure").course;
      return course.lessons.find((lesson) => lesson.id === "l1")?.parts ?? [];
    };

    await act(async () => {
      must(captured.structure, "CourseStructure").onOpenPart("l1", "part1");
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(captured.part).toBeDefined();
    });
    const part = must(captured.part, "PartEditor");
    expect(part.part.id).toBe("part1");

    await act(async () => {
      await part.onSaveDocument("part1", DOCUMENT);
      await part.onSaveExercise("part2", createDefaultExercise("multiple-choice"));
    });
    expect(writer.updatePartDocument).toHaveBeenCalledTimes(1);
    expect(writer.updatePartExercise).toHaveBeenCalledTimes(1);

    await act(async () => {
      await must(captured.structure, "CourseStructure").onRenamePart("l1", "part1", "Renamed Part");
    });
    expect(lessonParts()[0]?.title).toBe("Renamed Part");

    await act(async () => {
      must(captured.structure, "CourseStructure").onAddPart("l1", "rich-text");
      await Promise.resolve();
    });
    expect(writer.createPart).toHaveBeenCalledTimes(1);

    await act(async () => {
      must(captured.structure, "CourseStructure").onAddPart("l1", "multiple-choice");
      await Promise.resolve();
    });
    expect(writer.createExercisePart).toHaveBeenCalledTimes(1);
    expect(lessonParts()).toHaveLength(4);

    await act(async () => {
      await must(captured.structure, "CourseStructure").onReorderParts("l1", ["part2", "part1"]);
    });
    expect(lessonParts()[0]?.id).toBe("part2");

    await act(async () => {
      await must(captured.structure, "CourseStructure").onDeletePart("l1", "part1");
    });
    expect(lessonParts().some((entry) => entry.id === "part1")).toBe(false);
  });

  it("manages records and collections through the content section", async () => {
    await openWorkspace();
    await navigate("content");
    const content = must(captured.content, "CourseContent");

    const collection: Collection = { id: "c1", name: "Grammar", fields: [] };
    await act(async () => {
      await content.onAddCollection(collection);
    });
    expect(must(captured.content, "CourseContent").course.collections).toHaveLength(2);

    const record: ContentRecord = { id: "r1", collectionId: "c1", fields: {} };
    await act(async () => {
      await content.onAddRecord(record);
    });
    expect(must(captured.content, "CourseContent").course.records).toHaveLength(2);

    await act(async () => {
      await content.onSaveRecord({ ...record, fields: { note: { kind: "text", value: "hi" } } });
    });
    expect(writer.updateRecord).toHaveBeenCalledTimes(1);

    await act(async () => {
      await content.onUpdateCollection({ ...collection, name: "Grammar 2" });
    });
    expect(
      must(captured.content, "CourseContent").course.collections.find((c) => c.id === "c1")?.name,
    ).toBe("Grammar 2");

    await act(async () => {
      await content.onDeleteRecord("r1");
    });
    expect(must(captured.content, "CourseContent").course.records).toHaveLength(1);

    await act(async () => {
      await content.onDeleteCollection("c0");
    });
    const course = must(captured.content, "CourseContent").course;
    expect(course.collections.some((c) => c.id === "c0")).toBe(false);
    expect(course.records).toHaveLength(0);
  });

  it("imports media and manages assets", async () => {
    await openWorkspace();
    await navigate("media");
    const media = must(captured.media, "CourseMedia");

    const picked: PickedMediaFile[] = [{ name: "dog.png", path: "/tmp/dog.png" }];
    services.mediaPicker.pickMediaFiles.mockResolvedValue(picked);
    await act(async () => {
      await media.onImportMedia();
    });
    expect(writer.importAsset).toHaveBeenCalledTimes(1);
    expect(must(captured.media, "CourseMedia").course.assets).toHaveLength(2);

    services.mediaPicker.pickMediaFolder.mockResolvedValue([
      { name: "song.mp3", path: "/tmp/song.mp3" },
    ]);
    await act(async () => {
      await media.onImportMediaFolder();
    });
    expect(must(captured.media, "CourseMedia").course.assets).toHaveLength(3);

    services.mediaPicker.pickMediaFiles.mockResolvedValue([
      { name: "unknown.xyz", path: "/tmp/unknown.xyz" },
    ]);
    let unknownResult: ProjectWriteResult | null = null;
    await act(async () => {
      unknownResult = await media.onImportMedia();
    });
    expect(unknownResult).toEqual({ status: "failed", code: "unknown" });

    services.mediaPicker.pickMediaFiles.mockResolvedValue([]);
    let emptyResult: ProjectWriteResult | null = SAVED;
    await act(async () => {
      emptyResult = await media.onImportMedia();
    });
    expect(emptyResult).toBeNull();

    await act(async () => {
      await media.onAddRemoteMedia("https://example.com/remote.png", "remote.png");
    });
    expect(services.mediaSearch.downloadToTemp).toHaveBeenCalledTimes(1);

    await act(async () => {
      await media.onAddTtsAudio("hello", "en_US-amy-low", "speech.wav");
    });
    expect(services.tts.synthesizeToTemp).toHaveBeenCalledTimes(1);
    const assetsAfterTts = must(captured.media, "CourseMedia").course.assets;
    expect(assetsAfterTts[assetsAfterTts.length - 1]?.metadata).toEqual({
      sourceText: "hello",
      ttsVoice: "en_US-amy-low",
    });

    await act(async () => {
      await media.onAddRecording(new Uint8Array([1, 2]), "audio/mp4", "m4a");
    });
    expect(services.recording.saveToTemp).toHaveBeenCalledTimes(1);

    await act(async () => {
      await media.onRenameAsset("a1", "kitten");
    });
    expect(must(captured.media, "CourseMedia").course.assets.find((a) => a.id === "a1")?.file).toBe(
      "kitten.png",
    );

    const preview = await media.onLoadPreview("a1");
    expect(preview).toBe("data:image/png;base64,xyz");

    await act(async () => {
      await media.onDeleteAsset("a1");
    });
    expect(must(captured.media, "CourseMedia").course.assets.some((a) => a.id === "a1")).toBe(
      false,
    );

    await media.onSearchImages("cats", 1);
    await media.onSearchAudio("meow", 1);
    await media.onListTtsVoices();
    await media.onListAvailableVoices();
    await media.onPreviewTtsVoice("hi", "en_US-amy-low");
    await media.onDownloadVoice("en_US-amy-low");
    await media.onRemoveVoice("en_US-amy-low");
    expect(services.tts.removeVoice).toHaveBeenCalledWith("en_US-amy-low");
  });

  it("saves the attribution file", async () => {
    await openWorkspace();
    await navigate("details");
    await waitFor(() => {
      expect(captured.attribution).toBeDefined();
    });

    await act(async () => {
      await must(captured.attribution, "CourseAttribution").onSaveAttribution("# Credits");
    });
    expect(writer.writeAttribution).toHaveBeenCalledTimes(1);
  });

  it("imports a spreadsheet into a new collection", async () => {
    await openWorkspace();
    await navigate("content");
    const content = must(captured.content, "CourseContent");

    services.documents.pickDocument.mockResolvedValue({ name: "words.xlsx", path: "/tmp/w.xlsx" });
    services.documents.readDocument.mockResolvedValue({
      status: "ready",
      document: {
        format: "xlsx",
        markdown: "",
        tables: [{ headerRows: 1, rows: [["word"], ["cat"]] }],
        imageCount: 0,
      },
    });
    await act(async () => {
      await content.onImportSpreadsheet();
    });
    const importer = must(captured.importer, "SpreadsheetImport");
    expect(importer.fileName).toBe("words.xlsx");

    const progress: number[] = [];
    await act(async () => {
      await importer.onImport(
        {
          collectionId: null,
          collectionName: "Words",
          fields: [],
          primaryFieldId: null,
          created: [
            { id: "n1", collectionId: "", fields: {} },
            { id: "n2", collectionId: "", fields: {} },
          ],
          updated: [
            { id: "r0", collectionId: "c0", fields: { note: { kind: "text", value: "x" } } },
          ],
        },
        (written) => progress.push(written),
      );
    });

    expect(writer.createCollection).toHaveBeenCalledTimes(1);
    expect(writer.createRecords).toHaveBeenCalledTimes(1);
    expect(writer.updateRecord).toHaveBeenCalledTimes(1);
    expect(progress).toEqual([2, 3]);
    const course = must(captured.content, "CourseContent").course;
    expect(course.collections.some((c) => c.name === "Words")).toBe(true);
    expect(course.records).toHaveLength(3);

    await act(async () => {
      must(captured.importer, "SpreadsheetImport").onCancel();
      await Promise.resolve();
    });
  });

  it("reports spreadsheet picks that cannot be read", async () => {
    await openWorkspace();
    await navigate("content");
    const content = must(captured.content, "CourseContent");

    services.documents.pickDocument.mockResolvedValue({ name: "bad.xlsx", path: "/tmp/bad.xlsx" });
    services.documents.readDocument.mockResolvedValue({ status: "failed", code: "unreadable" });
    await act(async () => {
      await content.onImportSpreadsheet();
    });
    expect(screen.getByText(MESSAGES.importer.readFailed)).toBeInTheDocument();

    services.documents.readDocument.mockResolvedValue({
      status: "ready",
      document: { format: "xlsx", markdown: "", tables: [], imageCount: 0 },
    });
    await act(async () => {
      await content.onImportSpreadsheet();
    });
    expect(screen.getByText(MESSAGES.importer.noTables)).toBeInTheDocument();
  });

  it("drives start screen actions", async () => {
    services.appUpdate.check.mockResolvedValue({
      version: "1.0.0",
      currentVersion: "0.9.0",
      notes: "",
      date: null,
    });
    render(<App />);
    await waitFor(() => {
      expect(must(captured.start, "StartScreen").update).not.toBeNull();
    });
    const start = must(captured.start, "StartScreen");
    const settings = must(captured.settings, "SettingsDialog");

    await act(async () => {
      settings.onThemePreferenceChange("dark");
      await Promise.resolve();
    });
    expect(document.documentElement.dataset.theme).toBe("dark");

    await act(async () => {
      settings.onLocaleChange("es");
      await Promise.resolve();
    });
    expect(document.documentElement.lang).toBe("es");

    start.onSupport();
    expect(services.links.open).toHaveBeenCalledTimes(1);

    await act(async () => {
      start.onSupportLater();
      await Promise.resolve();
    });
    expect(must(captured.start, "StartScreen").showSupport).toBe(false);

    await act(async () => {
      start.onInstallUpdate();
      await Promise.resolve();
    });
    expect(services.appUpdate.downloadAndInstall).toHaveBeenCalledTimes(1);

    await act(async () => {
      start.onNewCourse();
      await Promise.resolve();
    });
    const newCourse = must(captured.newCourse, "NewCourseDialog");
    await newCourse.createCourse("Fresh Course");
    expect(services.creation.createCourse).toHaveBeenCalledTimes(1);
    await act(async () => {
      newCourse.onCreated(DIR_A);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(captured.shell).toBeDefined();
    });
  });

  it("dismisses support permanently and opens a course via the picker", async () => {
    render(<App />);
    await act(async () => {
      must(captured.start, "StartScreen").onSupportDismiss();
      await Promise.resolve();
    });
    expect(localStorage.getItem("asakiri-support-dismissed")).toBe("true");

    await act(async () => {
      must(captured.start, "StartScreen").onOpenCourse();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(captured.shell).toBeDefined();
    });
    expect(services.directory.openProjectDirectory).toHaveBeenCalledTimes(1);
  });

  it("reveals the project folder and rejects writes without a project", async () => {
    await openWorkspace();
    await navigate("details");
    const details = must(captured.details, "CourseDetails");

    details.onRevealFolder();
    expect(services.system.revealFolder).toHaveBeenCalledTimes(1);

    await act(async () => {
      must(captured.shell, "WorkspaceShell").onBack();
      await Promise.resolve();
    });
    const result = await details.onSaveProject((current) => current);
    expect(result).toEqual({ status: "failed", code: "unavailable" });
    expect(writer.updateProject).not.toHaveBeenCalled();
  });

  it("imports a single image for a field", async () => {
    await openWorkspace();
    await navigate("details");
    const details = must(captured.details, "CourseDetails");

    services.mediaPicker.pickMediaFiles.mockResolvedValue([
      { name: "flag.png", path: "/tmp/flag.png" },
      { name: "extra.png", path: "/tmp/extra.png" },
    ]);
    let asset: Asset | null = null;
    await act(async () => {
      asset = await details.onImportImage();
    });
    expect(asset).not.toBeNull();
    expect(writer.importAsset).toHaveBeenCalledTimes(1);
  });
});
