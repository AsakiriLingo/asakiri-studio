import type { Asset } from "@core/course";

export interface AttributionEntry {
  readonly file: string;
  readonly provider: string;
  readonly author: string;
  readonly authorUrl: string;
  readonly sourceUrl: string;
  readonly license: string;
  readonly licenseUrl: string;
}

function metaStr(metadata: Asset["metadata"], key: string): string {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

export function attributionsFrom(assets: readonly Asset[]): AttributionEntry[] {
  const entries: AttributionEntry[] = [];
  for (const asset of assets) {
    const license = metaStr(asset.metadata, "license");
    const provider = metaStr(asset.metadata, "provider");
    if (!license && !provider) continue;
    entries.push({
      file: asset.file ?? asset.expectedFile ?? asset.label,
      provider,
      author: metaStr(asset.metadata, "author"),
      authorUrl: metaStr(asset.metadata, "authorUrl"),
      sourceUrl: metaStr(asset.metadata, "sourceUrl"),
      license,
      licenseUrl: metaStr(asset.metadata, "licenseUrl"),
    });
  }
  entries.sort((left, right) => left.file.localeCompare(right.file));
  return entries;
}

function link(text: string, url: string): string {
  return url ? `[${text}](${url})` : text;
}

export function buildAttributionMarkdown(
  title: string,
  entries: readonly AttributionEntry[],
): string {
  const lines = [`# Attribution`, "", `Media used in ${title} and where it comes from.`, ""];
  for (const entry of entries) {
    const author = entry.author ? link(entry.author, entry.authorUrl || entry.sourceUrl) : "";
    const provider = link(entry.provider, entry.sourceUrl);
    const credit = author ? `${author} via ${provider}` : provider;
    const license = entry.license ? ` — License: ${link(entry.license, entry.licenseUrl)}` : "";
    lines.push(`- **${entry.file}** — ${credit}${license}`);
  }
  lines.push("");
  return lines.join("\n");
}
