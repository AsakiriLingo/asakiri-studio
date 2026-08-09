import { useEffect, useState } from "react";
import { StartScreen } from "@features/start";
import { NewCourseDialog } from "@features/new-course";
import { Integrations } from "@features/integrations";
import { WorkspaceShell, type WorkspaceSection } from "@features/workspace-shell";
import { CourseStructure } from "@features/course-structure";
import { CourseContent } from "@features/content";
import { CourseMedia } from "@features/media";
import { CourseDetails } from "@features/course-details";
import { LessonEditor } from "@features/lesson-editor";

function initialDark(): boolean {
  const saved = localStorage.getItem("asakiri-theme");
  if (saved === "dark") return true;
  if (saved === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

type View = "start" | "new-course" | "integrations" | "workspace";

export function App() {
  const [isDark, setIsDark] = useState(initialDark);
  const [view, setView] = useState<View>("start");
  const [section, setSection] = useState<WorkspaceSection>("lessons");
  const [lessonOpen, setLessonOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    localStorage.setItem("asakiri-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((value) => !value);
  };

  const openWorkspace = (target: WorkspaceSection) => {
    setSection(target);
    setLessonOpen(false);
    setView("workspace");
  };

  const navigate = (target: WorkspaceSection) => {
    setSection(target);
    setLessonOpen(false);
  };

  if (view === "start") {
    return (
      <StartScreen
        isDark={isDark}
        onNewCourse={() => {
          setView("new-course");
        }}
        onOpenCourse={() => {
          openWorkspace("lessons");
        }}
        onIntegrations={() => {
          setView("integrations");
        }}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (view === "new-course") {
    return (
      <NewCourseDialog
        onCancel={() => {
          setView("start");
        }}
        onChooseFolder={() => {
          openWorkspace("details");
        }}
      />
    );
  }

  if (view === "integrations") {
    return (
      <Integrations
        isDark={isDark}
        onBack={() => {
          setView("start");
        }}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <WorkspaceShell
      projectName="Japanese Starter"
      projectLocation="~/Courses/Japanese Starter"
      active={section}
      isDark={isDark}
      onNavigate={navigate}
      onBack={() => {
        setView("start");
      }}
      onToggleTheme={toggleTheme}
    >
      {section === "details" ? (
        <CourseDetails />
      ) : section === "content" ? (
        <CourseContent />
      ) : section === "media" ? (
        <CourseMedia />
      ) : lessonOpen ? (
        <LessonEditor
          onBackToStructure={() => {
            setLessonOpen(false);
          }}
        />
      ) : (
        <CourseStructure
          onOpenLesson={() => {
            setLessonOpen(true);
          }}
        />
      )}
    </WorkspaceShell>
  );
}
