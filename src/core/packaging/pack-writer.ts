import type { ProjectSession } from "@core/projects";

export interface StoredZipEntry {
  readonly name: string;
  readonly sourceRelativePath: string;
}

export interface WrittenZipEntry {
  readonly name: string;
  readonly offset: number;
  readonly length: number;
}

export interface WrittenZip {
  readonly sha256: string;
  readonly byteSize: number;
  readonly entries: readonly WrittenZipEntry[];
}

export interface PackWriter {
  writeStoredZip(
    session: ProjectSession,
    outputRelativePath: string,
    entries: readonly StoredZipEntry[],
  ): Promise<WrittenZip>;
}
