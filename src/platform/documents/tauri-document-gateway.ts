import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  DocumentGateway,
  DocumentReadError,
  DocumentReadResult,
  PickedDocument,
  ReadDocument,
} from "@core/documents";

function baseName(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function readError(error: unknown): DocumentReadError {
  const message = typeof error === "string" ? error : String(error);
  if (message.startsWith("notFound")) return "notFound";
  if (message.startsWith("unsupportedFormat")) return "unsupportedFormat";
  if (message.startsWith("unreadable")) return "unreadable";
  return "unknown";
}

export function createDocumentGateway(): DocumentGateway {
  return {
    async pickDocument(extensions): Promise<PickedDocument | null> {
      const picked = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "Documents", extensions: [...extensions] }],
      });
      if (typeof picked !== "string") return null;
      return { path: picked, name: baseName(picked) };
    },

    async readDocument(path): Promise<DocumentReadResult> {
      try {
        const document = await invoke<ReadDocument>("read_document", { sourcePath: path });
        return { status: "ready", document };
      } catch (error) {
        return { status: "failed", code: readError(error) };
      }
    },
  };
}
