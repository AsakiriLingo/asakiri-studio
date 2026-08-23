import type { ProjectSession } from "@core/projects";
import type { ReleaseState } from "@core/packaging/release-state";

export interface ReleaseGateway {
  writeText(session: ProjectSession, relativePath: string, text: string): Promise<void>;
  deleteFile(session: ProjectSession, relativePath: string): Promise<void>;
  rename(session: ProjectSession, fromRelativePath: string, toRelativePath: string): Promise<void>;
}

export interface ReleaseStateStore {
  load(projectId: string): Promise<ReleaseState | null>;
  save(projectId: string, state: ReleaseState): Promise<void>;
}

export interface ReleaseClock {
  now(): string;
  newId(): string;
}
