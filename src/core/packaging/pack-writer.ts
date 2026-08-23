import type { ProjectSession } from "@core/projects";
import type { StoredZipEntry, WrittenZip } from "@core/packaging/model";

export interface PackWriter {
  writeStoredZip(
    session: ProjectSession,
    outputRelativePath: string,
    entries: readonly StoredZipEntry[],
  ): Promise<WrittenZip>;
}
