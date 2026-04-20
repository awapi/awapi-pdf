import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { PDFDocumentProxy } from "pdfjs-dist";

// WKWebView (macOS) cannot render canvas content in its print compositor —
// canvas elements and toDataURL() both produce blank pages. On macOS we
// delegate to a Rust command that writes a temp PDF and opens the native
// print dialog via Preview. On Windows (WebView2) and Linux (WebKitGTK)
// canvas printing works normally, so we use window.print() directly.
const IS_MAC =
  /mac/i.test(navigator.platform) || /macintosh/i.test(navigator.userAgent);

async function printWithCanvas(pdfDocument: PDFDocumentProxy) {
  const PRINT_SCALE = 2;
  const totalPages = pdfDocument.numPages;
  const savedChildren = Array.from(document.body.children);

  const printContainer = document.createElement("div");
  printContainer.id = "print-container";
  printContainer.style.cssText = "background:#fff;margin:0;padding:0;";

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDocument.getPage(i);
    const viewport = page.getViewport({ scale: PRINT_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    canvas.style.cssText =
      "display:block;width:100%;height:auto;margin:0;padding:0;" +
      (i < totalPages ? "page-break-after:always;break-after:page;" : "");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error(`Could not get 2D context for page ${i}`);
    await page.render({ canvasContext: ctx, viewport }).promise;
    printContainer.appendChild(canvas);
  }

  document.body.replaceChildren(printContainer);
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );

  try {
    await (window.print() as unknown as Promise<void>);
  } finally {
    document.body.replaceChildren(...savedChildren);
  }
}

export function usePrint(
  pdfDocument: PDFDocumentProxy | null,
  pdfBytes: Uint8Array | null
) {
  const [printing, setPrinting] = useState(false);

  const print = useCallback(async () => {
    if (!pdfDocument || printing) return;
    if (IS_MAC && !pdfBytes) return;

    setPrinting(true);
    try {
      if (IS_MAC) {
        await invoke("print_pdf", { bytes: Array.from(pdfBytes!) });
      } else {
        await printWithCanvas(pdfDocument);
      }
    } finally {
      setPrinting(false);
    }
  }, [pdfDocument, pdfBytes, printing]);

  return { print, printing };
}