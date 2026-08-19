export interface RegionalFlag {
  readonly name: string;
  readonly aliases: readonly string[];
}

export const REGIONAL_FLAG_NAMES: Record<string, RegionalFlag> = {
  "gb-wls": { name: "Wales", aliases: ["welsh", "cymru", "cymraeg", "dragon", "draig"] },
  "gb-sct": { name: "Scotland", aliases: ["scottish", "scots", "gaelic", "gàidhlig", "saltire"] },
  "gb-eng": { name: "England", aliases: ["english"] },
  "gb-nir": { name: "Northern Ireland", aliases: ["irish", "ulster"] },
  "gb-con": { name: "Cornwall", aliases: ["cornish", "kernewek", "saint piran"] },
  "gb-ork": { name: "Orkney", aliases: ["orcadian"] },
  "es-ct": { name: "Catalonia", aliases: ["catalan", "català", "catala", "senyera"] },
  "es-pv": { name: "Basque Country", aliases: ["basque", "euskara", "euskadi", "ikurriña"] },
  "es-ga": { name: "Galicia", aliases: ["galician", "galego"] },
  "es-cn": { name: "Canary Islands", aliases: ["canarian", "canario"] },
  "es-ib": { name: "Balearic Islands", aliases: ["balearic", "mallorca"] },
  "es-vc": { name: "Valencia", aliases: ["valencian", "valencià", "valencia"] },
  "fr-bre": { name: "Brittany", aliases: ["breton", "brezhoneg", "gwenn ha du"] },
  "ca-qc": { name: "Quebec", aliases: ["québécois", "quebecois", "québec", "french"] },
  "nl-fr": { name: "Friesland", aliases: ["frisian", "frysk", "fryslân"] },
};

export function regionalFlag(code: string): RegionalFlag | undefined {
  return REGIONAL_FLAG_NAMES[code];
}
