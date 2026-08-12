import { invoke } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import type { ProjectFileAccess } from "@platform/project-writing/layout-project-writer";
import { projectRelativePathSegments } from "@platform/project-reading/project-relative-path";

export interface TauriProjectFileWriterOptions {
  readonly rootPath: string;
  readonly readTextFile?: (path: string) => Promise<string>;
  readonly writeFile?: (rootPath: string, relativePath: string, contents: string) => Promise<void>;
  readonly deleteFile?: (rootPath: string, relativePath: string) => Promise<void>;
  readonly renameFile?: (
    rootPath: string,
    fromRelativePath: string,
    toRelativePath: string,
  ) => Promise<void>;
  readonly copyFile?: (rootPath: string, relativePath: string, sourcePath: string) => Promise<void>;
  readonly copyImage?: (
    rootPath: string,
    relativePath: string,
    sourcePath: string,
  ) => Promise<void>;
  readonly removeDir?: (rootPath: string, relativePath: string) => Promise<void>;
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

async function invokeRename(
  rootPath: string,
  fromRelativePath: string,
  toRelativePath: string,
): Promise<void> {
  await invoke("rename_course_file", { rootPath, fromRelativePath, toRelativePath });
}

async function invokeCopy(
  rootPath: string,
  relativePath: string,
  sourcePath: string,
): Promise<void> {
  await invoke("copy_course_file", { rootPath, relativePath, sourcePath });
}

async function invokeCopyImage(
  rootPath: string,
  relativePath: string,
  sourcePath: string,
): Promise<void> {
  await invoke("copy_course_image_stripped", { rootPath, relativePath, sourcePath });
}

async function invokeRemoveDir(rootPath: string, relativePath: string): Promise<void> {
  await invoke("remove_course_dir", { rootPath, relativePath });
}

export function createTauriProjectFileWriter({
  rootPath,
  readTextFile: read = readTextFile,
  writeFile = invokeWrite,
  deleteFile = invokeDelete,
  renameFile = invokeRename,
  copyFile = invokeCopy,
  copyImage = invokeCopyImage,
  removeDir = invokeRemoveDir,
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
    async renameFile(fromRelativePath, toRelativePath) {
      projectRelativePathSegments(fromRelativePath);
      projectRelativePathSegments(toRelativePath);
      await renameFile(rootPath, fromRelativePath, toRelativePath);
    },
    async copyFile(sourcePath, relativePath) {
      projectRelativePathSegments(relativePath);
      await copyFile(rootPath, relativePath, sourcePath);
    },
    async copyImage(sourcePath, relativePath) {
      projectRelativePathSegments(relativePath);
      await copyImage(rootPath, relativePath, sourcePath);
    },
    async removeDir(relativePath) {
      projectRelativePathSegments(relativePath);
      await removeDir(rootPath, relativePath);
    },
  };
}
