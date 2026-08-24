import type { LoadedCourse } from "@core/course";
import { CourseFormatError, CourseParseError, parseCourseWithSources } from "@core/course";
import type { LoadedDrafts } from "@core/drafts";
import { parseDrafts } from "@core/drafts";
import type {
  ContentCollectionSummary,
  ProjectReadErrorCode,
  ProjectReader,
  ProjectReadResult,
} from "@core/project-reading";
import type { ProjectSession } from "@core/projects";

export interface ProjectFileReader {
  readTextFile(relativePath: string): Promise<string>;
}

export class ProjectFileNotFoundError extends Error {}

export type ResolveProjectFileReader = (session: ProjectSession) => ProjectFileReader | null;

const MANIFEST_PATH = "project.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseManifestCollections(text: string): readonly string[] {
  const data: unknown = JSON.parse(text);
  if (!isRecord(data) || !isStringArray(data.collections)) {
    throw new Error("Invalid project manifest");
  }
  return data.collections;
}

function parseCollectionSummary(text: string): ContentCollectionSummary {
  const data: unknown = JSON.parse(text);
  if (
    !isRecord(data) ||
    typeof data.id !== "string" ||
    typeof data.name !== "string" ||
    !Array.isArray(data.recordFiles)
  ) {
    throw new Error("Invalid content collection");
  }
  return { id: data.id, name: data.name, recordCount: data.recordFiles.length };
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof ProjectFileNotFoundError;
}

function classifyReadError(error: unknown): ProjectReadErrorCode {
  if (error instanceof CourseFormatError) {
    return "incompatibleVersion";
  }
  if (error instanceof CourseParseError || isMissingFileError(error)) {
    return "malformed";
  }
  return "unknown";
}

export function createLayoutProjectReader(
  resolveFileReader: ResolveProjectFileReader,
): ProjectReader {
  return {
    async listContentCollections(
      session,
    ): Promise<ProjectReadResult<readonly ContentCollectionSummary[]>> {
      const files = resolveFileReader(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const collectionPaths = parseManifestCollections(await files.readTextFile(MANIFEST_PATH));
        const summaries: ContentCollectionSummary[] = [];
        for (const path of collectionPaths) {
          summaries.push(parseCollectionSummary(await files.readTextFile(path)));
        }
        return { status: "ready", data: summaries };
      } catch {
        return { status: "failed", code: "unavailable" };
      }
    },
    async readCourse(session): Promise<ProjectReadResult<LoadedCourse>> {
      const files = resolveFileReader(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        await files.readTextFile(MANIFEST_PATH);
      } catch (error) {
        if (isMissingFileError(error)) {
          return { status: "failed", code: "missing" };
        }
        return { status: "failed", code: classifyReadError(error) };
      }

      try {
        return { status: "ready", data: await parseCourseWithSources(files) };
      } catch (error) {
        return { status: "failed", code: classifyReadError(error) };
      }
    },
    async readDrafts(session): Promise<ProjectReadResult<LoadedDrafts>> {
      const files = resolveFileReader(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }
      return { status: "ready", data: await parseDrafts(files) };
    },
  };
}
