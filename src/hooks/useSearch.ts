import { useState, useCallback, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

export interface SearchResult {
  page: number;
  text: string;
}

export function useSearch(pdfDocument: PDFDocumentProxy | null) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const cancelRef = useRef(false);

  const search = useCallback(
    async (searchQuery: string) => {
      setQuery(searchQuery);

      if (!pdfDocument || !searchQuery.trim()) {
        setResults([]);
        setCurrentResultIndex(-1);
        return;
      }

      cancelRef.current = false;
      setSearching(true);
      const found: SearchResult[] = [];
      const lowerQuery = searchQuery.toLowerCase();

      for (let i = 1; i <= pdfDocument.numPages; i++) {
        if (cancelRef.current) break;
        const page = await pdfDocument.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");

        if (pageText.toLowerCase().includes(lowerQuery)) {
          // Extract a snippet around the first match
          const idx = pageText.toLowerCase().indexOf(lowerQuery);
          const start = Math.max(0, idx - 30);
          const end = Math.min(pageText.length, idx + searchQuery.length + 30);
          const snippet =
            (start > 0 ? "…" : "") +
            pageText.slice(start, end) +
            (end < pageText.length ? "…" : "");
          found.push({ page: i, text: snippet });
        }
      }

      if (!cancelRef.current) {
        setResults(found);
        setCurrentResultIndex(found.length > 0 ? 0 : -1);
      }
      setSearching(false);
    },
    [pdfDocument]
  );

  const clearSearch = useCallback(() => {
    cancelRef.current = true;
    setQuery("");
    setResults([]);
    setCurrentResultIndex(-1);
    setSearching(false);
  }, []);

  const nextResult = useCallback(() => {
    setCurrentResultIndex((prev) =>
      results.length === 0 ? -1 : (prev + 1) % results.length
    );
  }, [results.length]);

  const prevResult = useCallback(() => {
    setCurrentResultIndex((prev) =>
      results.length === 0
        ? -1
        : (prev - 1 + results.length) % results.length
    );
  }, [results.length]);

  return {
    query,
    results,
    searching,
    currentResultIndex,
    search,
    clearSearch,
    nextResult,
    prevResult,
  };
}
