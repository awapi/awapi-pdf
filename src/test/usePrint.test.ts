import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: vi.fn(),
}));

import { usePrint } from "../hooks/usePrint";

describe("usePrint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initialises with printing false", () => {
    const { result } = renderHook(() => usePrint(null, null));
    expect(result.current.printing).toBe(false);
    expect(typeof result.current.print).toBe("function");
  });

  it("print is a no-op when pdfDocument is null", async () => {
    const { result } = renderHook(() => usePrint(null, null));

    await act(async () => {
      await result.current.print();
    });
    expect(result.current.printing).toBe(false);
  });

  it("renders pages to data-URLs, swaps body, calls window.print, then restores", async () => {
    const mockCtx = { getImageData: vi.fn(), putImageData: vi.fn() };

    const mockPage = {
      getViewport: vi.fn().mockReturnValue({ width: 612, height: 792 }),
      render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
    };

    const mockDoc = {
      numPages: 2,
      getPage: vi.fn().mockResolvedValue(mockPage),
    };

    // Create a root element to simulate the React app root
    const rootEl = document.createElement("div");
    rootEl.id = "root";
    document.body.appendChild(rootEl);

    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function () {
      return mockCtx as any;
    };

    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function () {
      return "data:image/png;base64,fakedata";
    };

    const origDecode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function () {
      return Promise.resolve();
    };

    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    // Track what was in the body when print() was called
    let bodyChildrenDuringPrint: string[] = [];
    printSpy.mockImplementation(() => {
      bodyChildrenDuringPrint = Array.from(document.body.children).map(
        (el) => el.tagName + (el.id ? "#" + el.id : "")
      );
    });

    const { result } = renderHook(() => usePrint(mockDoc as any, null));

    await act(async () => {
      await result.current.print();
    });

    // Verify all pages were rendered
    expect(mockDoc.getPage).toHaveBeenCalledTimes(2);
    expect(mockDoc.getPage).toHaveBeenCalledWith(1);
    expect(mockDoc.getPage).toHaveBeenCalledWith(2);

    // Verify window.print was called on the main window
    expect(printSpy).toHaveBeenCalled();

    // Verify the body had only the print container when print() fired
    expect(bodyChildrenDuringPrint).toHaveLength(1);
    expect(bodyChildrenDuringPrint[0]).toBe("DIV#print-container");

    // Verify body was restored (root is back, no leftover print container)
    const bodyIds = Array.from(document.body.children).map((el) => el.id);
    expect(bodyIds).toContain("root");
    expect(result.current.printing).toBe(false);

    HTMLCanvasElement.prototype.getContext = origGetContext;
    HTMLCanvasElement.prototype.toDataURL = origToDataURL;
    HTMLImageElement.prototype.decode = origDecode;
    printSpy.mockRestore();
    rootEl.remove();
  });
});
