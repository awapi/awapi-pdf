import { useRef, useEffect } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface SidebarProps {
  pdfDocument: PDFDocumentProxy;
  currentPage: number;
  onPageSelect: (page: number) => void;
}

export function Sidebar({
  pdfDocument,
  currentPage,
  onPageSelect,
}: SidebarProps) {
  const totalPages = pdfDocument.numPages;

  return (
    <aside className="sidebar">
      {Array.from({ length: totalPages }, (_, i) => (
        <ThumbnailItem
          key={i + 1}
          pdfDocument={pdfDocument}
          pageNumber={i + 1}
          isActive={currentPage === i + 1}
          onClick={() => onPageSelect(i + 1)}
        />
      ))}
    </aside>
  );
}

function ThumbnailItem({
  pdfDocument,
  pageNumber,
  isActive,
  onClick,
}: {
  pdfDocument: PDFDocumentProxy;
  pageNumber: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderThumbnail() {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 0.3 });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      await page.render({ canvasContext: ctx, viewport }).promise;
    }

    renderThumbnail();
    return () => {
      cancelled = true;
    };
  }, [pdfDocument, pageNumber]);

  return (
    <div
      className={`thumbnail-item${isActive ? " active" : ""}`}
      onClick={onClick}
    >
      <canvas ref={canvasRef} className="thumbnail-canvas" />
      <div className="thumbnail-label">{pageNumber}</div>
    </div>
  );
}
