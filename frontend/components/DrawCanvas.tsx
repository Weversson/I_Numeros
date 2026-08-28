"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

const VIEW = 336;
const CELLS = 28;
const BRUSH = 20;
const MAX_HISTORY = 40;

interface Point {
  x: number;
  y: number;
}

interface DrawCanvasProps {
  onStrokeEnd: (pixels: number[]) => void;
  onChange: (pixels: number[]) => void;
  onClear: () => void;
  hintVisible?: boolean;
  disabled?: boolean;
}

export default function DrawCanvas({
  onStrokeEnd,
  onChange,
  onClear,
  hintVisible,
  disabled,
}: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<Point | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const disabledRef = useRef(disabled);
  const [historyLen, setHistoryLen] = useState(0);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

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
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = BRUSH;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, VIEW, VIEW);
    ctxRef.current = ctx;
    return () => {
      ctxRef.current = null;
    };
  }, []);

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
            sum += data[(y * width + x) * 4];
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
    setHistoryLen(historyRef.current.length);
  }, []);

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
    const p = toLocal(e);
    drawingRef.current = true;
    ctx.beginPath();
    ctx.arc(p.x, p.y, BRUSH / 2, 0, Math.PI * 2);
    ctx.fill();
    lastRef.current = p;
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = ctxRef.current;
    const last = lastRef.current;
    if (!ctx || !last) return;
    e.preventDefault();
    const p = toLocal(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  };

  const finishStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastRef.current = null;
    const px = extract();
    onChange(px);
    onStrokeEnd(px);
  };

  const handleClear = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    snapshot();
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, VIEW, VIEW);
    onChange(Array<number>(CELLS * CELLS).fill(0));
    onClear();
  };

  const handleUndo = () => {
    const ctx = ctxRef.current;
    const snap = historyRef.current.pop();
    setHistoryLen(historyRef.current.length);
    if (!ctx || !snap) return;
    ctx.putImageData(snap, 0, 0);
    onChange(extract());
  };

  const buttonClass =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10 active:scale-95 disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/10">
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-crosshair touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          aria-label="Área de desenho do número"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.07) 1px, transparent 1px)",
            backgroundSize: `${100 / CELLS}% ${100 / CELLS}%`,
          }}
        />
        {hintVisible && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="select-none text-sm font-medium tracking-wide text-slate-600">
              Desenhe um número aqui
            </span>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleUndo}
          className={buttonClass}
          disabled={historyLen === 0 || disabled}
        >
          Desfazer
        </button>
        <button
          type="button"
          onClick={handleClear}
          className={buttonClass}
          disabled={disabled}
        >
          Limpar
        </button>
        <span className="ml-auto hidden text-[11px] text-slate-500 sm:block">
          solte o traço para reconhecer
        </span>
      </div>
    </div>
  );
}
