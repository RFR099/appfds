import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "./storage.js";

// o gráfico (recharts) mede o contentor; o jsdom não tem ResizeObserver
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());
