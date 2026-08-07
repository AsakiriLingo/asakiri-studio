import { useState } from "react";
import { ProjectDirectoryError, type ProjectDirectoryGateway } from "@core/projects";
import type { ProjectHubState } from "@features/project-hub/model/project-hub-state";

export function useProjectHub(directoryGateway: ProjectDirectoryGateway) {
  const [state, setState] = useState<ProjectHubState>({ status: "idle" });

  async function openProject(dialogTitle: string) {
    setState({ status: "opening" });

    try {
      const project = await directoryGateway.openProjectDirectory({ dialogTitle });
      setState(project ? { status: "opened", project } : { status: "idle" });
      return project;
    } catch (error) {
      setState({
        status: "error",
        code: error instanceof ProjectDirectoryError ? error.code : "unknown",
      });
      return null;
    }
  }

  return { state, openProject } as const;
}
