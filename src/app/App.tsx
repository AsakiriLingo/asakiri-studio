import { useEffect, useState, type ReactNode } from "react";
import type { Course } from "@core/course";
import type { ProjectReadErrorCode } from "@core/project-reading";
import { createProjectSession, type ProjectDirectory } from "@core/projects";
import { I18nProvider, getMessages, type Locale } from "@shared/i18n";
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
  | { readonly status: "ready"; readonly course: Course }
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
          ? { status: "ready", course: result.data }
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
            <CourseDetails course={course} location={projectLocation} />
          ) : section === "content" ? (
            <CourseContent course={course} />
          ) : section === "media" ? (
            <CourseMedia course={course} />
          ) : openLesson ? (
            <LessonEditor
              course={course}
              lesson={openLesson}
              onBackToStructure={() => {
                setOpenLessonId(null);
              }}
            />
          ) : (
            <CourseStructure
              course={course}
              onOpenLesson={(lessonId) => {
                setOpenLessonId(lessonId);
              }}
            />
          )
        ) : null}
      </WorkspaceShell>
    );
  }

  return <I18nProvider locale={locale}>{renderView()}</I18nProvider>;
}

function WorkspaceMessage({ title, body }: { readonly title: string; readonly body: string }) {
  return (
    <div className={styles.message}>
      <h1 className={styles.messageTitle}>{title}</h1>
      <p className={styles.messageBody}>{body}</p>
    </div>
  );
}
