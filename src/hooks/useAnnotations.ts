import { useState, useCallback } from "react";
import type {
  Annotation,
  AnnotationTool,
  HighlightColor,
  HighlightAnnotation,
  NoteAnnotation,
  DrawStroke,
  SignatureAnnotation,
} from "../types/annotations";

let nextId = 1;
function genId(): string {
  return `ann-${nextId++}`;
}

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeTool, setActiveTool] = useState<AnnotationTool>(null);
  const [highlightColor, setHighlightColor] = useState<HighlightColor>("yellow");

  const getPageAnnotations = useCallback(
    (page: number) => annotations.filter((a) => a.page === page),
    [annotations]
  );

  const addHighlight = useCallback(
    (
      page: number,
      rects: Array<{ x: number; y: number; w: number; h: number }>,
      color: HighlightColor
    ) => {
      const highlight: HighlightAnnotation = {
        type: "highlight",
        id: genId(),
        page,
        rects,
        color,
      };
      setAnnotations((prev) => [...prev, highlight]);
      return highlight;
    },
    []
  );

  const addNote = useCallback((page: number, x: number, y: number) => {
    const note: NoteAnnotation = {
      type: "note",
      id: genId(),
      page,
      x,
      y,
      text: "",
    };
    setAnnotations((prev) => [...prev, note]);
    return note;
  }, []);

  const updateNoteText = useCallback((id: string, text: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id && a.type === "note" ? { ...a, text } : a))
    );
  }, []);

  const addDrawStroke = useCallback(
    (
      page: number,
      points: Array<{ x: number; y: number }>,
      color: string,
      width: number
    ) => {
      const stroke: DrawStroke = {
        type: "draw",
        id: genId(),
        page,
        points,
        color,
        width,
      };
      setAnnotations((prev) => [...prev, stroke]);
      return stroke;
    },
    []
  );

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addSignature = useCallback(
    (page: number, x: number, y: number, w: number, h: number, dataUrl: string) => {
      const sig: SignatureAnnotation = {
        type: "signature",
        id: genId(),
        page,
        x,
        y,
        w,
        h,
        dataUrl,
      };
      setAnnotations((prev) => [...prev, sig]);
      return sig;
    },
    []
  );

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
  }, []);

  return {
    annotations,
    activeTool,
    setActiveTool,
    highlightColor,
    setHighlightColor,
    getPageAnnotations,
    addHighlight,
    addNote,
    updateNoteText,
    addDrawStroke,
    addSignature,
    removeAnnotation,
    clearAnnotations,
  };
}
