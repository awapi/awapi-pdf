import { useState, useCallback, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

interface PdfState {
  pdfDocument: PDFDocumentProxy | null;
  currentPage: number;
  totalPages: number;
  scale: number;
  fileName: string | null;
  currentFilePath: string | null;
  loading: boolean;
  error: string | null;
}

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const DEFAULT_ZOOM = 1.0;

export function usePdfDocument() {
  const [state, setState] = useState<PdfState>({
    pdfDocument: null,
    currentPage: 1,
    totalPages: 0,
    scale: DEFAULT_ZOOM,
    fileName: null,
    currentFilePath: null,
    loading: false,
    error: null,
  });

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);

  // Clean up document on unmount
  useEffect(() => {
    return () => {
      state.pdfDocument?.destroy();
    };
    // Only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openFilePath = useCallback(async (filePath: string) => {
    try {
      // Handle both Unix ("/") and Windows ("\\") path separators
      const fileName = filePath.split(/[\/\\]/).pop() ?? filePath;

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        fileName,
        currentFilePath: filePath,
      }));

      // Read file bytes via Tauri FS plugin
      const fileBytes = await readFile(filePath);
      setPdfBytes(new Uint8Array(fileBytes));

      // Load with PDF.js (may transfer the ArrayBuffer, so we use the original)
      const loadingTask = pdfjsLib.getDocument({ data: fileBytes });
      const pdfDocument = await loadingTask.promise;

      // Destroy previous document if any
      setState((prev) => {
        prev.pdfDocument?.destroy();
        return {
          pdfDocument,
          currentPage: 1,
          totalPages: pdfDocument.numPages,
          scale: DEFAULT_ZOOM,
          fileName,
          currentFilePath: prev.currentFilePath,
          loading: false,
          error: null,
        };
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  const openFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });

      if (!selected) return; // User cancelled

      await openFilePath(selected as string);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [openFilePath]);

  const goToPage = useCallback(
    (page: number) => {
      setState((prev) => {
        if (page < 1 || page > prev.totalPages) return prev;
        return { ...prev, currentPage: page };
      });
    },
    []
  );

  const nextPage = useCallback(() => {
    setState((prev) => {
      if (prev.currentPage >= prev.totalPages) return prev;
      return { ...prev, currentPage: prev.currentPage + 1 };
    });
  }, []);

  const prevPage = useCallback(() => {
    setState((prev) => {
      if (prev.currentPage <= 1) return prev;
      return { ...prev, currentPage: prev.currentPage - 1 };
    });
  }, []);

  const zoomIn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: Math.min(prev.scale + ZOOM_STEP, MAX_ZOOM),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: Math.max(prev.scale - ZOOM_STEP, MIN_ZOOM),
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setState((prev) => ({ ...prev, scale: DEFAULT_ZOOM }));
  }, []);

  const setScale = useCallback((newScale: number) => {
    setState((prev) => ({
      ...prev,
      scale: Math.min(Math.max(newScale, MIN_ZOOM), MAX_ZOOM),
    }));
  }, []);

  /**
   * Reload the viewer from raw PDF bytes (e.g. after in-memory edits).
   * Preserves the current page if possible.
   */
  const loadFromBytes = useCallback(async (bytes: Uint8Array) => {
    try {
      setPdfBytes(new Uint8Array(bytes));

      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdfDocument = await loadingTask.promise;

      setState((prev) => {
        prev.pdfDocument?.destroy();
        const currentPage = Math.min(prev.currentPage, pdfDocument.numPages);
        return {
          ...prev,
          pdfDocument,
          currentPage: currentPage || 1,
          totalPages: pdfDocument.numPages,
          loading: false,
          error: null,
        };
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  return {
    ...state,
    pdfBytes,
    openFile,
    openFilePath,
    loadFromBytes,
    goToPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    resetZoom,
    setScale,
  };
}
