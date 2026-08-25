import type { ProjectDirectory } from "@core/projects";

export interface AppWindowGateway {
  focusCourseWindow(directory: ProjectDirectory): Promise<boolean>;
  setCourseWindow(directory: ProjectDirectory | null): Promise<void>;
}
