import { invoke } from "@tauri-apps/api/core";
import type { ReleaseState, ReleaseStateStore } from "@core/packaging";

export function createReleaseStateStore(): ReleaseStateStore {
  return {
    async load(projectId) {
      const contents = await invoke<string | null>("read_release_state", { projectId });
      if (contents === null) return null;
      return JSON.parse(contents) as ReleaseState;
    },
    async save(projectId, state) {
      await invoke("write_release_state", {
        projectId,
        contents: `${JSON.stringify(state, null, 2)}\n`,
      });
    },
  };
}
