"use client";

import MatrixPreview from "@/components/MatrixPreview";
import type { PredictionResult } from "@/lib/api";
import { fmtPercent } from "@/lib/format";

export interface HistoryEntry {
  id: number;
  matrix: number[];
  result: PredictionResult;
  at: number;
}

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onClear: () => void;
}

export default function HistoryPanel({ entries, onClear }: HistoryPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">
          Histórico
        </h2>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          >
            Limpar histórico
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">
          Os dígitos reconhecidos ficam registrados aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2"
            >
              <MatrixPreview label="Desenho" data={entry.matrix} />
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold leading-none text-slate-900">
                    {entry.result.digit}
                  </span>
                  <span className="text-xs tabular-nums text-slate-500">
                    {fmtPercent(entry.result.confidence)} de confiança
                  </span>
                </div>
              </div>
              <span className="text-xs tabular-nums text-slate-400">
                {entry.result.inference_ms} ms
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
