import { useEffect } from "react";

interface KeyboardShortcutsOptions {
  onNextPage: () => void;
  onPrevPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onOpenFile: () => void;
  onToggleSearch: () => void;
  enabled: boolean;
}

export function useKeyboardShortcuts({
  onNextPage,
  onPrevPage,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenFile,
  onToggleSearch,
  enabled,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;

      // Open file: Cmd/Ctrl+O
      if (isMod && e.key === "o") {
        e.preventDefault();
        onOpenFile();
        return;
      }

      // Find: Cmd/Ctrl+F
      if (isMod && e.key === "f") {
        e.preventDefault();
        onToggleSearch();
        return;
      }

      // Zoom in: Cmd/Ctrl+=
      if (isMod && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        onZoomIn();
        return;
      }

      // Zoom out: Cmd/Ctrl+-
      if (isMod && e.key === "-") {
        e.preventDefault();
        onZoomOut();
        return;
      }

      // Reset zoom: Cmd/Ctrl+0
      if (isMod && e.key === "0") {
        e.preventDefault();
        onResetZoom();
        return;
      }

      // Page navigation (only when not in input)
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        onNextPage();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        onPrevPage();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onNextPage, onPrevPage, onZoomIn, onZoomOut, onResetZoom, onOpenFile, onToggleSearch]);
}
