import type { PickedMediaFile } from "@core/project-media";

export interface MediaAttribution {
  readonly provider: string;
  readonly author: string;
  readonly authorUrl?: string;
  readonly sourceUrl: string;
  readonly license: string;
  readonly licenseUrl: string;
}

export interface ImageSearchResult {
  readonly id: string;
  readonly thumbUrl: string;
  readonly downloadUrl: string;
  readonly attribution: MediaAttribution;
  readonly description?: string;
}

export interface AudioSearchResult {
  readonly id: string;
  readonly audioUrl: string;
  readonly text: string;
  readonly lang: string;
  readonly attribution: MediaAttribution;
}

export interface SearchPage<T> {
  readonly results: readonly T[];
  readonly hasMore: boolean;
}

export interface MediaSearchGateway {
  searchImages(query: string, page: number): Promise<SearchPage<ImageSearchResult>>;
  searchAudio(query: string, page: number): Promise<SearchPage<AudioSearchResult>>;
  downloadToTemp(url: string, fileName: string): Promise<PickedMediaFile | null>;
}
