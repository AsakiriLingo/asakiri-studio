import { useState } from "react";
import { ProjectCreationError, type ProjectCreationGateway } from "@core/projects";
import type { CreateCourseState } from "@features/project-hub/model/create-course-state";

export function useCreateCourse(creationGateway: ProjectCreationGateway) {
  const [state, setState] = useState<CreateCourseState>({ status: "idle" });

  async function createCourse(name: string, dialogTitle: string) {
    setState({ status: "creating" });

    try {
      const project = await creationGateway.createCourse({ name, dialogTitle });
      setState(project ? { status: "created" } : { status: "idle" });
      return project;
    } catch (error) {
      setState({
        status: "error",
        code: error instanceof ProjectCreationError ? error.code : "unknown",
      });
      return null;
    }
  }

  function resetCreateCourse() {
    setState({ status: "idle" });
  }

  return { state, createCourse, resetCreateCourse } as const;
}
