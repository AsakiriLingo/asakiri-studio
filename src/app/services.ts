import type { AppMenuGateway } from "@core/app-menu";
import type { AppUpdateGateway } from "@core/app-update";
import type { LinkOpener } from "@core/links";
import type { MediaSearchGateway } from "@core/media-search";
import type { AssetDigestBackfiller, AssetReader, MediaPicker } from "@core/project-media";
import type { ProjectCreationGateway, ProjectDirectoryGateway } from "@core/projects";
import type { ProjectReader } from "@core/project-reading";
import type { ProjectSystem } from "@core/project-system";
import type { ProjectWriter } from "@core/project-writing";
import type { RecordingGateway } from "@core/recording";
import type { TtsGateway } from "@core/tts";
import type { DocumentGateway } from "@core/documents";
import type { ReleaseDeps } from "@features/release";
import { createAppMenuGateway } from "@platform/app-menu";
import { createPackWriter } from "@platform/packaging";
import { createReleaseGateway, createReleaseStateStore } from "@platform/release";
import { createAppUpdateGateway } from "@platform/app-update";
import { createLinkOpener } from "@platform/links";
import { createProjectCreationGateway } from "@platform/project-creation";
import { createProjectDirectoryGateway } from "@platform/project-directory";
import {
  createAssetDigestBackfiller,
  createAssetReader,
  createMediaPicker,
} from "@platform/project-media";
import { ProjectLocationRegistry, RecentProjectsStore } from "@platform/project-location";
import { createProjectReader } from "@platform/project-reading";
import { createProjectSystem } from "@platform/project-system";
import { createProjectWriter } from "@platform/project-writing";
import { createTauriMediaSearchGateway } from "@platform/media-search";
import { createTauriRecordingGateway } from "@platform/recording";
import { createTauriTtsGateway } from "@platform/tts";
import { createDocumentGateway } from "@platform/documents";

export interface AppServices {
  readonly creation: ProjectCreationGateway;
  readonly directory: ProjectDirectoryGateway;
  readonly reader: ProjectReader;
  readonly writer: ProjectWriter;
  readonly system: ProjectSystem;
  readonly mediaPicker: MediaPicker;
  readonly assetReader: AssetReader;
  readonly assetDigests?: AssetDigestBackfiller;
  readonly mediaSearch: MediaSearchGateway;
  readonly appUpdate: AppUpdateGateway;
  readonly menu: AppMenuGateway;
  readonly links: LinkOpener;
  readonly tts: TtsGateway;
  readonly recording: RecordingGateway;
  readonly documents: DocumentGateway;
  readonly release?: ReleaseDeps;
}

/**
 * Composition root. One registry backs every gateway so that a project
 * registered while creating or opening it is later resolvable by the reader
 * and writer.
 */
export function createAppServices(): AppServices {
  const locations = new ProjectLocationRegistry();
  const recents = new RecentProjectsStore();
  return {
    creation: createProjectCreationGateway(locations, recents),
    directory: createProjectDirectoryGateway(locations, recents),
    reader: createProjectReader(locations),
    writer: createProjectWriter(locations),
    system: createProjectSystem(locations),
    mediaPicker: createMediaPicker(),
    assetReader: createAssetReader(locations),
    assetDigests: createAssetDigestBackfiller(locations),
    mediaSearch: createTauriMediaSearchGateway(),
    appUpdate: createAppUpdateGateway(),
    menu: createAppMenuGateway(),
    links: createLinkOpener(),
    tts: createTauriTtsGateway(),
    recording: createTauriRecordingGateway(),
    documents: createDocumentGateway(),
    release: {
      writer: createPackWriter(locations),
      gateway: createReleaseGateway(locations),
      store: createReleaseStateStore(),
      clock: {
        now: () => new Date().toISOString(),
        newId: () => crypto.randomUUID(),
      },
    },
  };
}
