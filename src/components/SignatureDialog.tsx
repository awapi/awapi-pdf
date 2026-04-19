import { useRef, useState, useCallback, useEffect } from "react";

interface SignatureDialogProps {
  onApply: (signatureDataUrl: string) => void;
  onClose: () => void;
}

export function SignatureDialog({ onApply, onClose }: SignatureDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = useCallback(
    (e: React.MouseEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getPos(e);
      if (!pos) return;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setIsDrawing(true);
    },
    [getPos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing) return;
      const pos = getPos(e);
      if (!pos) return;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasContent(true);
    },
    [isDrawing, getPos]
  );

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  }, []);

  const handleApply = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;
    const dataUrl = canvas.toDataURL("image/png");
    onApply(dataUrl);
  }, [hasContent, onApply]);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog signature-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">Draw Your Signature</h3>
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="signature-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        <div className="dialog-actions">
          <button
            type="button"
            className="dialog-btn-secondary"
            onClick={handleClear}
          >
            Clear
          </button>
          <button
            type="button"
            className="dialog-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dialog-btn-primary"
            onClick={handleApply}
            disabled={!hasContent}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
