import { useState, useCallback, useRef, useEffect } from "react";
import type { SearchResult } from "../hooks/useSearch";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  onNext: () => void;
  onPrev: () => void;
  onGoToResult: (page: number) => void;
  results: SearchResult[];
  currentResultIndex: number;
  searching: boolean;
  visible: boolean;
  onClose: () => void;
}

export function SearchBar({
  onSearch,
  onClear,
  onNext,
  onPrev,
  onGoToResult,
  results,
  currentResultIndex,
  searching,
  visible,
  onClose,
}: SearchBarProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      inputRef.current?.focus();
    }
  }, [visible]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearch(input);
    },
    [input, onSearch]
  );

  const handleClose = useCallback(() => {
    setInput("");
    onClear();
    onClose();
  }, [onClear, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "Enter" && results.length > 0) {
        if (e.shiftKey) {
          onPrev();
        } else {
          onNext();
        }
      }
    },
    [handleClose, results.length, onNext, onPrev]
  );

  // Navigate to current result's page whenever it changes
  useEffect(() => {
    if (currentResultIndex >= 0 && currentResultIndex < results.length) {
      onGoToResult(results[currentResultIndex].page);
    }
  }, [currentResultIndex, results, onGoToResult]);

  if (!visible) return null;

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit} className="search-form">
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search in document…"
        />
        <button type="submit" className="toolbar-btn" title="Search" disabled={!input.trim()}>
          🔍
        </button>
      </form>
      {results.length > 0 && (
        <div className="search-nav">
          <button className="toolbar-btn" onClick={onPrev} title="Previous result">
            ▲
          </button>
          <span className="search-count">
            {currentResultIndex + 1} / {results.length}
          </span>
          <button className="toolbar-btn" onClick={onNext} title="Next result">
            ▼
          </button>
        </div>
      )}
      {searching && <span className="search-count">Searching…</span>}
      {!searching && results.length === 0 && input.trim() && (
        <span className="search-count">No results</span>
      )}
      <button className="toolbar-btn" onClick={handleClose} title="Close search">
        ✕
      </button>
    </div>
  );
}
