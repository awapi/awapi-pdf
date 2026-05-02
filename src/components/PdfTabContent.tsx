import { useState, useCallback, useRef, useEffect } from "react";
import { Toolbar } from "./Toolbar";
import { Sidebar } from "./Sidebar";
import { PdfViewer } from "./PdfViewer";
import { WelcomeScreen } from "./WelcomeScreen";
import { SearchBar } from "./SearchBar";
import { SplitDialog } from "./SplitDialog";
import { SignatureDialog } from "./SignatureDialog";
import { MovePageDialog } from "./MovePageDialog";
import { usePdfDocument } from "../hooks/usePdfDocument";
import { useSearch } from "../hooks/useSearch";
import { useAnnotations } from "../hooks/useAnnotations";
import { usePdfEditor } from "../hooks/usePdfEditor";
import { usePrint } from "../hooks/usePrint";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import type { RecentFile } from "../hooks/useRecentFiles";

interface PdfTabContentProps {
  active: boolean;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  /** Called when the displayed file name changes (for the tab bar label). */
  onTitleChange: (title: string | null) => void;
  /** Called when the open file path changes (full path, or null when no file). */
  onFilePathChange: (filePath: string | null) => void;
  /** When non-null, the tab should open this file path immediately. */
  pendingFilePath: string | null;
  /** Called once the pending file has been consumed (opened or errored). */
  onPendingFileConsumed: () => void;
  /** List of recently opened files (path + display name). */
  recentFiles: RecentFile[];
  /** Called when the user picks a recent file to open. */
  onOpenRecentFile: (path: string) => void;
}

