import { useEffect, useState } from "react";
import type { Course } from "@core/course";
import type { ProjectReader } from "@core/project-reading";
import type { ProjectSession } from "@core/projects";

export type CourseLoadState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly course: Course }
  | { readonly status: "failed" };

export function useCourse(session: ProjectSession, reader?: ProjectReader): CourseLoadState {
  const [state, setState] = useState<CourseLoadState>(
    reader ? { status: "loading" } : { status: "failed" },
  );

  useEffect(() => {
    if (!reader) return;

    let active = true;

    void reader
      .readCourse(session)
      .then((result) => {
        if (!active) return;
        setState(
          result.status === "ready"
            ? { status: "ready", course: result.data }
            : { status: "failed" },
        );
      })
      .catch(() => {
        if (active) setState({ status: "failed" });
      });

    return () => {
      active = false;
    };
  }, [reader, session]);

  return state;
}
