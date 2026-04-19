import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Tauri plugins
const mockOpen = vi.fn();
const mockSave = vi.fn();
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: (...args: unknown[]) => mockOpen(...args),
  save: (...args: unknown[]) => mockSave(...args),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
}));

// Mock pdf-lib
const mockPDFDocCreate = vi.fn();
const mockPDFDocLoad = vi.fn();

vi.mock("pdf-lib", () => {
  const mockAddPage = vi.fn();
  const mockCopyPages = vi.fn().mockResolvedValue([{ fake: "page" }]);
  const mockSave = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
  const mockGetPageIndices = vi.fn().mockReturnValue([0, 1]);
  const mockGetPageCount = vi.fn().mockReturnValue(5);

  const createResult = {
    addPage: mockAddPage,
    copyPages: mockCopyPages,
    save: mockSave,
  };

  const loadResult = {
    getPageIndices: mockGetPageIndices,
    getPageCount: mockGetPageCount,
    copyPages: mockCopyPages,
    addPage: mockAddPage,
    save: mockSave,
  };

  return {
    PDFDocument: {
      create: () => {
        mockPDFDocCreate();
        return Promise.resolve(createResult);
      },
      load: (bytes: unknown) => {
        mockPDFDocLoad(bytes);
        return Promise.resolve(loadResult);
      },
    },
  };
});

import { usePdfEditor } from "../hooks/usePdfEditor";

describe("usePdfEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mergePdfs, splitPdf, and createBlankPdf functions", () => {
    const { result } = renderHook(() => usePdfEditor());
    expect(typeof result.current.mergePdfs).toBe("function");
    expect(typeof result.current.splitPdf).toBe("function");
    expect(typeof result.current.createBlankPdf).toBe("function");
  });

  it("mergePdfs returns null when user selects fewer than 2 files", async () => {
    mockOpen.mockResolvedValue(null);
    const { result } = renderHook(() => usePdfEditor());
    const output = await result.current.mergePdfs();
    expect(output).toBeNull();
  });

  it("mergePdfs returns null when user selects only 1 file", async () => {
    mockOpen.mockResolvedValue(["/path/one.pdf"]);
    const { result } = renderHook(() => usePdfEditor());
    const output = await result.current.mergePdfs();
    expect(output).toBeNull();
  });

  it("mergePdfs returns bytes when files are selected", async () => {
    mockOpen.mockResolvedValue(["/a.pdf", "/b.pdf"]);
    mockReadFile.mockResolvedValue(new Uint8Array([1]));

    const { result } = renderHook(() => usePdfEditor());
    const output = await result.current.mergePdfs();

    expect(output).toBeInstanceOf(Uint8Array);
    expect(mockReadFile).toHaveBeenCalledTimes(2);
  });

  it("splitPdf returns null for invalid page range", async () => {
    const bytes = new Uint8Array([1]);
    const { result } = renderHook(() => usePdfEditor());
    // start > end
    const output = await result.current.splitPdf(bytes, 5, 2);
    expect(output).toBeNull();
  });

  it("splitPdf returns bytes for valid page range", async () => {
    const bytes = new Uint8Array([1]);

    const { result } = renderHook(() => usePdfEditor());
    const output = await result.current.splitPdf(bytes, 2, 4);

    expect(output).toBeInstanceOf(Uint8Array);
  });

  it("createBlankPdf returns bytes", async () => {
    const { result } = renderHook(() => usePdfEditor());
    const output = await result.current.createBlankPdf(3);

    expect(output).toBeInstanceOf(Uint8Array);
    expect(mockPDFDocCreate).toHaveBeenCalledTimes(1);
  });
});
