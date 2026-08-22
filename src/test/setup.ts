import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe = (): void => undefined;
    unobserve = (): void => undefined;
    disconnect = (): void => undefined;
  };
}

if (typeof Element !== "undefined" && typeof Element.prototype.getAnimations !== "function") {
  Element.prototype.getAnimations = (): Animation[] => [];
}

afterEach(() => {
  cleanup();
});
