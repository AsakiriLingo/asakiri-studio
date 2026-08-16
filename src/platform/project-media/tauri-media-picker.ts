import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { SUPPORTED_MEDIA_EXTENSIONS } from "@core/course";
import type { MediaPicker, PickedMediaFile } from "@core/project-media";

function baseName(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function createMediaPicker(): MediaPicker {
  return {
    async pickMediaFiles(): Promise<readonly PickedMediaFile[]> {
      const picked = await open({
        multiple: true,
        directory: false,
        filters: [{ name: "Media", extensions: [...SUPPORTED_MEDIA_EXTENSIONS] }],
      });
      if (picked === null) return [];
      const paths = Array.isArray(picked) ? picked : [picked];
      return paths.map((path) => ({ path, name: baseName(path) }));
    },

    async pickMediaFolder(): Promise<readonly PickedMediaFile[]> {
      const folder = await open({ multiple: false, directory: true });
      if (typeof folder !== "string") return [];
      const files = await invoke<readonly PickedMediaFile[]>("list_folder_files", {
        folderPath: folder,
      });
      return files.filter((file) => isSupportedMedia(file.name));
    },
  };
}

function isSupportedMedia(name: string): boolean {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return SUPPORTED_MEDIA_EXTENSIONS.includes(extension);
}
