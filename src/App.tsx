import { useState, useCallback, useRef, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { TabBar } from "./components/TabBar";
import type { TabInfo } from "./components/TabBar";
import { PdfTabContent } from "./components/PdfTabContent";
import { useUpdateCheck } from "./hooks/useUpdateCheck";
import "./App.css";

interface TabData extends TabInfo {
  pendingFilePath: string | null;
  currentFilePath: string | null;
}

let tabCounter = 0;
function newTabId() {
  return `tab-${++tabCounter}`;
}

function App() {
  const [tabs, setTabs] = useState<TabData[]>(() => {
    const id = newTabId();
    return [{ id, title: "New Tab", pendingFilePath: null, currentFilePath: null }];
  });
  const [activeTabId, setActiveTabId] = useState(() => tabs[0].id);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const { checkForUpdates } = useUpdateCheck();
  const checkForUpdatesRef = useRef(checkForUpdates);
  checkForUpdatesRef.current = checkForUpdates;

  // Listen for native menu “Check for Updates” click.
  useEffect(() => {
    const unlisten = listen("menu-check-for-updates", () => {
      checkForUpdatesRef.current();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Refs so event-listener callbacks always see current values without
  // being recreated (which would re-attach listeners).
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);

  const handleNewTab = useCallback(() => {
    const id = newTabId();
    setTabs((prev) => [...prev, { id, title: "New Tab", pendingFilePath: null, currentFilePath: null }]);
    setActiveTabId(id);
  }, []);

  const handleTabClose = useCallback((id: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev; // always keep at least one tab
      const next = prev.filter((t) => t.id !== id);
      if (activeTabIdRef.current === id) {
        const idx = prev.findIndex((t) => t.id === id);
        setActiveTabId(next[Math.min(idx, next.length - 1)].id);
      }
      return next;
    });
  }, []);

  const handleTabSelect = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  // Called by each PdfTabContent when its open file path changes.
  const handleFilePathChange = useCallback((tabId: string, filePath: string | null) => {
    setTabs((prev) => {
      const tab = prev.find((t) => t.id === tabId);
      if (!tab || tab.currentFilePath === filePath) return prev;
      return prev.map((t) => (t.id === tabId ? { ...t, currentFilePath: filePath } : t));
    });
  }, []);

  // Called by each PdfTabContent when its displayed file name changes.
  const handleTitleChange = useCallback((tabId: string, title: string | null) => {
    setTabs((prev) => {
      const tab = prev.find((t) => t.id === tabId);
      const newTitle = title ?? "New Tab";
      if (!tab || tab.title === newTitle) return prev; // bail out — no change
      return prev.map((t) => (t.id === tabId ? { ...t, title: newTitle } : t));
    });
  }, []);

  // Called once a PdfTabContent has consumed its pendingFilePath.
  const handlePendingFileConsumed = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, pendingFilePath: null } : t))
    );
  }, []);

  // Route an externally-triggered file open to the correct tab:
  // - If the file is already open in an existing tab, activate that tab.
  // - If the active tab is empty (title "New Tab"), open in it.
  // - Otherwise, open in a brand-new tab.
  const openFileExternal = useCallback((filePath: string) => {
    const currentActiveId = activeTabIdRef.current;
    const currentTabs = tabsRef.current;

    // Check if any tab already has this file open.
    const existingTab = currentTabs.find((t) => t.currentFilePath === filePath);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    const activeTab = currentTabs.find((t) => t.id === currentActiveId);

    if (activeTab && activeTab.title === "New Tab") {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === currentActiveId ? { ...t, pendingFilePath: filePath } : t
        )
      );
    } else {
      const id = newTabId();
      setTabs((prev) => [
        ...prev,
        { id, title: "New Tab", pendingFilePath: filePath, currentFilePath: null },
      ]);
      setActiveTabId(id);
    }
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+T → new tab.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "t") {
        e.preventDefault();
        handleNewTab();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNewTab]);

  // Listen for OS file-open events (macOS "Open With" / file associations).
  // get_pending_file is called AFTER the listener is registered to close the
  // race window where RunEvent::Opened fires before mount.
  useEffect(() => {
    let active = true;
    const unlistenPromise = listen<string>("open-file", (event) => {
      openFileExternal(event.payload);
    }).then((unlisten) => {
      if (active) {
        invoke<string | null>("get_pending_file").then((filePath) => {
          if (filePath) openFileExternal(filePath);
        });
      }
      return unlisten;
    });
    return () => {
      active = false;
      unlistenPromise.then((fn) => fn());
    };
  }, [openFileExternal]);

  // Listen for OS-level drag-and-drop (Tauri v2 intercepts before browser events).
  useEffect(() => {
    const unlisten = listen<{ paths: string[] }>("tauri://drag-drop", (event) => {
      const path = event.payload.paths?.[0];
      if (path) openFileExternal(path);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [openFileExternal]);

  return (
    <div className="app">
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={handleTabSelect}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
      />
      {tabs.map((tab) => (
        <PdfTabContent
          key={tab.id}
          active={tab.id === activeTabId}
          theme={theme}
          onToggleTheme={toggleTheme}
          onTitleChange={(title) => handleTitleChange(tab.id, title)}
          onFilePathChange={(filePath) => handleFilePathChange(tab.id, filePath)}
          pendingFilePath={tab.pendingFilePath}
          onPendingFileConsumed={() => handlePendingFileConsumed(tab.id)}
        />
      ))}
    </div>
  );
}

export default App;
