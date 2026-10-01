import { afterEach, beforeEach, vi } from 'vitest';

import { cleanup } from '@testing-library/react';

import { resetTestResources } from './test-resources';

import '@testing-library/jest-dom/vitest';

const noOp = () => undefined;

class TestResizeObserver implements ResizeObserver {
  disconnect = noOp;
  observe = noOp;
  unobserve = noOp;
}

function installDomShims() {
  if (typeof window === 'undefined') return;

  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: noOp,
        removeEventListener: noOp,
        addListener: noOp,
        removeListener: noOp,
        dispatchEvent: () => true,
      }),
    });
  }

  if (!window.ResizeObserver) {
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      value: TestResizeObserver,
    });
  }

  window.scrollTo = noOp;
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = noOp;
  if (!HTMLElement.prototype.setPointerCapture) HTMLElement.prototype.setPointerCapture = noOp;
  if (!HTMLElement.prototype.releasePointerCapture) HTMLElement.prototype.releasePointerCapture = noOp;
  if (!HTMLElement.prototype.hasPointerCapture) HTMLElement.prototype.hasPointerCapture = () => false;
}

beforeEach(() => {
  installDomShims();
});

afterEach(() => {
  if (typeof document !== 'undefined') cleanup();
  resetTestResources();

  if (typeof window !== 'undefined') {
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.documentElement.removeAttribute('class');
    document.documentElement.removeAttribute('style');
  }

  if (vi.isFakeTimers()) {
    vi.clearAllTimers();
    vi.useRealTimers();
  }

  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
