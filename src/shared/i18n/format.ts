import type { Locale } from "@shared/i18n/types";

export type MessageParams = Record<string, string | number>;

const pluralRulesCache = new Map<Locale, Intl.PluralRules>();

function pluralRules(locale: Locale): Intl.PluralRules {
  const cached = pluralRulesCache.get(locale);
  if (cached) return cached;
  const created = new Intl.PluralRules(locale);
  pluralRulesCache.set(locale, created);
  return created;
}

function matchingBrace(text: string, start: number): number {
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function parseBranches(source: string): Map<string, string> {
  const branches = new Map<string, string>();
  let index = 0;
  while (index < source.length) {
    const open = source.indexOf("{", index);
    if (open === -1) break;
    const selector = source.slice(index, open).trim();
    const close = matchingBrace(source, open);
    if (close === -1) break;
    branches.set(selector, source.slice(open + 1, close));
    index = close + 1;
  }
  return branches;
}

function formatPlural(
  locale: Locale,
  argument: string,
  source: string,
  params: MessageParams,
): string {
  const value = params[argument];
  if (typeof value !== "number") return `{${argument}}`;
  const branches = parseBranches(source);
  const branch =
    branches.get(`=${String(value)}`) ??
    branches.get(pluralRules(locale).select(value)) ??
    branches.get("other") ??
    "";
  return formatMessage(locale, branch.replace(/#/g, String(value)), params);
}

export function formatMessage(locale: Locale, message: string, params: MessageParams = {}): string {
  let result = "";
  let index = 0;
  while (index < message.length) {
    const char = message.charAt(index);
    if (char !== "{") {
      result += char;
      index += 1;
      continue;
    }
    const close = matchingBrace(message, index);
    if (close === -1) {
      result += message.slice(index);
      break;
    }
    const token = message.slice(index + 1, close);
    const comma = token.indexOf(",");
    if (comma === -1) {
      const name = token.trim();
      const value = params[name];
      result += value === undefined ? `{${name}}` : String(value);
    } else {
      const name = token.slice(0, comma).trim();
      const rest = token.slice(comma + 1).trim();
      if (rest.startsWith("plural,")) {
        result += formatPlural(locale, name, rest.slice("plural,".length), params);
      } else {
        const value = params[name];
        result += value === undefined ? `{${token}}` : String(value);
      }
    }
    index = close + 1;
  }
  return result;
}
