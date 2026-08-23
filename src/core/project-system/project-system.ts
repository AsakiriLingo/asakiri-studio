import type { ProjectSession } from "@core/projects";

/**
 * Operating-system integrations for a project folder that are not part of its
 * data, such as revealing it in the file manager.
 */
export interface ProjectSystem {
  revealFolder(session: ProjectSession): Promise<void>;
}
