export type AssetKind = "audio" | "image" | "video";

export type AssetAvailability = "ready" | "placeholder";

export interface Asset {
  readonly id: string;
  readonly kind: AssetKind;
  readonly label: string;
  readonly availability: AssetAvailability;
  readonly file: string | null;
  readonly expectedFile?: string;
  readonly mimeType: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
