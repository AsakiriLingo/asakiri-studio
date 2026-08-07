export interface ContentMessages {
  readonly collectionsLabel: string;
  readonly recordCount: (count: number) => string;
  readonly empty: {
    readonly title: string;
    readonly description: string;
  };
}
