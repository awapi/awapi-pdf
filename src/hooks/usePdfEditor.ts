import { useCallback } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import type { Annotation, HighlightColor } from "../types/annotations";

function highlightColorToRgb(color: HighlightColor) {
  switch (color) {
    case "yellow": return rgb(1, 0.92, 0.23);
    case "green":  return rgb(0.30, 0.69, 0.31);
    case "blue":   return rgb(0.13, 0.59, 0.95);
    case "pink":   return rgb(0.91, 0.12, 0.39);
  }
}

function parseCssColorToRgb(css: string) {
  // Hex #rrggbb or #rgb
  const hex6 = css.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hex6) return rgb(parseInt(hex6[1], 16) / 255, parseInt(hex6[2], 16) / 255, parseInt(hex6[3], 16) / 255);
  const hex3 = css.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (hex3) return rgb(parseInt(hex3[1] + hex3[1], 16) / 255, parseInt(hex3[2] + hex3[2], 16) / 255, parseInt(hex3[3] + hex3[3], 16) / 255);
  // rgb(r, g, b)
  const rgbMatch = css.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) return rgb(+rgbMatch[1] / 255, +rgbMatch[2] / 255, +rgbMatch[3] / 255);
  return rgb(0, 0, 0);
}

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

  /**
   * Flatten all in-memory annotations into the PDF bytes and return the result.
   * Handles highlights, freehand draws, signatures, and notes.
   */
  const flattenAnnotationsToPdf = useCallback(
    async (sourceBytes: Uint8Array, annotations: Annotation[]): Promise<Uint8Array> => {
      const pdfDoc = await PDFDocument.load(sourceBytes);
      const pages = pdfDoc.getPages();

      for (const ann of annotations) {
        const pageIdx = ann.page - 1;
        if (pageIdx < 0 || pageIdx >= pages.length) continue;
        const page = pages[pageIdx];
        const { width: W, height: H } = page.getSize();

        if (ann.type === "highlight") {
          const color = highlightColorToRgb(ann.color);
          for (const rect of ann.rects) {
            page.drawRectangle({
              x: rect.x * W,
              y: (1 - rect.y - rect.h) * H,
              width: rect.w * W,
              height: rect.h * H,
              color,
              opacity: 0.35,
            });
          }
        } else if (ann.type === "draw") {
          if (ann.points.length < 2) continue;
          const color = parseCssColorToRgb(ann.color);
          // ann.width is in screen pixels; scale proportionally to PDF page width
          const thickness = Math.max(0.5, (ann.width / 600) * W);
          for (let i = 0; i < ann.points.length - 1; i++) {
            const p1 = ann.points[i];
            const p2 = ann.points[i + 1];
            page.drawLine({
              start: { x: p1.x * W, y: (1 - p1.y) * H },
              end: { x: p2.x * W, y: (1 - p2.y) * H },
              thickness,
              color,
              opacity: 1,
            });
          }
        } else if (ann.type === "signature") {
          try {
            const base64 = ann.dataUrl.split(",")[1];
            const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
            const pdfImg = ann.dataUrl.startsWith("data:image/png")
              ? await pdfDoc.embedPng(imgBytes)
              : await pdfDoc.embedJpg(imgBytes);
            page.drawImage(pdfImg, {
              x: ann.x * W,
              y: (1 - ann.y - ann.h) * H,
              width: ann.w * W,
              height: ann.h * H,
            });
          } catch (err) {
            console.error("Failed to embed signature:", err);
          }
        } else if (ann.type === "note" && ann.text) {
          const x = ann.x * W;
          const y = (1 - ann.y) * H;
          const textWidth = Math.min(200, ann.text.length * 6 + 12);
          page.drawRectangle({
            x,
            y: y - 18,
            width: textWidth,
            height: 16,
            color: rgb(1, 0.97, 0.7),
            opacity: 0.85,
          });
          page.drawText(ann.text.slice(0, 50), {
            x: x + 3,
            y: y - 13,
            size: 9,
            color: rgb(0, 0, 0),
          });
        }
      }

      return new Uint8Array(await pdfDoc.save());
    },
    []
  );

  return {
    mergePdfs,
    splitPdf,
    createBlankPdf,
    movePage,
    flattenAnnotationsToPdf,
  };
}
