import { useCallback } from "react";

export interface TabInfo {
  id: string;
  title: string;
}

interface TabBarProps {
  tabs: TabInfo[];
  activeTabId: string;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
}: TabBarProps) {
  const handleClose = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onTabClose(id);
    },
    [onTabClose]
  );

  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab-item${tab.id === activeTabId ? " tab-item-active" : ""}`}
          onClick={() => onTabSelect(tab.id)}
          title={tab.title}
        >
          <span className="tab-title">{tab.title}</span>
          {tabs.length > 1 && (
            <button
              className="tab-close-btn"
              onClick={(e) => handleClose(e, tab.id)}
              title="Close tab"
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button className="tab-new-btn" onClick={onNewTab} title="New tab (Cmd+T)">
        +
      </button>
    </div>
  );
}
