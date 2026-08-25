import type { Asset } from "@core/course";

export function assetSourceText(asset: Asset): string {
  const value = asset.metadata?.sourceText;
  return typeof value === "string" ? value.trim() : "";
}
