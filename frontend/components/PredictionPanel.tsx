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
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">
          Resultado
        </h2>
        {result && !loading && !error && (
          <span className="text-xs tabular-nums text-slate-500">
            {result.inference_ms} ms
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-5">
          <div className="h-20 w-16 shrink-0 animate-pulse rounded-md bg-slate-200" />
          <div className="w-full flex-1 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-2 w-full animate-pulse rounded-full bg-slate-200"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
      ) : result ? (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="text-center sm:shrink-0">
            <div
              aria-live="polite"
              className="text-[4.5rem] font-bold leading-none text-slate-900 sm:text-[5.5rem]"
            >
              {result.digit}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Confiança {fmtPercent(result.confidence)}
            </p>
          </div>

          <ul className="w-full flex-1 space-y-1">
            {result.probabilities.map(({ digit, p }) => {
              const top = digit === result.digit;
              return (
                <li key={digit} className="flex items-center gap-3">
                  <span
                    className={`w-4 text-right text-xs tabular-nums ${
                      top ? "font-semibold text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {digit}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${
                        top ? "bg-slate-800" : "bg-slate-400"
                      }`}
                      style={{
                        width: `${Math.max(1, p * 100)}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`w-14 text-right text-xs tabular-nums ${
                      top ? "text-slate-900" : "text-slate-500"
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
        <div className="py-6 text-center">
          <p className="text-sm text-slate-500">
            {hasDrawing
              ? "Solte o traço para iniciar a classificação."
              : "Desenhe um dígito no quadro ao lado."}
          </p>
        </div>
      )}
    </section>
  );
}
