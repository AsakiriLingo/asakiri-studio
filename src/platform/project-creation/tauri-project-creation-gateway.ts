import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ProjectCreationGateway, ProjectDirectory } from "@core/projects";
import { ProjectCreationError, type ProjectCreationErrorCode } from "@core/projects";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";

interface CreatedCourse {
  readonly name: string;
  readonly path: string;
  readonly gitInitialized: boolean;
}

const KNOWN_ERROR_CODES: readonly ProjectCreationErrorCode[] = [
  "alreadyExists",
  "invalidName",
  "permissionDenied",
];

function toErrorCode(error: unknown): ProjectCreationErrorCode {
  const value = typeof error === "string" ? error : "";
  return KNOWN_ERROR_CODES.find((code) => code === value) ?? "unknown";
}

export class TauriProjectCreationGateway implements ProjectCreationGateway {
  readonly isSupported = true;
  readonly runtime = "desktop" as const;

  constructor(private readonly locations: ProjectLocationRegistry) {}

  async createCourse(request: {
    readonly name: string;
    readonly dialogTitle: string;
  }): Promise<ProjectDirectory | null> {
    const parentPath = await open({
      directory: true,
      multiple: false,
      recursive: true,
      title: request.dialogTitle,
    });

    if (!parentPath) {
      return null;
    }

    let created: CreatedCourse;
    try {
      created = await invoke<CreatedCourse>("create_course", {
        parentPath,
        name: request.name,
      });
    } catch (error) {
      throw new ProjectCreationError(toErrorCode(error));
    }

    const id = crypto.randomUUID();
    this.locations.register(id, { runtime: "tauri", rootPath: created.path });

    return {
      id,
      name: created.name,
      locationLabel: created.name,
      runtime: "desktop",
    };
  }
}
