import type {
  ContentCollectionSummary,
  ProjectReadErrorCode,
  ProjectReader,
} from "@core/project-reading/project-reader";

export interface InMemoryProjectReaderSeed {
  readonly isSupported?: boolean;
  readonly contentCollectionsBySession?: Readonly<
    Record<string, readonly ContentCollectionSummary[]>
  >;
  readonly failWithCode?: ProjectReadErrorCode;
}

export function createInMemoryProjectReader(seed: InMemoryProjectReaderSeed = {}): ProjectReader {
  const { contentCollectionsBySession = {}, failWithCode, isSupported = true } = seed;

  return {
    isSupported,
    listContentCollections(session) {
      if (failWithCode) {
        return Promise.resolve({ status: "failed", code: failWithCode });
      }
      const data = contentCollectionsBySession[session.id] ?? [];
      return Promise.resolve({ status: "ready", data });
    },
  };
}
