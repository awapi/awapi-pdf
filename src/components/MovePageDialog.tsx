import { useState, useCallback } from "react";

interface MovePageDialogProps {
  totalPages: number;
  currentPage: number;
  onMove: (fromPage: number, toPage: number) => void;
  onClose: () => void;
}

export function MovePageDialog({
  totalPages,
  currentPage,
  onMove,
  onClose,
}: MovePageDialogProps) {
  const [from, setFrom] = useState(String(currentPage));
  const [to, setTo] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const f = parseInt(from, 10);
      const t = parseInt(to, 10);
      if (f >= 1 && f <= totalPages && t >= 1 && t <= totalPages && f !== t) {
        onMove(f, t);
      }
    },
    [from, to, totalPages, onMove]
  );

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">Move Page</h3>
        <form onSubmit={handleSubmit} className="dialog-form">
          <div className="dialog-row">
            <label className="dialog-label">Move page</label>
            <input
              className="dialog-input"
              type="number"
              min={1}
              max={totalPages}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="dialog-row">
            <label className="dialog-label">To position</label>
            <input
              className="dialog-input"
              type="number"
              min={1}
              max={totalPages}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              autoFocus
            />
          </div>
          <p className="dialog-hint">
            Total pages: {totalPages}
          </p>
          <div className="dialog-actions">
            <button type="button" className="dialog-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dialog-btn-primary">
              Move
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
