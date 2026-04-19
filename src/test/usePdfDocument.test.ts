import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Tauri plugins and pdfjs before importing the hook
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({ readFile: vi.fn() }));
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: vi.fn(),
}));

import { usePdfDocument } from "../hooks/usePdfDocument";

describe("usePdfDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initialises with default state", () => {
    const { result } = renderHook(() => usePdfDocument());
    expect(result.current.pdfDocument).toBeNull();
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(0);
    expect(result.current.scale).toBe(1.0);
    expect(result.current.fileName).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // --- Zoom ---

  it("zoomIn increases scale by 0.25", () => {
    const { result } = renderHook(() => usePdfDocument());
    act(() => result.current.zoomIn());
    expect(result.current.scale).toBe(1.25);
  });

  it("zoomOut decreases scale by 0.25", () => {
    const { result } = renderHook(() => usePdfDocument());
    act(() => result.current.zoomOut());
    expect(result.current.scale).toBe(0.75);
  });

  it("zoom does not exceed max (5)", () => {
    const { result } = renderHook(() => usePdfDocument());
    // Set scale close to max
    act(() => result.current.setScale(4.9));
    act(() => result.current.zoomIn());
    expect(result.current.scale).toBe(5);
  });

  it("zoom does not go below min (0.25)", () => {
    const { result } = renderHook(() => usePdfDocument());
    act(() => result.current.setScale(0.3));
    act(() => result.current.zoomOut());
    expect(result.current.scale).toBe(0.25);
  });

  it("resetZoom returns to 1.0", () => {
    const { result } = renderHook(() => usePdfDocument());
    act(() => result.current.zoomIn());
    act(() => result.current.zoomIn());
    act(() => result.current.resetZoom());
    expect(result.current.scale).toBe(1.0);
  });

  it("setScale clamps to [0.25, 5]", () => {
    const { result } = renderHook(() => usePdfDocument());
    act(() => result.current.setScale(10));
    expect(result.current.scale).toBe(5);
    act(() => result.current.setScale(-1));
    expect(result.current.scale).toBe(0.25);
  });

  // --- Page navigation (no document loaded → totalPages = 0, stays on page 1) ---

  it("goToPage is a no-op when no document is loaded", () => {
    const { result } = renderHook(() => usePdfDocument());
    act(() => result.current.goToPage(5));
    expect(result.current.currentPage).toBe(1);
  });

  it("nextPage is a no-op when on the last page", () => {
    const { result } = renderHook(() => usePdfDocument());
    // totalPages is 0, so current (1) >= total (0)
    act(() => result.current.nextPage());
    expect(result.current.currentPage).toBe(1);
  });

  it("prevPage is a no-op when on page 1", () => {
    const { result } = renderHook(() => usePdfDocument());
    act(() => result.current.prevPage());
    expect(result.current.currentPage).toBe(1);
  });
});
