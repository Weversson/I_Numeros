import type { PredictionResult } from "@/lib/api";
import { fmtPercent } from "@/lib/format";

interface PredictionPanelProps {
  result: PredictionResult | null;
  loading: boolean;
  error: string | null;
  hasDrawing: boolean;
}

export default function PredictionPanel({
  result,
  loading,
  error,
  hasDrawing,
}: PredictionPanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Resultado
        </h2>
        {result && !loading && !error && (
          <span
            key={`conf-${result.digit}-${result.confidence}`}
            className="animate-pop rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
          >
            {fmtPercent(result.confidence)} de confiança
          </span>
        )}
        {result && !loading && !error && (
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs tabular-nums text-slate-400">
            {result.inference_ms} ms
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="animate-fade-up mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm leading-relaxed text-rose-300"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div>
          <div className="flex items-center gap-6">
            <div className="h-24 w-20 shrink-0 animate-pulse rounded-xl bg-white/10" />
            <div className="w-full flex-1 space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-2.5 w-full animate-pulse rounded-full bg-white/5"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </div>
          <p className="mt-5 text-xs text-slate-500">
            Consultando a rede neural...
          </p>
        </div>
      ) : result ? (
        <div
          key={`${result.digit}-${result.confidence}-${result.inference_ms}`}
          className="animate-pop flex flex-col items-center gap-6 sm:flex-row"
        >
          <div
            aria-live="polite"
            className="bg-gradient-to-br from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-[6rem] font-black leading-none text-transparent sm:text-[8rem]"
          >
            {result.digit}
          </div>
          <ul className="w-full flex-1 space-y-1.5">
            {result.probabilities.map(({ digit, p }) => {
              const top = digit === result.digit;
              return (
                <li key={digit} className="flex items-center gap-3">
                  <span
                    className={`w-4 text-right text-xs tabular-nums ${
                      top ? "font-bold text-violet-300" : "text-slate-500"
                    }`}
                  >
                    {digit}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${
                        top
                          ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                          : "bg-slate-600/70"
                      }`}
                      style={{
                        width: `${Math.max(2, p * 100)}%`,
                        transition:
                          "width 600ms cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    />
                  </div>
                  <span
                    className={`w-14 text-right text-xs tabular-nums ${
                      top ? "font-semibold text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {fmtPercent(p)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-slate-700 text-4xl font-bold text-slate-600">
            ?
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-slate-400">
            {hasDrawing
              ? "Solte o traço para reconhecer o número"
              : "Desenhe um número no quadro ao lado e eu digo qual é"}
          </p>
        </div>
      )}
    </div>
  );
}