export function PdfTabContent({
  active,
  theme,
  onToggleTheme,
  onTitleChange,
  onFilePathChange,
  pendingFilePath,
  onPendingFileConsumed,
  recentFiles,
  onOpenRecentFile,
}: PdfTabContentProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [movePageDialogOpen, setMovePageDialogOpen] = useState(false);

  const {
    pdfDocument,
    currentPage,
    totalPages,
    scale,
    fileName,
    currentFilePath,
    loading,
    error,
    pdfBytes,
    openFile,
    openFilePath,
    loadFromBytes,
    goToPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    resetZoom,
    setScale,
  } = usePdfDocument();

  const {
    results: searchResults,
    searching,
    currentResultIndex,
    search,
    clearSearch,
    nextResult,
    prevResult,
  } = useSearch(pdfDocument);

  const {
    annotations,
    activeTool,
    setActiveTool,
    highlightColor,
    setHighlightColor,
    addHighlight,
    addNote,
    updateNoteText,
    addDrawStroke,
    addSignature,
    updateAnnotation,
    removeAnnotation,
    clearAnnotations,
  } = useAnnotations();

  const { mergePdfs, splitPdf, movePage, flattenAnnotationsToPdf } = usePdfEditor();

  const { print, printing } = usePrint(pdfDocument, pdfBytes);

  // Notify parent when the file name changes — use a ref so the effect only
  // re-runs when `fileName` itself changes, not when the callback identity changes.
  const onTitleChangeRef = useRef(onTitleChange);
  onTitleChangeRef.current = onTitleChange;
  useEffect(() => {
    onTitleChangeRef.current(fileName);
  }, [fileName]);

  // Notify parent when the full file path changes.
  const onFilePathChangeRef = useRef(onFilePathChange);
  onFilePathChangeRef.current = onFilePathChange;
  useEffect(() => {
    onFilePathChangeRef.current(currentFilePath);
  }, [currentFilePath]);

  // Open a pending file path pushed down from the parent (e.g. drag-drop, OS open).
  const onPendingFileConsumedRef = useRef(onPendingFileConsumed);
  onPendingFileConsumedRef.current = onPendingFileConsumed;
  useEffect(() => {
    if (!pendingFilePath) return;
    openFilePath(pendingFilePath).finally(() => {
      onPendingFileConsumedRef.current();
    });
  }, [pendingFilePath, openFilePath]);

  const handleSplit = useCallback(
    async (startPage: number, endPage: number) => {
      if (!pdfBytes) return;
      const newBytes = await splitPdf(pdfBytes, startPage, endPage);
      if (newBytes) await loadFromBytes(newBytes);
      setSplitDialogOpen(false);
    },
    [pdfBytes, splitPdf, loadFromBytes]
  );

  const handleMovePage = useCallback(
    async (fromPage: number, toPage: number) => {
      if (!pdfBytes) return;
      const newBytes = await movePage(pdfBytes, fromPage, toPage);
      if (newBytes) await loadFromBytes(newBytes);
      setMovePageDialogOpen(false);
    },
    [pdfBytes, movePage, loadFromBytes]
  );

  const handleSaveAs = useCallback(async () => {
    if (!pdfBytes) return;
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const outputPath = await save({
      filters: [{ name: "PDF", extensions: ["pdf"] }],
      defaultPath: fileName ?? "document.pdf",
      title: "Save PDF As",
    });
    if (outputPath) {
      const bytesToWrite =
        annotations.length > 0
          ? await flattenAnnotationsToPdf(pdfBytes, annotations)
          : pdfBytes;
      await writeFile(outputPath, bytesToWrite);
    }
  }, [pdfBytes, fileName, annotations, flattenAnnotationsToPdf]);

  const viewerRef = useRef<HTMLElement>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  // Pinch-to-zoom via trackpad wheel events (ctrlKey is set by the OS).
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const zoomFactor = 1 - e.deltaY * 0.01;
      setScale(scaleRef.current * zoomFactor);
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [setScale]);

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (prev) clearSearch();
      return !prev;
    });
  }, [clearSearch]);

  useKeyboardShortcuts({
    onNextPage: nextPage,
    onPrevPage: prevPage,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onResetZoom: resetZoom,
    onOpenFile: openFile,
    onToggleSearch: toggleSearch,
    onPrint: print,
    enabled: active,
  });

  return (
    <div className="tab-content" style={active ? undefined : { display: "none" }}>
      <Toolbar
        fileName={fileName}
        currentPage={currentPage}
        totalPages={totalPages}
        scale={scale}
        onOpenFile={openFile}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        onGoToPage={goToPage}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onToggleSidebar={toggleSidebar}
        onToggleSearch={toggleSearch}
        onToggleTheme={onToggleTheme}
        theme={theme}
        hasPdf={!!pdfDocument}
        activeTool={activeTool}
        onSetActiveTool={setActiveTool}
        highlightColor={highlightColor}
        onSetHighlightColor={setHighlightColor}
        hasAnnotations={annotations.length > 0}
        onClearAnnotations={clearAnnotations}
        onMergePdfs={async () => {
          const newBytes = await mergePdfs(pdfBytes);
          if (newBytes) await loadFromBytes(newBytes);
        }}
        onSplitPdf={() => setSplitDialogOpen(true)}
        onSignPdf={() => setSignatureDialogOpen(true)}
        onMovePage={() => setMovePageDialogOpen(true)}
        onSaveAs={handleSaveAs}
        onPrint={print}
        printing={printing}
        recentFiles={recentFiles}
        onOpenRecentFile={onOpenRecentFile}
      />
      {searchOpen && (
        <SearchBar
          onSearch={search}
          onClear={clearSearch}
          onNext={nextResult}
          onPrev={prevResult}
          onGoToResult={goToPage}
          results={searchResults}
          currentResultIndex={currentResultIndex}
          searching={searching}
          visible={searchOpen}
          onClose={() => {
            clearSearch();
            setSearchOpen(false);
          }}
        />
      )}
      <div className="app-body">
        {sidebarOpen && pdfDocument && (
          <Sidebar
            pdfDocument={pdfDocument}
            currentPage={currentPage}
            onPageSelect={goToPage}
          />
        )}
        <main className="viewer-area" ref={viewerRef}>
          {loading && (
            <div className="status-message">
              <div className="spinner" />
              <p>Loading PDF…</p>
            </div>
          )}
          {error && (
            <div className="status-message error">
              <p>Failed to load PDF</p>
              <p className="error-detail">{error}</p>
            </div>
          )}
          {!pdfDocument && !loading && !error && (
            <WelcomeScreen onOpenFile={openFile} />
          )}
          {pdfDocument && !loading && (
            <PdfViewer
              pdfDocument={pdfDocument}
              currentPage={currentPage}
              scale={scale}
              annotations={annotations}
              activeTool={activeTool}
              highlightColor={highlightColor}
              scrollContainer={viewerRef.current}
              onPageChange={goToPage}
              onAddHighlight={addHighlight}
              onAddNote={addNote}
              onUpdateNoteText={updateNoteText}
              onAddDrawStroke={addDrawStroke}
              onRemoveAnnotation={removeAnnotation}
              onUpdateAnnotation={updateAnnotation}
            />
          )}
        </main>
      </div>
      {splitDialogOpen && pdfDocument && (
        <SplitDialog
          totalPages={totalPages}
          onSplit={handleSplit}
          onClose={() => setSplitDialogOpen(false)}
        />
      )}
      {signatureDialogOpen && pdfDocument && (
        <SignatureDialog
          onApply={(dataUrl) => {
            addSignature(currentPage, 0.3, 0.4, 0.4, 0.15, dataUrl);
            setSignatureDialogOpen(false);
          }}
          onClose={() => setSignatureDialogOpen(false)}
        />
      )}
      {movePageDialogOpen && pdfDocument && (
        <MovePageDialog
          totalPages={totalPages}
          currentPage={currentPage}
          onMove={handleMovePage}
          onClose={() => setMovePageDialogOpen(false)}
        />
      )}
    </div>
  );
}
