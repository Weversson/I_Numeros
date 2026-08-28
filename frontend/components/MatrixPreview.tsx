"use client";

import { useEffect, useRef } from "react";

const BUFFER_SCALE = 4;
const DISPLAY = 84;

interface MatrixPreviewProps {
  label: string;
  data: number[] | null;
  active?: boolean;
}

export default function MatrixPreview({
  label,
  data,
  active,
}: MatrixPreviewProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const size = 28 * BUFFER_SCALE;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#05070d";
    ctx.fillRect(0, 0, size, size);
    if (!data || data.length !== 28 * 28) return;
    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        const v = Math.min(1, Math.max(0, data[y * 28 + x]));
        if (v <= 0.02) continue;
        const c = Math.round(v * 255);
        ctx.fillStyle = `rgb(${c},${c},${c})`;
        ctx.fillRect(x * BUFFER_SCALE, y * BUFFER_SCALE, BUFFER_SCALE, BUFFER_SCALE);
      }
    }
  }, [data]);

  return (
    <figure className="flex flex-col items-center gap-2">
      <div
        className={`overflow-hidden rounded-md border ${
          active ? "border-slate-400" : "border-slate-300"
        } bg-black p-1`}
      >
        <canvas
          ref={ref}
          style={{ width: DISPLAY, height: DISPLAY }}
          className="block [image-rendering:pixelated]"
          aria-label={label}
        />
      </div>
      <figcaption className="text-xs font-medium text-slate-600">
        {label}
      </figcaption>
    </figure>
  );
}
