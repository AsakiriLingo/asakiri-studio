import { useCallback, useEffect, useRef, useState } from "react";
import { createProjectSession, type ProjectDirectory, type ProjectSession } from "@core/projects";
import type { AppServices } from "@app/services";
import type { CourseState, CourseWriteContext } from "@app/course-state";

export interface CourseStateStore {
  readonly project: ProjectDirectory | null;
  readonly courseState: CourseState | null;
  readonly openProject: (directory: ProjectDirectory) => void;
  readonly closeProject: () => void;
  readonly withCourse: <T>(
    fallback: T,
    task: (context: CourseWriteContext) => Promise<T>,
  ) => Promise<T>;
  readonly withProject: <T>(
    fallback: T,
    task: (session: ProjectSession) => Promise<T>,
  ) => Promise<T>;
}

export function useCourseState(services: AppServices): CourseStateStore {
  const [project, setProjectState] = useState<ProjectDirectory | null>(null);
  const [courseState, setCourseStateDirect] = useState<CourseState | null>(null);

  const projectRef = useRef<ProjectDirectory | null>(null);
  const courseStateRef = useRef<CourseState | null>(null);
  const writeQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  const setProject = (next: ProjectDirectory | null) => {
    projectRef.current = next;
    setProjectState(next);
  };

  const setCourseState = useCallback(
    (next: CourseState | null | ((current: CourseState | null) => CourseState | null)) => {
      const value = typeof next === "function" ? next(courseStateRef.current) : next;
      courseStateRef.current = value;
      setCourseStateDirect(value);
    },
    [],
  );

  const openProject = (directory: ProjectDirectory) => {
    setProject(directory);
    setCourseState({ status: "loading" });
  };

  const closeProject = () => {
    setProject(null);
    setCourseState(null);
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
  }, [project, services, setCourseState]);

  const enqueueWrite = <T>(task: () => Promise<T>): Promise<T> => {
    const run = writeQueueRef.current.then(task);
    writeQueueRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const withCourse = <T>(
    fallback: T,
    task: (context: CourseWriteContext) => Promise<T>,
  ): Promise<T> => {
    const activeProject = projectRef.current;
    if (!activeProject) return Promise.resolve(fallback);
    return enqueueWrite(async () => {
      const state = courseStateRef.current;
      if (projectRef.current !== activeProject || state?.status !== "ready") return fallback;
      const apply: CourseWriteContext["apply"] = (updater) => {
        if (projectRef.current !== activeProject) return;
        setCourseState((current) => (current?.status === "ready" ? updater(current) : current));
      };
      return task({
        session: createProjectSession(activeProject),
        course: state.course,
        sources: state.sources,
        apply,
      });
    });
  };

  const withProject = <T>(
    fallback: T,
    task: (session: ProjectSession) => Promise<T>,
  ): Promise<T> => {
    const activeProject = projectRef.current;
    if (!activeProject) return Promise.resolve(fallback);
    return enqueueWrite(() => task(createProjectSession(activeProject)));
  };

  return { project, courseState, openProject, closeProject, withCourse, withProject };
}
