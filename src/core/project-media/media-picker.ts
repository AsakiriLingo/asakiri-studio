export interface PickedMediaFile {
  /** Absolute path to the file on disk, as returned by the OS picker. */
  readonly path: string;
  /** The file's base name, including extension. */
  readonly name: string;
}

/**
 * Opens the OS file picker so the user can choose media to import. Returns the
 * chosen files, or an empty list if the picker was dismissed.
 */
export interface MediaPicker {
  pickMediaFiles(): Promise<readonly PickedMediaFile[]>;
}
