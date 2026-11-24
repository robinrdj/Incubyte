import "@testing-library/jest-dom/vitest";

// Mantine uses browser APIs that jsdom does not provide. These stubs let components render in tests.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    dispatchEvent: () => false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }),
});

class ResizeObserverStub {
  observe(): void {
    /* no-op in jsdom */
  }
  unobserve(): void {
    /* no-op in jsdom */
  }
  disconnect(): void {
    /* no-op in jsdom */
  }
}
globalThis.ResizeObserver = ResizeObserverStub;

// Mantine's Select scrolls the chosen option into view on a timer. Without this stub the call can
// land after a test ends and surface as an unhandled error, depending on timing.
Element.prototype.scrollIntoView = function scrollIntoView(): void {
  /* no-op in jsdom */
};
