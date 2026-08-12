const flagModules = import.meta.glob<string>("/node_modules/circle-flags/flags/*.svg", {
  query: "?url",
  import: "default",
  eager: true,
});

const urlByCode: Record<string, string> = {};
for (const [path, url] of Object.entries(flagModules)) {
  const file = path.slice(path.lastIndexOf("/") + 1);
  urlByCode[file.replace(/\.svg$/, "")] = url;
}

export const FLAG_CODES: readonly string[] = Object.keys(urlByCode).sort();

export function flagUrl(code: string): string | undefined {
  return urlByCode[code];
}

export function hasFlag(code: string): boolean {
  return code in urlByCode;
}
