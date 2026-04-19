export type AnnotationTool = "select" | "highlight" | "note" | "draw" | null;

export type HighlightColor = "yellow" | "green" | "blue" | "pink";

export interface HighlightAnnotation {
  type: "highlight";
  id: string;
  page: number;
  /** Rects normalised to [0..1] relative to page dimensions */
  rects: Array<{ x: number; y: number; w: number; h: number }>;
  color: HighlightColor;
}

export interface NoteAnnotation {
  type: "note";
  id: string;
  page: number;
  /** Position normalised to [0..1] */
  x: number;
  y: number;
  text: string;
}

export interface DrawStroke {
  type: "draw";
  id: string;
  page: number;
  /** Points normalised to [0..1] */
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
}

export interface SignatureAnnotation {
  type: "signature";
  id: string;
  page: number;
  /** Position & size normalised to [0..1] */
  x: number;
  y: number;
  w: number;
  h: number;
  dataUrl: string;
}

export type Annotation =
  | HighlightAnnotation
  | NoteAnnotation
  | DrawStroke
  | SignatureAnnotation;
