import type { PackWriter, ReleaseClock, ReleaseGateway, ReleaseStateStore } from "@core/packaging";

export interface ReleaseDeps {
  readonly writer: PackWriter;
  readonly gateway: ReleaseGateway;
  readonly store: ReleaseStateStore;
  readonly clock: ReleaseClock;
}
