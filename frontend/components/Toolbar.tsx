"use client";

import type { DrawingTool } from "@/components/DrawCanvas";

interface ToolbarProps {
  tool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

const PALETTE = [
  "#ffffff",
  "#ffdf5c",
  "#ff9f43",
  "#ff5c8a",
  "#7fd8ff",
  "#9dff8a",
];

const MIN_BRUSH = 4;
const MAX_BRUSH = 40;

export default function Toolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
}: ToolbarProps) {
  const toolButton = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-slate-900 text-white"
        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    }`;
  const actionButton =
    "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={toolButton(tool === "brush")}
          onClick={() => onToolChange("brush")}
        >
          Pincel
        </button>
        <button
          type="button"
          className={toolButton(tool === "eraser")}
          onClick={() => onToolChange("eraser")}
        >
          Borracha
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Usar cor ${c}`}
            onClick={() => onColorChange(c)}
            className={`h-6 w-6 rounded-full border-2 transition-transform ${
              color === c
                ? "scale-110 border-slate-900"
                : "border-slate-300 hover:scale-105"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <span className="whitespace-nowrap">Espessura</span>
        <input
          type="range"
          min={MIN_BRUSH}
          max={MAX_BRUSH}
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          className="h-1.5 w-28 cursor-pointer accent-slate-900"
        />
        <span className="w-6 text-right tabular-nums text-slate-500">
          {brushSize}
        </span>
      </label>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className={actionButton}
          onClick={onUndo}
          disabled={!canUndo}
        >
          Desfazer
        </button>
        <button
          type="button"
          className={actionButton}
          onClick={onRedo}
          disabled={!canRedo}
        >
          Refazer
        </button>
        <button type="button" className={actionButton} onClick={onClear}>
          Limpar
        </button>
      </div>
    </div>
  );
}
