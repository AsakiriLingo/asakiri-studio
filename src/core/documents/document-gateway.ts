export interface PickedDocument {
  readonly path: string;
  readonly name: string;
}

export interface DocumentTable {
  readonly headerRows: number;
  readonly rows: readonly (readonly string[])[];
}

export interface ReadDocument {
  readonly format: string;
  readonly markdown: string;
  readonly tables: readonly DocumentTable[];
  readonly imageCount: number;
}

export type DocumentReadError = "notFound" | "unsupportedFormat" | "unreadable" | "unknown";

export type DocumentReadResult =
  | { readonly status: "ready"; readonly document: ReadDocument }
  | { readonly status: "failed"; readonly code: DocumentReadError };

export const SPREADSHEET_EXTENSIONS = ["csv", "xls", "xlsx", "xlsm", "xlsb", "ods"] as const;

export const TEXT_DOCUMENT_EXTENSIONS = [
  "doc",
  "docx",
  "docm",
  "ppt",
  "pps",
  "pot",
  "pptx",
  "pptm",
  "ppsx",
  "ppsm",
  "odt",
  "odp",
  "rtf",
  "epub",
  "pdf",
] as const;

export interface DocumentGateway {
  pickDocument(extensions: readonly string[]): Promise<PickedDocument | null>;
  readDocument(path: string): Promise<DocumentReadResult>;
}
