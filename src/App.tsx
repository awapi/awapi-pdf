import { useState, useCallback, useRef, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Toolbar } from "./components/Toolbar";
import { Sidebar } from "./components/Sidebar";
import { PdfViewer } from "./components/PdfViewer";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { SearchBar } from "./components/SearchBar";
import { SplitDialog } from "./components/SplitDialog";
import { SignatureDialog } from "./components/SignatureDialog";
import { MovePageDialog } from "./components/MovePageDialog";
import { usePdfDocument } from "./hooks/usePdfDocument";
import { useSearch } from "./hooks/useSearch";
import { useAnnotations } from "./hooks/useAnnotations";
import { usePdfEditor } from "./hooks/usePdfEditor";
import { usePrint } from "./hooks/usePrint";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import "./App.css";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [movePageDialogOpen, setMovePageDialogOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);
  const {
    pdfDocument,
    currentPage,
    totalPages,
    scale,
    fileName,
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
    removeAnnotation,
    clearAnnotations,
  } = useAnnotations();

  const { mergePdfs, splitPdf, createBlankPdf, movePage } = usePdfEditor();

  const { print, printing } = usePrint(pdfDocument, pdfBytes);

  const handleSplit = useCallback(
    async (startPage: number, endPage: number) => {
      if (!pdfBytes) return;
      const newBytes = await splitPdf(pdfBytes, startPage, endPage);
      if (newBytes) {
        await loadFromBytes(newBytes);
      }
      setSplitDialogOpen(false);
    },
    [pdfBytes, splitPdf, loadFromBytes]
  );

  const handleMovePage = useCallback(
    async (fromPage: number, toPage: number) => {
      if (!pdfBytes) return;
      const newBytes = await movePage(pdfBytes, fromPage, toPage);
      if (newBytes) {
        await loadFromBytes(newBytes);
      }
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
      await writeFile(outputPath, pdfBytes);
    }
  }, [pdfBytes, fileName]);

  const viewerRef = useRef<HTMLElement>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  // Pinch-to-zoom: trackpad pinch fires wheel events with ctrlKey on both macOS and Windows
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

  // Listen for file-open events from macOS file associations
  useEffect(() => {
    const unlisten = listen<string>("open-file", (event) => {
      openFilePath(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [openFilePath]);

  // Check for a pending file on mount (handles launch via "Open With")
  useEffect(() => {
    invoke<string | null>("get_pending_file").then((filePath) => {
      if (filePath) {
        openFilePath(filePath);
      }
    });
  }, [openFilePath]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

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
    enabled: true,
  });

  return (
    <div className="app">
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
        onToggleTheme={toggleTheme}
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
        onCreateBlankPdf={async () => {
          const newBytes = await createBlankPdf(1);
          if (newBytes) await loadFromBytes(newBytes);
        }}
        onSignPdf={() => setSignatureDialogOpen(true)}
        onMovePage={() => setMovePageDialogOpen(true)}
        onSaveAs={handleSaveAs}
        onPrint={print}
        printing={printing}
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
          onClose={() => { clearSearch(); setSearchOpen(false); }}
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
              onAddHighlight={addHighlight}
              onAddNote={addNote}
              onUpdateNoteText={updateNoteText}
              onAddDrawStroke={addDrawStroke}
              onRemoveAnnotation={removeAnnotation}
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
            addSignature(currentPage, 0.3, 0.7, 0.4, 0.15, dataUrl);
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

export default App;
