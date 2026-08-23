import { invoke } from "@tauri-apps/api/core";
import type { ProjectFileReader } from "@platform/project-reading/layout-project-reader";
import { projectRelativePathSegments } from "@platform/project-reading/project-relative-path";

export interface TauriProjectFileReaderOptions {
  readonly rootPath: string;
  readonly readCourseFile?: (rootPath: string, relativePath: string) => Promise<string>;
}

async function invokeReadCourseFile(rootPath: string, relativePath: string): Promise<string> {
  return await invoke<string>("read_course_file", { rootPath, relativePath });
}

export function createTauriProjectFileReader({
  rootPath,
  readCourseFile = invokeReadCourseFile,
}: TauriProjectFileReaderOptions): ProjectFileReader {
  return {
    async readTextFile(relativePath) {
      projectRelativePathSegments(relativePath);
      return readCourseFile(rootPath, relativePath);
    },
  };
}
