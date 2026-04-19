import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock pdfjs-dist — not needed at runtime for these tests
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
}));

import { useSearch } from "../hooks/useSearch";

describe("useSearch", () => {
  it("initialises with empty state", () => {
    const { result } = renderHook(() => useSearch(null));
    expect(result.current.query).toBe("");
    expect(result.current.results).toEqual([]);
    expect(result.current.searching).toBe(false);
    expect(result.current.currentResultIndex).toBe(-1);
  });

  it("search with null document yields no results", async () => {
    const { result } = renderHook(() => useSearch(null));
    await act(async () => {
      await result.current.search("test");
    });
    expect(result.current.results).toEqual([]);
    expect(result.current.currentResultIndex).toBe(-1);
  });

  it("search with empty query clears results", async () => {
    const { result } = renderHook(() => useSearch(null));
    await act(async () => {
      await result.current.search("");
    });
    expect(result.current.results).toEqual([]);
  });

  it("clearSearch resets everything", () => {
    const { result } = renderHook(() => useSearch(null));
    act(() => result.current.clearSearch());
    expect(result.current.query).toBe("");
    expect(result.current.results).toEqual([]);
    expect(result.current.currentResultIndex).toBe(-1);
    expect(result.current.searching).toBe(false);
  });

  it("nextResult and prevResult cycle correctly with empty results", () => {
    const { result } = renderHook(() => useSearch(null));
    act(() => result.current.nextResult());
    expect(result.current.currentResultIndex).toBe(-1);
    act(() => result.current.prevResult());
    expect(result.current.currentResultIndex).toBe(-1);
  });
});
