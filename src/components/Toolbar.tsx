import { useState, useCallback } from "react";
import type { AnnotationTool, HighlightColor } from "../types/annotations";

interface ToolbarProps {
  fileName: string | null;
  currentPage: number;
  totalPages: number;
  scale: number;
  hasPdf: boolean;
  onOpenFile: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleSidebar: () => void;
  onToggleSearch: () => void;
  onToggleTheme: () => void;
  theme: "dark" | "light";
  activeTool: AnnotationTool;
  onSetActiveTool: (tool: AnnotationTool) => void;
  highlightColor: HighlightColor;
  onSetHighlightColor: (color: HighlightColor) => void;
  hasAnnotations: boolean;
  onClearAnnotations: () => void;
  onMergePdfs: () => void;
  onSplitPdf: () => void;
  onCreateBlankPdf: () => void;
  onSignPdf: () => void;
  onMovePage: () => void;
  onSaveAs: () => void;
  onPrint: () => void;
  printing: boolean;
}

export function Toolbar({
  fileName,
  currentPage,
  totalPages,
  scale,
  hasPdf,
  onOpenFile,
  onPrevPage,
  onNextPage,
  onGoToPage,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleSidebar,
  onToggleSearch,
  onToggleTheme,
  theme,
  activeTool,
  onSetActiveTool,
  highlightColor,
  onSetHighlightColor,
  hasAnnotations,
  onClearAnnotations,
  onMergePdfs,
  onSplitPdf,
  onCreateBlankPdf,
  onSignPdf,
  onMovePage,
  onSaveAs,
  onPrint,
  printing,
}: ToolbarProps) {
  const [pageInput, setPageInput] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handlePageSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const page = parseInt(pageInput, 10);
      if (page >= 1 && page <= totalPages) {
        onGoToPage(page);
      }
      setPageInput("");
    },
    [pageInput, totalPages, onGoToPage]
  );

  return (
    <div className="toolbar">
      {/* File actions */}
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={onOpenFile} title="Open PDF">
          📂
        </button>
        {hasPdf && (
          <button className="toolbar-btn" onClick={onSaveAs} title="Save As">
            💾
          </button>
        )}
        {hasPdf && (
          <button
            className="toolbar-btn"
            onClick={onPrint}
            disabled={printing}
            title="Print (Cmd+P)"
          >
            🖨️
          </button>
        )}
        {hasPdf && (
          <button
            className="toolbar-btn"
            onClick={onToggleSidebar}
            title="Toggle sidebar"
          >
            ☰
          </button>
        )}
      </div>

      {hasPdf && (
        <>
          <div className="toolbar-separator" />

          {/* Page navigation */}
          <div className="toolbar-group">
            <button
              className="toolbar-btn"
              onClick={onPrevPage}
              disabled={currentPage <= 1}
              title="Previous page"
            >
              ◀
            </button>
            <form onSubmit={handlePageSubmit} style={{ display: "contents" }}>
              <input
                className="page-input"
                type="text"
                value={pageInput || currentPage}
                onChange={(e) => setPageInput(e.target.value)}
                onFocus={() => setPageInput(String(currentPage))}
                onBlur={() => setPageInput("")}
              />
            </form>
            <span className="page-label">/ {totalPages}</span>
            <button
              className="toolbar-btn"
              onClick={onNextPage}
              disabled={currentPage >= totalPages}
              title="Next page"
            >
              ▶
            </button>
          </div>

          <div className="toolbar-separator" />

          {/* Zoom */}
          <div className="toolbar-group">
            <button
              className="toolbar-btn"
              onClick={onZoomOut}
              disabled={scale <= 0.25}
              title="Zoom out"
            >
              −
            </button>
            <span className="zoom-label">{Math.round(scale * 100)}%</span>
            <button
              className="toolbar-btn"
              onClick={onZoomIn}
              disabled={scale >= 5}
              title="Zoom in"
            >
              +
            </button>
            <button
              className="toolbar-btn"
              onClick={onResetZoom}
              title="Reset zoom"
            >
              ⊙
            </button>
          </div>

          <div className="toolbar-separator" />

          {/* Search */}
          <div className="toolbar-group">
            <button
              className="toolbar-btn"
              onClick={onToggleSearch}
              title="Search (Cmd+F)"
            >
              🔍
            </button>
          </div>

          <div className="toolbar-separator" />

          {/* Annotation tools */}
          <div className="toolbar-group">
            <button
              className={`toolbar-btn ${activeTool === "highlight" ? "toolbar-btn-active" : ""}`}
              onClick={() =>
                onSetActiveTool(activeTool === "highlight" ? null : "highlight")
              }
              title="Highlight text"
            >
              🖍️
            </button>
            {activeTool === "highlight" && (
              <div className="color-picker-wrapper">
                <button
                  className="toolbar-btn color-swatch"
                  style={{ color: highlightColor }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  title="Highlight color"
                >
                  ●
                </button>
                {showColorPicker && (
                  <div className="color-picker-dropdown">
                    {(
                      ["yellow", "green", "blue", "pink"] as HighlightColor[]
                    ).map((c) => (
                      <button
                        key={c}
                        className={`color-option ${c === highlightColor ? "color-option-active" : ""}`}
                        style={{
                          backgroundColor:
                            c === "yellow"
                              ? "#ffeb3b"
                              : c === "green"
                                ? "#4caf50"
                                : c === "blue"
                                  ? "#2196f3"
                                  : "#e91e63",
                        }}
                        onClick={() => {
                          onSetHighlightColor(c);
                          setShowColorPicker(false);
                        }}
                        title={c}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              className={`toolbar-btn ${activeTool === "note" ? "toolbar-btn-active" : ""}`}
              onClick={() =>
                onSetActiveTool(activeTool === "note" ? null : "note")
              }
              title="Sticky note"
            >
              📝
            </button>
            <button
              className={`toolbar-btn ${activeTool === "draw" ? "toolbar-btn-active" : ""}`}
              onClick={() =>
                onSetActiveTool(activeTool === "draw" ? null : "draw")
              }
              title="Freehand draw"
            >
              ✏️
            </button>
            {hasAnnotations && (
              <button
                className="toolbar-btn"
                onClick={onClearAnnotations}
                title="Clear all annotations"
              >
                🗑️
              </button>
            )}
          </div>
        </>
      )}

      {/* PDF Editing */}
      <div className="toolbar-separator" />
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={onMergePdfs}
          title="Merge PDFs"
        >
          📎
        </button>
        {hasPdf && (
          <button
            className="toolbar-btn"
            onClick={onSplitPdf}
            title="Extract pages"
          >
            ✂️
          </button>
        )}
        <button
          className="toolbar-btn"
          onClick={onCreateBlankPdf}
          title="Create blank PDF"
        >
          📄
        </button>
        {hasPdf && (
          <button
            className="toolbar-btn"
            onClick={onSignPdf}
            title="Add signature"
          >
            ✍️
          </button>
        )}
        {hasPdf && (
          <button
            className="toolbar-btn"
            onClick={onMovePage}
            title="Move page"
          >
            🔀
          </button>
        )}
      </div>

      {/* File name */}
      {fileName && <span className="file-name">{fileName}</span>}

      {/* Theme toggle */}
      <button
        className="toolbar-btn"
        onClick={onToggleTheme}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        style={fileName ? undefined : { marginLeft: "auto" }}
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
    </div>
  );
}
