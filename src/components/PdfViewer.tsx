import { useRef, useEffect, useState, forwardRef } from "react";
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
  scrollContainer: HTMLElement | null;
  onPageChange: (page: number) => void;
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

interface PageRendererProps {
  pdfDocument: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  annotations: Annotation[];
  activeTool: AnnotationTool;
  highlightColor: HighlightColor;
  onAddHighlight: PdfViewerProps["onAddHighlight"];
  onAddNote: PdfViewerProps["onAddNote"];
  onUpdateNoteText: PdfViewerProps["onUpdateNoteText"];
  onAddDrawStroke: PdfViewerProps["onAddDrawStroke"];
  onRemoveAnnotation: PdfViewerProps["onRemoveAnnotation"];
  onUpdateAnnotation: PdfViewerProps["onUpdateAnnotation"];
}

const PageRenderer = forwardRef<HTMLDivElement, PageRendererProps>(
  function PageRenderer(
    {
      pdfDocument,
      pageNumber,
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
    },
    ref
  ) {
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
        const page = await pdfDocument.getPage(pageNumber);
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
    }, [pdfDocument, pageNumber, scale]);

    return (
      <div ref={ref} className="pdf-page-wrapper" data-page={pageNumber}>
        <canvas ref={canvasRef} />
        <div ref={textLayerRef} className="textLayer" />
        <div ref={formLayerRef} className="annotationLayer" />
        {pageDims.w > 0 && (
          <AnnotationLayer
            annotations={annotations}
            activeTool={activeTool}
            highlightColor={highlightColor}
            pageWidth={pageDims.w}
            pageHeight={pageDims.h}
            page={pageNumber}
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
);

export function PdfViewer({
  pdfDocument,
  currentPage,
  scale,
  annotations,
  activeTool,
  highlightColor,
  scrollContainer,
  onPageChange,
  onAddHighlight,
  onAddNote,
  onUpdateNoteText,
  onAddDrawStroke,
  onRemoveAnnotation,
  onUpdateAnnotation,
}: PdfViewerProps) {
  const totalPages = pdfDocument.numPages;
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Suppress IntersectionObserver updates during programmatic scrolls
  const scrollingRef = useRef(false);
  // Track intersection ratio per page to find the most-visible page
  const ratiosRef = useRef<Map<number, number>>(new Map());

  // Scroll to currentPage when it changes via toolbar / sidebar / keyboard
  useEffect(() => {
    const el = pageRefs.current[currentPage - 1];
    if (!el) return;
    scrollingRef.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    const timer = setTimeout(() => {
      scrollingRef.current = false;
    }, 800);
    return () => clearTimeout(timer);
  }, [currentPage]);

  // Track which page is most visible and report via onPageChange
  useEffect(() => {
    if (!scrollContainer) return;
    ratiosRef.current.clear();

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingRef.current) return;
        for (const entry of entries) {
          const pageNum = parseInt(
            (entry.target as HTMLElement).dataset.page ?? "1",
            10
          );
          ratiosRef.current.set(pageNum, entry.intersectionRatio);
        }
        let bestPage = 1;
        let bestRatio = -1;
        ratiosRef.current.forEach((ratio, page) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestPage = page;
          }
        });
        if (bestRatio > 0) {
          onPageChange(bestPage);
        }
      },
      { root: scrollContainer, threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0] }
    );

    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [pdfDocument, totalPages, scrollContainer, onPageChange]);

  return (
    <>
      {Array.from({ length: totalPages }, (_, i) => {
        const pageNum = i + 1;
        return (
          <PageRenderer
            key={pageNum}
            ref={(el) => {
              pageRefs.current[i] = el;
            }}
            pdfDocument={pdfDocument}
            pageNumber={pageNum}
            scale={scale}
            annotations={annotations.filter((a) => a.page === pageNum)}
            activeTool={activeTool}
            highlightColor={highlightColor}
            onAddHighlight={onAddHighlight}
            onAddNote={onAddNote}
            onUpdateNoteText={onUpdateNoteText}
            onAddDrawStroke={onAddDrawStroke}
            onRemoveAnnotation={onRemoveAnnotation}
            onUpdateAnnotation={onUpdateAnnotation}
          />
        );
      })}
    </>
  );
}
