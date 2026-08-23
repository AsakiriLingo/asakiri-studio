import { useCallback, useEffect, useRef, useState } from "react";
import type { Course } from "@core/course";
import { createProjectSession } from "@core/projects";
import type { ReleaseHistoryEntry, ReleaseState } from "@core/packaging";
import { buildRelease } from "@features/release";
import type { AppServices } from "@app/services";
import type { CourseStateStore } from "@app/useCourseState";

export type ReleaseStatus = "idle" | "pending" | "rebuilding" | "upToDate" | "error";

export interface ReleaseController {
  readonly status: ReleaseStatus;
  readonly revision: number | null;
  readonly version: string | null;
  readonly history: readonly ReleaseHistoryEntry[];
  readonly uploadedMark: string | null;
  readonly changedSinceUpload: number;
  readonly missingAssets: number;
  readonly markUploaded: (entryId: string | null) => void;
  readonly openFolder: () => void;
}

const REBUILD_IDLE_MS = 30000;

function changedSince(history: readonly ReleaseHistoryEntry[], mark: string | null): number {
  if (mark === null) return 0;
  const names = new Set<string>();
  for (const entry of history) {
    if (entry.id === mark) break;
    for (const file of entry.addedOrReplaced) names.add(file.name);
    for (const file of entry.deleted) names.add(file.name);
  }
  return names.size;
}

export function useRelease(services: AppServices, store: CourseStateStore): ReleaseController {
  const deps = services.release;
  const [state, setState] = useState<ReleaseState | null>(null);
  const [status, setStatus] = useState<ReleaseStatus>("idle");
  const lastBuiltCourse = useRef<Course | null>(null);

  const project = store.project;
  const courseState = store.courseState;
  const ready = courseState?.status === "ready" ? courseState : null;
  const course = ready?.course ?? null;
  const sources = ready?.sources ?? null;

  useEffect(() => {
    lastBuiltCourse.current = null;
    let cancelled = false;
    const load = async (): Promise<ReleaseState | null> => {
      if (!deps || !project) return null;
      return deps.store.load(project.id);
    };
    void load()
      .then((loaded) => {
        if (cancelled) return;
        setState(loaded);
        setStatus(loaded ? "upToDate" : "idle");
      })
      .catch((error: unknown) => {
        console.error("release: failed to load release state", error);
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [deps, project]);

  useEffect(() => {
    if (!deps || !project || !course || !sources) return;
    const isEdit = lastBuiltCourse.current !== null && lastBuiltCourse.current !== course;
    if (isEdit) setStatus("pending");
    const session = createProjectSession(project);
    const timer = setTimeout(() => {
      setStatus("rebuilding");
      void buildRelease(deps, session, course, sources)
        .then((next) => {
          lastBuiltCourse.current = course;
          setState(next);
          setStatus("upToDate");
        })
        .catch((error: unknown) => {
          console.error("release: failed to build release", error);
          setStatus("error");
        });
    }, REBUILD_IDLE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [deps, project, course, sources]);

  const markUploaded = useCallback(
    (entryId: string | null) => {
      if (!deps || !project || !state) return;
      const next: ReleaseState = { ...state, uploadedMark: entryId };
      setState(next);
      void deps.store.save(project.id, next).catch(() => {
        setStatus("error");
      });
    },
    [deps, project, state],
  );

  const openFolder = useCallback(() => {
    if (!project) return;
    void services.system.revealFolder(createProjectSession(project)).catch(() => {
      /* opening the folder is best-effort */
    });
  }, [services, project]);

  return {
    status,
    revision: state?.revision ?? null,
    version: course?.project.version ?? state?.manifest.course.version ?? null,
    history: state?.history ?? [],
    uploadedMark: state?.uploadedMark ?? null,
    changedSinceUpload: changedSince(state?.history ?? [], state?.uploadedMark ?? null),
    missingAssets: state?.missingAssets ?? 0,
    markUploaded,
    openFolder,
  };
}
