import { useState, useCallback } from "react";

interface SplitDialogProps {
  totalPages: number;
  onSplit: (startPage: number, endPage: number) => void;
  onClose: () => void;
}

export function SplitDialog({ totalPages, onSplit, onClose }: SplitDialogProps) {
  const [start, setStart] = useState("1");
  const [end, setEnd] = useState(String(totalPages));

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const s = parseInt(start, 10);
      const en = parseInt(end, 10);
      if (s >= 1 && en <= totalPages && s <= en) {
        onSplit(s, en);
      }
    },
    [start, end, totalPages, onSplit]
  );

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">Extract Pages</h3>
        <form onSubmit={handleSubmit} className="dialog-form">
          <div className="dialog-row">
            <label className="dialog-label">From page</label>
            <input
              className="dialog-input"
              type="number"
              min={1}
              max={totalPages}
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="dialog-row">
            <label className="dialog-label">To page</label>
            <input
              className="dialog-input"
              type="number"
              min={1}
              max={totalPages}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <p className="dialog-hint">
            Total pages in document: {totalPages}
          </p>
          <div className="dialog-actions">
            <button type="button" className="dialog-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dialog-btn-primary">
              Extract
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
