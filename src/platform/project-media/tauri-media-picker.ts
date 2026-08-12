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
  };
}
