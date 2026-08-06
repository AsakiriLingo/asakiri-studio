/// <reference types="vite/client" />

interface FileSystemDirectoryPickerOptions {
  readonly id?: string;
  readonly mode?: "read" | "readwrite";
  readonly startIn?: FileSystemHandle | string;
}

interface Window {
  readonly __TAURI_INTERNALS__?: unknown;
  showDirectoryPicker(
    options?: FileSystemDirectoryPickerOptions,
  ): Promise<FileSystemDirectoryHandle>;
}
