import type { ProjectFileReader } from "@platform/project-reading/layout-project-reader";
import { projectRelativePathSegments } from "@platform/project-reading/project-relative-path";

export interface TauriProjectFileReaderOptions {
  readonly rootPath: string;
  readonly readTextFile: (path: string) => Promise<string>;
}

function joinPath(rootPath: string, relativePath: string): string {
  const trimmedRoot = rootPath.replace(/[\\/]+$/, "");
  return `${trimmedRoot}/${projectRelativePathSegments(relativePath).join("/")}`;
}

export function createTauriProjectFileReader({
  rootPath,
  readTextFile,
}: TauriProjectFileReaderOptions): ProjectFileReader {
  return {
    async readTextFile(relativePath) {
      return readTextFile(joinPath(rootPath, relativePath));
    },
  };
}
