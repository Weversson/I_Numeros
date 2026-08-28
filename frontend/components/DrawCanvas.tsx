"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

const VIEW = 336;
const CELLS = 28;
const MAX_HISTORY = 60;

export type DrawingTool = "brush" | "eraser";

export interface DrawCanvasHandle {
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface DrawCanvasProps {
  tool: DrawingTool;
  color: string;
  brushSize: number;
  onStrokeEnd: (pixels: number[]) => void;
  onClear: () => void;
  onInteraction: (strokes: number, ms: number) => void;
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void;
  hintVisible?: boolean;
  disabled?: boolean;
}

const DrawCanvas = forwardRef<DrawCanvasHandle, DrawCanvasProps>(
  function DrawCanvas(
    {
      tool,
      color,
      brushSize,
      onStrokeEnd,
      onClear,
      onInteraction,
      onHistoryChange,
      hintVisible,
      disabled,
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const drawingRef = useRef(false);
    const lastRef = useRef<Point | null>(null);
    const strokeStartRef = useRef(0);
    const historyRef = useRef<ImageData[]>([]);
    const redoRef = useRef<ImageData[]>([]);
    const disabledRef = useRef(disabled);

    const toolRef = useRef(tool);
    const colorRef = useRef(color);
    const sizeRef = useRef(brushSize);

    useEffect(() => {
      disabledRef.current = disabled;
    }, [disabled]);
    useEffect(() => {
      toolRef.current = tool;
    }, [tool]);
    useEffect(() => {
      colorRef.current = color;
    }, [color]);
    useEffect(() => {
      sizeRef.current = brushSize;
    }, [brushSize]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      canvas.width = VIEW * dpr;
      canvas.height = VIEW * dpr;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, VIEW, VIEW);
      ctxRef.current = ctx;
      return () => {
        ctxRef.current = null;
      };
    }, []);

    const updateFlags = useCallback(() => {
      onHistoryChange(
        historyRef.current.length > 0,
        redoRef.current.length > 0,
      );
    }, [onHistoryChange]);

    const extract = useCallback((): number[] => {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return Array<number>(CELLS * CELLS).fill(0);
      const { width, height } = canvas;
      const data = ctx.getImageData(0, 0, width, height).data;
      const block = width / CELLS;
      const out: number[] = [];
      for (let cy = 0; cy < CELLS; cy++) {
        for (let cx = 0; cx < CELLS; cx++) {
          let sum = 0;
          let count = 0;
          const x0 = Math.floor(cx * block);
          const y0 = Math.floor(cy * block);
          const x1 = Math.floor((cx + 1) * block);
          const y1 = Math.floor((cy + 1) * block);
          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
              const idx = (y * width + x) * 4;
              const luminance =
                0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              sum += luminance;
              count++;
            }
          }
          out.push(Math.min(1, sum / count / 255));
        }
      }
      return out;
    }, []);

    const snapshot = useCallback(() => {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;
      historyRef.current.push(
        ctx.getImageData(0, 0, canvas.width, canvas.height),
      );
      if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
      redoRef.current = [];
      updateFlags();
    }, [updateFlags]);

    const toLocal = (e: ReactPointerEvent<HTMLCanvasElement>): Point => {
      const rect = e.currentTarget.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * VIEW,
        y: ((e.clientY - rect.top) / rect.height) * VIEW,
      };
    };

    const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (disabledRef.current) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      snapshot();
      const ctx = ctxRef.current;
      if (!ctx) return;
      strokeStartRef.current = performance.now();
      const p = toLocal(e);
      drawingRef.current = true;
      lastRef.current = p;
      ctx.strokeStyle = toolRef.current === "eraser" ? "#000000" : colorRef.current;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = sizeRef.current;
      ctx.beginPath();
      ctx.arc(p.x, p.y, sizeRef.current / 2, 0, Math.PI * 2);
      ctx.fill();
    };

    const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const ctx = ctxRef.current;
      const last = lastRef.current;
      if (!ctx || !last) return;
      e.preventDefault();
      const p = toLocal(e);
      ctx.strokeStyle = toolRef.current === "eraser" ? "#000000" : colorRef.current;
      ctx.lineWidth = sizeRef.current;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastRef.current = p;
    };

    const finishStroke = () => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      const elapsed = Math.round(performance.now() - strokeStartRef.current);
      lastRef.current = null;
      onInteraction(1, elapsed);
      onStrokeEnd(extract());
    };

    const handleUndo = useCallback(() => {
      const ctx = ctxRef.current;
      const snap = historyRef.current.pop();
      if (!ctx || !snap) return;
      const cur = ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      redoRef.current.push(cur);
      ctx.putImageData(snap, 0, 0);
      updateFlags();
      onStrokeEnd(extract());
    }, [updateFlags, onStrokeEnd, extract]);

    const handleRedo = useCallback(() => {
      const ctx = ctxRef.current;
      const snap = redoRef.current.pop();
      if (!ctx || !snap) return;
      const cur = ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      historyRef.current.push(cur);
      ctx.putImageData(snap, 0, 0);
      updateFlags();
      onStrokeEnd(extract());
    }, [updateFlags, onStrokeEnd, extract]);

    const handleClear = useCallback(() => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      snapshot();
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, VIEW, VIEW);
      onInteraction(-1, 0);
      onClear();
      onStrokeEnd(extract());
    }, [snapshot, onInteraction, onClear, onStrokeEnd, extract]);

    useImperativeHandle(
      ref,
      () => ({
        undo: handleUndo,
        redo: handleRedo,
        clear: handleClear,
      }),
      [handleUndo, handleRedo, handleClear],
    );

    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-slate-300 bg-black">
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-crosshair touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          aria-label="Área de desenho do dígito"
        />
        {hintVisible && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="select-none text-sm text-slate-600">
              Desenhe o dígito
            </span>
          </div>
        )}
      </div>
    );
  },
);

export default DrawCanvas;
