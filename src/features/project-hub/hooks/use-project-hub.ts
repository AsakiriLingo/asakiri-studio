import { useState } from "react";
import type { ProjectDirectoryGateway } from "@core/projects";
import type { ProjectHubState } from "@features/project-hub/model/project-hub-state";

export function useProjectHub(directoryGateway: ProjectDirectoryGateway) {
  const [state, setState] = useState<ProjectHubState>({ status: "idle" });

  async function openProject() {
    setState({ status: "opening" });

    try {
      const project = await directoryGateway.openProjectDirectory();
      setState(project ? { status: "opened", project } : { status: "idle" });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "The project could not be opened.",
      });
    }
  }

  return { state, openProject } as const;
}
