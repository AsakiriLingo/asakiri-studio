import type { ProjectFileReader } from "@platform/project-reading/layout-project-reader";
import type { DirectoryHandleLike } from "@platform/project-location";
import { projectRelativePathSegments } from "@platform/project-reading/project-relative-path";

export function createBrowserProjectFileReader(root: DirectoryHandleLike): ProjectFileReader {
  return {
    async readTextFile(relativePath) {
      const segments = projectRelativePathSegments(relativePath);
      const fileName = segments[segments.length - 1];
      if (fileName === undefined) {
        throw new Error(`Invalid path: ${relativePath}`);
      }

      let directory = root;
      for (const segment of segments.slice(0, -1)) {
        directory = await directory.getDirectoryHandle(segment);
      }

      const fileHandle = await directory.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      return file.text();
    },
  };
}
