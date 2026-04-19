import { useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";

export function usePdfEditor() {
  /**
   * Merge the current PDF with one or more selected PDFs.
   * Returns merged bytes in memory (does not save to disk).
   */
  const mergePdfs = useCallback(async (currentPdfBytes?: Uint8Array | null): Promise<Uint8Array | null> => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
        title: currentPdfBytes
          ? "Select PDF(s) to merge with current document"
          : "Select PDFs to merge (2 or more)",
      });

      const selectedPaths = !selected
        ? []
        : Array.isArray(selected)
          ? selected
          : [selected];

      if (selectedPaths.length === 0) return null;

      if (!currentPdfBytes && selectedPaths.length < 2) {
        alert("Please select at least 2 PDF files to merge.");
        return null;
      }

      const merged = await PDFDocument.create();

      // Add current document first if open
      if (currentPdfBytes) {
        const currentDoc = await PDFDocument.load(currentPdfBytes);
        const pages = await merged.copyPages(currentDoc, currentDoc.getPageIndices());
        for (const page of pages) {
          merged.addPage(page);
        }
      }

      // Add selected files
      for (const filePath of selectedPaths) {
        const bytes = await readFile(filePath);
        const doc = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        for (const page of pages) {
          merged.addPage(page);
        }
      }

      const mergedBytes = await merged.save();
      return new Uint8Array(mergedBytes);
    } catch (err) {
      console.error("mergePdfs failed:", err);
      return null;
    }
  }, []);

  /**
   * Extract a range of pages from the PDF.
   * Returns the new PDF bytes in memory (does not save to disk).
   */
  const splitPdf = useCallback(
    async (
      sourceBytes: Uint8Array,
      startPage: number,
      endPage: number
    ): Promise<Uint8Array | null> => {
      try {
        const sourceDoc = await PDFDocument.load(sourceBytes);
        const totalPages = sourceDoc.getPageCount();

        const clampedStart = Math.max(0, startPage - 1); // convert to 0-indexed
        const clampedEnd = Math.min(totalPages - 1, endPage - 1);

        if (clampedStart > clampedEnd) return null;

        const newDoc = await PDFDocument.create();
        const indices = Array.from(
          { length: clampedEnd - clampedStart + 1 },
          (_, i) => clampedStart + i
        );
        const pages = await newDoc.copyPages(sourceDoc, indices);
        for (const page of pages) {
          newDoc.addPage(page);
        }

        const newBytes = await newDoc.save();
        return new Uint8Array(newBytes);
      } catch (err) {
        console.error("splitPdf failed:", err);
        return null;
      }
    },
    []
  );

  /**
   * Create a blank PDF with the given number of pages.
   * Returns the bytes in memory (does not save to disk).
   */
  const createBlankPdf = useCallback(
    async (pageCount: number = 1): Promise<Uint8Array | null> => {
      try {
        const doc = await PDFDocument.create();
        for (let i = 0; i < pageCount; i++) {
          doc.addPage([612, 792]); // US Letter size
        }

        const bytes = await doc.save();
        return new Uint8Array(bytes);
      } catch (err) {
        console.error("createBlankPdf failed:", err);
        return null;
      }
    },
    []
  );

  /**
   * Move a page from one position to another within the same PDF.
   * Returns the new PDF bytes on success, or null on failure.
   */
  const movePage = useCallback(
    async (
      sourceBytes: Uint8Array,
      fromPage: number,
      toPage: number
    ): Promise<Uint8Array | null> => {
      try {
        const sourceDoc = await PDFDocument.load(sourceBytes);
        const totalPages = sourceDoc.getPageCount();

        if (
          fromPage < 1 || fromPage > totalPages ||
          toPage < 1 || toPage > totalPages ||
          fromPage === toPage
        ) {
          return null;
        }

        const newDoc = await PDFDocument.create();

        // Build new page order
        const indices: number[] = [];
        const from0 = fromPage - 1;
        const to0 = toPage - 1;

        for (let i = 0; i < totalPages; i++) {
          if (i === from0) continue; // skip the page being moved
          indices.push(i);
        }
        // Insert at destination
        indices.splice(to0 > from0 ? to0 - 1 : to0, 0, from0);

        // Workaround: copy one at a time to preserve order
        for (const idx of indices) {
          const [page] = await newDoc.copyPages(sourceDoc, [idx]);
          newDoc.addPage(page);
        }

        const newBytes = await newDoc.save();
        return new Uint8Array(newBytes);
      } catch (err) {
        console.error("movePage failed:", err);
        return null;
      }
    },
    []
  );

  return {
    mergePdfs,
    splitPdf,
    createBlankPdf,
    movePage,
  };
}
