import { invoke } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import type { ProjectFileAccess } from "@platform/project-writing/layout-project-writer";
import { projectRelativePathSegments } from "@platform/project-reading/project-relative-path";

export interface TauriProjectFileWriterOptions {
  readonly rootPath: string;
  readonly readTextFile?: (path: string) => Promise<string>;
  readonly writeFile?: (rootPath: string, relativePath: string, contents: string) => Promise<void>;
  readonly deleteFile?: (rootPath: string, relativePath: string) => Promise<void>;
}

function joinPath(rootPath: string, relativePath: string): string {
  const trimmedRoot = rootPath.replace(/[\\/]+$/, "");
  return `${trimmedRoot}/${projectRelativePathSegments(relativePath).join("/")}`;
}

async function invokeWrite(
  rootPath: string,
  relativePath: string,
  contents: string,
): Promise<void> {
  await invoke("write_course_file", { rootPath, relativePath, contents });
}

async function invokeDelete(rootPath: string, relativePath: string): Promise<void> {
  await invoke("delete_course_file", { rootPath, relativePath });
}

export function createTauriProjectFileWriter({
  rootPath,
  readTextFile: read = readTextFile,
  writeFile = invokeWrite,
  deleteFile = invokeDelete,
}: TauriProjectFileWriterOptions): ProjectFileAccess {
  return {
    async readTextFile(relativePath) {
      return read(joinPath(rootPath, relativePath));
    },
    async writeTextFile(relativePath, contents) {
      // Validate before crossing the bridge; the Rust command validates again.
      projectRelativePathSegments(relativePath);
      await writeFile(rootPath, relativePath, contents);
    },
    async deleteFile(relativePath) {
      projectRelativePathSegments(relativePath);
      await deleteFile(rootPath, relativePath);
    },
  };
}
