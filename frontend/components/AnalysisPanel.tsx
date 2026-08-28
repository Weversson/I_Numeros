"use client";

import type { StrokeMetrics } from "@/lib/analysis";

interface AnalysisPanelProps {
  metrics: StrokeMetrics | null;
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function fmtPercent(v: number): string {
  return `${Math.round(v * 100)}%`;
}

export default function AnalysisPanel({ metrics }: AnalysisPanelProps) {
  const items = metrics
    ? [
        { label: "Traços de tinta", value: String(metrics.strokes) },
        {
          label: "Movimentos",
          value: String(metrics.userStrokes),
        },
        { label: "Tempo de desenho", value: fmtMs(metrics.drawingMs) },
        {
          label: "Densidade",
          value: fmtPercent(metrics.density),
          hint: `${Math.round(metrics.density * 784)} células`,
        },
        {
          label: "Cobertura",
          value: fmtPercent(metrics.coverage),
          hint: `${metrics.width}×${metrics.height}`,
        },
        {
          label: "Centro de massa",
          value: `(${metrics.centerX.toFixed(2)}, ${metrics.centerY.toFixed(2)})`,
        },
        {
          label: "Largura",
          value: `${metrics.width} px`,
        },
        {
          label: "Altura",
          value: `${metrics.height} px`,
        },
        {
          label: "Proporção",
          value: metrics.aspectRatio.toFixed(2),
          hint: "altura / largura",
        },
      ]
    : [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-500">
        Análise do traço
      </h2>
      {metrics ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {items.map((it) => (
            <div key={it.label}>
              <dt className="text-xs text-slate-500">{it.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                {it.value}
                {it.hint && (
                  <span className="ml-1.5 text-xs font-normal text-slate-400">
                    {it.hint}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-slate-500">
          As métricas aparecem ao desenhar um dígito.
        </p>
      )}
    </section>
  );
}
