import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist all mock fns so they are available inside vi.mock factories (which are hoisted)
const {
  mockOpen,
  mockSave,
  mockReadFile,
  mockWriteFile,
  mockPDFDocCreate,
  mockPDFDocLoad,
  mockDrawRectangle,
  mockDrawLine,
  mockDrawImage,
  mockDrawText,
  mockEmbedPng,
  mockEmbedJpg,
} = vi.hoisted(() => ({
  mockOpen: vi.fn(),
  mockSave: vi.fn(),
  mockReadFile: vi.fn(),
  mockWriteFile: vi.fn(),
  mockPDFDocCreate: vi.fn(),
  mockPDFDocLoad: vi.fn(),
  mockDrawRectangle: vi.fn(),
  mockDrawLine: vi.fn(),
  mockDrawImage: vi.fn(),
  mockDrawText: vi.fn(),
  mockEmbedPng: vi.fn().mockResolvedValue({ fake: "pngImage" }),
  mockEmbedJpg: vi.fn().mockResolvedValue({ fake: "jpgImage" }),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: (...args: unknown[]) => mockOpen(...args),
  save: (...args: unknown[]) => mockSave(...args),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
}));

vi.mock("pdf-lib", () => {
  const mockAddPage = vi.fn();
  const mockCopyPages = vi.fn().mockResolvedValue([{ fake: "page" }]);
  const mockSaveBytes = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
  const mockGetPageIndices = vi.fn().mockReturnValue([0, 1]);
  const mockGetPageCount = vi.fn().mockReturnValue(5);

  const fakePage = {
    getSize: () => ({ width: 612, height: 792 }),
    drawRectangle: mockDrawRectangle,
    drawLine: mockDrawLine,
    drawImage: mockDrawImage,
    drawText: mockDrawText,
  };

  const createResult = {
    addPage: mockAddPage,
    copyPages: mockCopyPages,
    save: mockSaveBytes,
  };

  const loadResult = {
    getPageIndices: mockGetPageIndices,
    getPageCount: mockGetPageCount,
    getPages: () => [fakePage, fakePage, fakePage],
    copyPages: mockCopyPages,
    addPage: mockAddPage,
    save: mockSaveBytes,
    embedPng: mockEmbedPng,
    embedJpg: mockEmbedJpg,
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
    rgb: (r: number, g: number, b: number) => ({ r, g, b }),
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

  it("flattenAnnotationsToPdf is exported", () => {
    const { result } = renderHook(() => usePdfEditor());
    expect(typeof result.current.flattenAnnotationsToPdf).toBe("function");
  });

  it("flattenAnnotationsToPdf returns Uint8Array with no annotations", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const { result } = renderHook(() => usePdfEditor());
    const output = await result.current.flattenAnnotationsToPdf(bytes, []);
    expect(output).toBeInstanceOf(Uint8Array);
  });

  it("flattenAnnotationsToPdf calls drawRectangle for highlight annotations", async () => {
    const bytes = new Uint8Array([1]);
    const { result } = renderHook(() => usePdfEditor());
    await result.current.flattenAnnotationsToPdf(bytes, [
      {
        type: "highlight",
        id: "h1",
        page: 1,
        rects: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.05 }],
        color: "yellow",
      },
    ]);
    expect(mockDrawRectangle).toHaveBeenCalled();
  });

  it("flattenAnnotationsToPdf calls drawLine for draw annotations", async () => {
    const bytes = new Uint8Array([1]);
    const { result } = renderHook(() => usePdfEditor());
    await result.current.flattenAnnotationsToPdf(bytes, [
      {
        type: "draw",
        id: "d1",
        page: 1,
        points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }, { x: 0.3, y: 0.15 }],
        color: "#ff4444",
        width: 2,
      },
    ]);
    expect(mockDrawLine).toHaveBeenCalled();
  });

  it("flattenAnnotationsToPdf embeds PNG for signature annotations", async () => {
    const bytes = new Uint8Array([1]);
    const { result } = renderHook(() => usePdfEditor());
    // Minimal valid base64 PNG header (not a real PNG, but enough for the mock)
    const fakeDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    await result.current.flattenAnnotationsToPdf(bytes, [
      {
        type: "signature",
        id: "s1",
        page: 1,
        x: 0.1,
        y: 0.1,
        w: 0.2,
        h: 0.1,
        dataUrl: fakeDataUrl,
      },
    ]);
    expect(mockEmbedPng).toHaveBeenCalled();
    expect(mockDrawImage).toHaveBeenCalled();
  });

  it("flattenAnnotationsToPdf draws note text when note has text", async () => {
    const bytes = new Uint8Array([1]);
    const { result } = renderHook(() => usePdfEditor());
    await result.current.flattenAnnotationsToPdf(bytes, [
      {
        type: "note",
        id: "n1",
        page: 1,
        x: 0.5,
        y: 0.5,
        text: "Hello",
      },
    ]);
    expect(mockDrawRectangle).toHaveBeenCalled();
    expect(mockDrawText).toHaveBeenCalled();
  });

  it("flattenAnnotationsToPdf skips annotations with invalid page", async () => {
    const bytes = new Uint8Array([1]);
    const { result } = renderHook(() => usePdfEditor());
    // Page 99 doesn't exist in the mock (only 3 pages)
    await result.current.flattenAnnotationsToPdf(bytes, [
      {
        type: "highlight",
        id: "h2",
        page: 99,
        rects: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.05 }],
        color: "blue",
      },
    ]);
    expect(mockDrawRectangle).not.toHaveBeenCalled();
  });
});
