export interface LinkOpener {
  open(url: string): Promise<void>;
}
