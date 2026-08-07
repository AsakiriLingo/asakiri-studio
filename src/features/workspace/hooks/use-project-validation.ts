import { useEffect, useState } from "react";
import type { ProjectReader } from "@core/project-reading";
import type { ProjectSession } from "@core/projects";
import type { WorkspaceOpenState } from "@features/workspace/model/workspace-open-state";

export function useProjectValidation(
  session: ProjectSession,
  reader?: ProjectReader,
): WorkspaceOpenState {
  const [state, setState] = useState<WorkspaceOpenState>(
    reader ? { status: "validating" } : { status: "ready", collections: [] },
  );

  useEffect(() => {
    if (!reader) return;

    let active = true;

    void reader
      .listContentCollections(session)
      .then((result) => {
        if (!active) return;
        if (result.status === "ready") {
          setState({ status: "ready", collections: result.data });
          return;
        }
        setState({
          status: "invalid",
          reason: result.code === "unavailable" ? "unreadable" : "unknown",
        });
      })
      .catch(() => {
        if (active) setState({ status: "invalid", reason: "unknown" });
      });

    return () => {
      active = false;
    };
  }, [reader, session]);

  return state;
}
