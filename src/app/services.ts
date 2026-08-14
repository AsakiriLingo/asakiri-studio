import type { AppUpdateGateway } from "@core/app-update";
import type { LinkOpener } from "@core/links";
import type { MediaSearchGateway } from "@core/media-search";
import type { AssetReader, MediaPicker } from "@core/project-media";
import type { ProjectCreationGateway, ProjectDirectoryGateway } from "@core/projects";
import type { ProjectReader } from "@core/project-reading";
import type { ProjectSystem } from "@core/project-system";
import type { ProjectWriter } from "@core/project-writing";
import type { RecordingGateway } from "@core/recording";
import type { TtsGateway } from "@core/tts";
import { createAppUpdateGateway } from "@platform/app-update";
import { createLinkOpener } from "@platform/links";
import { createProjectCreationGateway } from "@platform/project-creation";
import { createProjectDirectoryGateway } from "@platform/project-directory";
import { createAssetReader, createMediaPicker } from "@platform/project-media";
import { ProjectLocationRegistry, RecentProjectsStore } from "@platform/project-location";
import { createProjectReader } from "@platform/project-reading";
import { createProjectSystem } from "@platform/project-system";
import { createProjectWriter } from "@platform/project-writing";
import { createTauriMediaSearchGateway } from "@platform/media-search";
import { createTauriRecordingGateway } from "@platform/recording";
import { createTauriTtsGateway } from "@platform/tts";

export interface AppServices {
  readonly creation: ProjectCreationGateway;
  readonly directory: ProjectDirectoryGateway;
  readonly reader: ProjectReader;
  readonly writer: ProjectWriter;
  readonly system: ProjectSystem;
  readonly mediaPicker: MediaPicker;
  readonly assetReader: AssetReader;
  readonly mediaSearch: MediaSearchGateway;
  readonly appUpdate: AppUpdateGateway;
  readonly links: LinkOpener;
  readonly tts: TtsGateway;
  readonly recording: RecordingGateway;
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
    mediaSearch: createTauriMediaSearchGateway(),
    appUpdate: createAppUpdateGateway(),
    links: createLinkOpener(),
    tts: createTauriTtsGateway(),
    recording: createTauriRecordingGateway(),
  };
}
