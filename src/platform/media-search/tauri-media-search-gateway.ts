import { invoke } from "@tauri-apps/api/core";
import type { PickedMediaFile } from "@core/project-media";
import type {
  AudioSearchResult,
  ImageSearchResult,
  MediaSearchGateway,
  SearchPage,
} from "@core/media-search";

const PER_PAGE = 24;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function idStr(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

async function httpGetJson(url: string): Promise<unknown> {
  const text = await invoke<string>("http_get_text", { url });
  return JSON.parse(text);
}

function parseImages(data: unknown, page: number): SearchPage<ImageSearchResult> {
  const root = isObject(data) ? data : {};
  const rawResults = Array.isArray(root.results) ? root.results : [];
  const totalPages = typeof root.total_pages === "number" ? root.total_pages : page;
  const results: ImageSearchResult[] = [];
  for (const item of rawResults) {
    if (!isObject(item)) continue;
    const urls = isObject(item.urls) ? item.urls : {};
    const user = isObject(item.user) ? item.user : {};
    const links = isObject(item.links) ? item.links : {};
    const thumbUrl = str(urls.thumb) || str(urls.small);
    const downloadUrl = str(urls.small) || str(urls.regular) || thumbUrl;
    if (!thumbUrl || !downloadUrl) continue;
    const userLinks = isObject(user.links) ? user.links : {};
    results.push({
      id: str(item.id),
      thumbUrl,
      downloadUrl,
      attribution: {
        provider: "Unsplash",
        author: str(user.name) || "Unknown",
        ...(str(userLinks.html) ? { authorUrl: str(userLinks.html) } : {}),
        sourceUrl: str(links.html) || "https://unsplash.com",
        license: "Unsplash License",
        licenseUrl: "https://unsplash.com/license",
      },
      ...(str(item.alt_description) ? { description: str(item.alt_description) } : {}),
    });
  }
  return { results, hasMore: page < totalPages };
}

function parseAudio(data: unknown, page: number): SearchPage<AudioSearchResult> {
  const root = isObject(data) ? data : {};
  const rawResults = Array.isArray(root.results) ? root.results : [];
  const paging = isObject(root.paging) ? root.paging : {};
  const sentences = isObject(paging.Sentences) ? paging.Sentences : {};
  const pageCount = typeof sentences.pageCount === "number" ? sentences.pageCount : page;
  const results: AudioSearchResult[] = [];
  for (const item of rawResults) {
    if (!isObject(item)) continue;
    const audios = Array.isArray(item.audios) ? item.audios : [];
    if (audios.length === 0) continue;
    const first = isObject(audios[0]) ? audios[0] : {};
    const lang = str(item.lang);
    const id = idStr(item.id);
    if (!lang || !id) continue;
    results.push({
      id,
      audioUrl: `https://audio.tatoeba.org/sentences/${lang}/${id}.mp3`,
      text: str(item.text),
      lang,
      attribution: {
        provider: "Tatoeba",
        author: str(first.author) || "Unknown",
        sourceUrl: `https://tatoeba.org/en/sentences/show/${id}`,
        license: "CC BY 2.0 FR",
        licenseUrl: "https://creativecommons.org/licenses/by/2.0/fr/",
      },
    });
  }
  return { results, hasMore: page < pageCount };
}

export function createTauriMediaSearchGateway(): MediaSearchGateway {
  return {
    async searchImages(query, page): Promise<SearchPage<ImageSearchResult>> {
      const url =
        `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}` +
        `&page=${String(page)}&per_page=${String(PER_PAGE)}`;
      return parseImages(await httpGetJson(url), page);
    },

    async searchAudio(query, page): Promise<SearchPage<AudioSearchResult>> {
      const url =
        `https://tatoeba.org/en/api_v0/search?query=${encodeURIComponent(query)}` +
        `&has_audio=yes&sort=relevance&page=${String(page)}`;
      return parseAudio(await httpGetJson(url), page);
    },

    async downloadToTemp(url, fileName): Promise<PickedMediaFile | null> {
      try {
        const path = await invoke<string>("download_media_file", { url, fileName });
        return { path, name: fileName };
      } catch {
        return null;
      }
    },
  };
}
