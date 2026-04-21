import { useRef, useEffect, useState } from "react";
import { TextLayer, AnnotationLayer as PdfjsAnnotationLayer } from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { AnnotationLayer } from "./AnnotationLayer";
import type {
  Annotation,
  AnnotationTool,
  HighlightColor,
} from "../types/annotations";
import "pdfjs-dist/web/pdf_viewer.css";

interface PdfViewerProps {
  pdfDocument: PDFDocumentProxy;
  currentPage: number;
  scale: number;
  annotations: Annotation[];
  activeTool: AnnotationTool;
  highlightColor: HighlightColor;
  onAddHighlight: (
    page: number,
    rects: Array<{ x: number; y: number; w: number; h: number }>,
    color: HighlightColor
  ) => void;
  onAddNote: (page: number, x: number, y: number) => void;
  onUpdateNoteText: (id: string, text: string) => void;
  onAddDrawStroke: (
    page: number,
    points: Array<{ x: number; y: number }>,
    color: string,
    width: number
  ) => void;
  onRemoveAnnotation: (id: string) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
}

export function PdfViewer({
  pdfDocument,
  currentPage,
  scale,
  annotations,
  activeTool,
  highlightColor,
  onAddHighlight,
  onAddNote,
  onUpdateNoteText,
  onAddDrawStroke,
  onRemoveAnnotation,
  onUpdateAnnotation,
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const formLayerRef = useRef<HTMLDivElement>(null);
  const [pageDims, setPageDims] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  useEffect(() => {
    let cancelled = false;
    let textLayerInstance: TextLayer | null = null;

    async function renderPage() {
      const page = await pdfDocument.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const textLayerDiv = textLayerRef.current;
      const formLayerDiv = formLayerRef.current;
      if (!canvas || !textLayerDiv || !formLayerDiv || cancelled) return;

      // Scale canvas buffer for high-DPI / Retina displays
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      setPageDims({ w: viewport.width, h: viewport.height });

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;

      if (cancelled) return;

      // Clear previous text layer
      textLayerDiv.innerHTML = "";
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;

      // Render text layer for selection
      const textContent = await page.getTextContent();
      if (cancelled) return;

      textLayerInstance = new TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport,
      });
      await textLayerInstance.render();

      if (cancelled) return;

      // Render PDF.js annotation layer for form fields
      formLayerDiv.innerHTML = "";
      formLayerDiv.style.width = `${viewport.width}px`;
      formLayerDiv.style.height = `${viewport.height}px`;

      const pdfAnnotations = await page.getAnnotations();
      if (cancelled) return;

      // Only render if there are widget (form) annotations
      const hasFormFields = pdfAnnotations.some(
        (a: { subtype: string }) => a.subtype === "Widget"
      );
      if (hasFormFields) {
        // Minimal link service stub required by PDF.js AnnotationLayer
        const linkService = {
          getDestinationHash: () => "#",
          getAnchorUrl: () => "#",
          addLinkAttributes: () => {},
          isPageVisible: () => true,
          isPageCached: () => true,
          executeNamedAction: () => {},
          executeSetOCGState: () => {},
          cachePageRef: () => {},
        };

        const annotationLayer = new PdfjsAnnotationLayer({
          div: formLayerDiv,
          accessibilityManager: null,
          annotationCanvasMap: null,
          annotationEditorUIManager: null,
          page,
          viewport,
          structTreeLayer: null,
        });

        await annotationLayer.render({
          viewport,
          div: formLayerDiv,
          annotations: pdfAnnotations,
          page,
          linkService,
          renderForms: true,
          annotationStorage: pdfDocument.annotationStorage,
        } as any);
      }
    }

    renderPage();

    return () => {
      cancelled = true;
      textLayerInstance?.cancel();
    };
  }, [pdfDocument, currentPage, scale]);

  const pageAnnotations = annotations.filter((a) => a.page === currentPage);

  return (
    <div className="pdf-page-wrapper">
      <canvas ref={canvasRef} />
      <div ref={textLayerRef} className="textLayer" />
      <div ref={formLayerRef} className="annotationLayer" />
      {pageDims.w > 0 && (
        <AnnotationLayer
          annotations={pageAnnotations}
          activeTool={activeTool}
          highlightColor={highlightColor}
          pageWidth={pageDims.w}
          pageHeight={pageDims.h}
          page={currentPage}
          onAddHighlight={onAddHighlight}
          onAddNote={onAddNote}
          onUpdateNoteText={onUpdateNoteText}
          onAddDrawStroke={onAddDrawStroke}
          onRemoveAnnotation={onRemoveAnnotation}
          onUpdateAnnotation={onUpdateAnnotation}
        />
      )}
    </div>
  );
}
