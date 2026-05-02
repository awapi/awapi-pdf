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
    // Keep the canvas transparent so the saved PNG only contains the
    // opaque strokes. This composites cleanly over any PDF background.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Re-apply stroke style after clear (some browsers reset state).
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setHasContent(false);
  }, []);

  const handleApply = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;

    // Export to PNG. The drawing canvas is transparent except for the strokes,
    // so the resulting PNG has a soft (alpha) mask. Some PDF renderers
    // (notably certain pdf.js configurations) ignore or mis-composite the
    // mask, which causes the transparent region to appear as a solid black
    // box because cleared canvas pixels default to RGB=(0,0,0).
    //
    // To make rendering consistent across viewers (Preview, Adobe, pdf.js),
    // copy the canvas to a temporary one and force the RGB of every
    // transparent pixel to white. The alpha channel is preserved, so viewers
    // that honor the mask still get a transparent background, but viewers
    // that drop the mask now see white (invisible on a white page) instead
    // of black.
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const outCtx = out.getContext("2d");
    if (!outCtx) {
      onApply(canvas.toDataURL("image/png"));
      return;
    }
    outCtx.drawImage(canvas, 0, 0);
    const img = outCtx.getImageData(0, 0, out.width, out.height);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      // If the pixel is fully transparent, normalise its RGB to white so
      // viewers that ignore the alpha channel render it as white instead of
      // black.
      if (data[i + 3] === 0) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    }
    outCtx.putImageData(img, 0, 0);
    const dataUrl = out.toDataURL("image/png");
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
