export function installMatchMediaMock(matches = false) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string): MediaQueryList => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
      addListener: () => undefined,
      removeListener: () => undefined,
    }),
  });
}
