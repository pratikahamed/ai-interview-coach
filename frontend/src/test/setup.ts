import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock next/font/google for JSDOM/Vitest environment
vi.mock("next/font/google", () => ({
  Inter: () => ({
    className: "inter-font",
    variable: "--font-inter",
  }),
}));

// Polyfill window.matchMedia for JSDOM
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // Polyfill ResizeObserver
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Polyfill scrollIntoView
if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView = () => {};
}
