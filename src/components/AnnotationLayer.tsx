import { useRef, useState, useCallback, useEffect } from "react";
import type {
  Annotation,
  AnnotationTool,
  HighlightColor,
  DrawStroke,
} from "../types/annotations";

interface AnnotationLayerProps {
  annotations: Annotation[];
  activeTool: AnnotationTool;
  highlightColor: HighlightColor;
  pageWidth: number;
  pageHeight: number;
  page: number;
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
}

const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: "rgba(255, 235, 59, 0.35)",
  green: "rgba(76, 175, 80, 0.35)",
  blue: "rgba(33, 150, 243, 0.35)",
  pink: "rgba(233, 30, 99, 0.30)",
};

export function AnnotationLayer({
  annotations,
  activeTool,
  highlightColor,
  pageWidth,
  pageHeight,
  page,
  onAddHighlight,
  onAddNote,
  onUpdateNoteText,
  onAddDrawStroke,
  onRemoveAnnotation,
}: AnnotationLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingPoints, setDrawingPoints] = useState<
    Array<{ x: number; y: number }>
  >([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);

  // --- Highlight: capture text selection via document-level listener
  //     so the text layer underneath receives pointer events for selection.
  useEffect(() => {
    if (activeTool !== "highlight") return;

    function handleDocMouseUp() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !layerRef.current) return;

      const range = selection.getRangeAt(0);
      const wrapper = layerRef.current.parentElement;
      if (!wrapper) return;

      const wrapperRect = wrapper.getBoundingClientRect();
      const clientRects = range.getClientRects();
      const normalizedRects: Array<{ x: number; y: number; w: number; h: number }> = [];

      for (let i = 0; i < clientRects.length; i++) {
        const r = clientRects[i];
        // Only include rects that overlap this page wrapper
        if (
          r.right < wrapperRect.left ||
          r.left > wrapperRect.right ||
          r.bottom < wrapperRect.top ||
          r.top > wrapperRect.bottom
        ) continue;
        normalizedRects.push({
          x: (r.left - wrapperRect.left) / wrapperRect.width,
          y: (r.top - wrapperRect.top) / wrapperRect.height,
          w: r.width / wrapperRect.width,
          h: r.height / wrapperRect.height,
        });
      }

      if (normalizedRects.length > 0) {
        onAddHighlight(page, normalizedRects, highlightColor);
        selection.removeAllRanges();
      }
    }

    document.addEventListener("mouseup", handleDocMouseUp);
    return () => document.removeEventListener("mouseup", handleDocMouseUp);
  }, [activeTool, highlightColor, page, onAddHighlight]);

  // --- Note: click to place ---
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== "note") return;
      const wrapper = layerRef.current?.parentElement;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      onAddNote(page, x, y);
    },
    [activeTool, page, onAddNote]
  );

  // --- Draw: freehand ---
  const getDrawPoint = useCallback(
    (e: React.MouseEvent): { x: number; y: number } | null => {
      const wrapper = layerRef.current?.parentElement;
      if (!wrapper) return null;
      const rect = wrapper.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    },
    []
  );

  const handleDrawStart = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== "draw") return;
      const pt = getDrawPoint(e);
      if (pt) {
        setDrawingPoints([pt]);
        setIsDrawing(true);
      }
    },
    [activeTool, getDrawPoint]
  );

  const handleDrawMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing || activeTool !== "draw") return;
      const pt = getDrawPoint(e);
      if (pt) {
        setDrawingPoints((prev) => [...prev, pt]);
      }
    },
    [isDrawing, activeTool, getDrawPoint]
  );

  const handleDrawEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (drawingPoints.length > 1) {
      onAddDrawStroke(page, drawingPoints, "#ff4444", 2);
    }
    setDrawingPoints([]);
  }, [isDrawing, drawingPoints, page, onAddDrawStroke]);

  // Render active drawing stroke on canvas
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = pageWidth;
    canvas.height = pageHeight;
    ctx.clearRect(0, 0, pageWidth, pageHeight);

    // Draw saved strokes
    const drawAnnotations = annotations.filter(
      (a): a is DrawStroke => a.type === "draw"
    );
    for (const stroke of drawAnnotations) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(
        stroke.points[0].x * pageWidth,
        stroke.points[0].y * pageHeight
      );
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(
          stroke.points[i].x * pageWidth,
          stroke.points[i].y * pageHeight
        );
      }
      ctx.stroke();
    }

    // Draw current in-progress stroke
    if (drawingPoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(
        drawingPoints[0].x * pageWidth,
        drawingPoints[0].y * pageHeight
      );
      for (let i = 1; i < drawingPoints.length; i++) {
        ctx.lineTo(
          drawingPoints[i].x * pageWidth,
          drawingPoints[i].y * pageHeight
        );
      }
      ctx.stroke();
    }
  }, [annotations, drawingPoints, pageWidth, pageHeight]);

  return (
    <div
      ref={layerRef}
      className={`annotation-layer ${activeTool && activeTool !== "highlight" ? "tool-active" : ""}`}
      style={{ width: pageWidth, height: pageHeight }}
      onMouseUp={handleDrawEnd}
      onClick={handleClick}
      onMouseDown={handleDrawStart}
      onMouseMove={handleDrawMove}
    >
      {/* Highlight overlays */}
      {annotations
        .filter((a) => a.type === "highlight")
        .map((h) =>
          h.type === "highlight"
            ? h.rects.map((r, i) => (
                <div
                  key={`${h.id}-${i}`}
                  className="highlight-rect"
                  style={{
                    left: `${r.x * 100}%`,
                    top: `${r.y * 100}%`,
                    width: `${r.w * 100}%`,
                    height: `${r.h * 100}%`,
                    backgroundColor: HIGHLIGHT_COLORS[h.color],
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onRemoveAnnotation(h.id);
                  }}
                />
              ))
            : null
        )}

      {/* Note icons */}
      {annotations
        .filter((a) => a.type === "note")
        .map(
          (n) =>
            n.type === "note" && (
              <div
                key={n.id}
                className={`note-icon ${editingNote === n.id ? "note-editing" : ""}`}
                style={{
                  left: `${n.x * 100}%`,
                  top: `${n.y * 100}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingNote(editingNote === n.id ? null : n.id);
                }}
              >
                📝
                {editingNote === n.id && (
                  <div
                    className="note-popup"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <textarea
                      className="note-textarea"
                      value={n.text}
                      onChange={(e) => onUpdateNoteText(n.id, e.target.value)}
                      placeholder="Enter note…"
                      autoFocus
                    />
                    <div className="note-actions">
                      <button
                        className="note-action-btn"
                        onClick={() => setEditingNote(null)}
                      >
                        Done
                      </button>
                      <button
                        className="note-action-btn note-delete"
                        onClick={() => {
                          onRemoveAnnotation(n.id);
                          setEditingNote(null);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
        )}

      {/* Signature images */}
      {annotations
        .filter((a) => a.type === "signature")
        .map(
          (s) =>
            s.type === "signature" && (
              <img
                key={s.id}
                className="signature-img"
                src={s.dataUrl}
                alt="Signature"
                style={{
                  position: "absolute",
                  left: `${s.x * 100}%`,
                  top: `${s.y * 100}%`,
                  width: `${s.w * 100}%`,
                  height: `${s.h * 100}%`,
                  pointerEvents: "auto",
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onRemoveAnnotation(s.id);
                }}
              />
            )
        )}

      {/* Draw canvas */}
      <canvas
        ref={drawCanvasRef}
        className="draw-canvas"
        style={{ width: pageWidth, height: pageHeight }}
      />
    </div>
  );
}
