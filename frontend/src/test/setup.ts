import '@testing-library/jest-dom/vitest'

// jsdom no implementa ResizeObserver, que usan los tooltips de Radix.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
