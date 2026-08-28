"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DrawCanvas from "@/components/DrawCanvas";
import MatrixStrip from "@/components/MatrixStrip";
import PredictionPanel from "@/components/PredictionPanel";
import { checkHealth, predictDigit, type PredictionResult } from "@/lib/api";

const EMPTY = Array<number>(784).fill(0);

export default function Home() {
  const [matrix, setMatrix] = useState<number[]>(EMPTY);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);

  const hasInk = useMemo(() => matrix.some((v) => v > 0), [matrix]);

  useEffect(() => {
    let alive = true;
    const ping = async () => {
      const ok = await checkHealth();
      if (alive) setOnline(ok);
    };
    void ping();
    const timer = setInterval(ping, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const handleChange = useCallback((pixels: number[]) => {
    setMatrix(pixels);
  }, []);

  const handleStrokeEnd = useCallback(async (pixels: number[]) => {
    setMatrix(pixels);
    if (!pixels.some((v) => v > 0)) {
      setResult(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await predictDigit(pixels));
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="animate-drift absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="animate-drift absolute -bottom-40 right-1/4 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/10 blur-3xl [animation-delay:-8s]" />
      </div>

      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Reconhecedor de{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Números
            </span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Desenhe um dígito de 0 a 9. Assim que você terminar o traço, o
            desenho é convertido em uma matriz de bits 28×28 e classificado por
            uma rede neural treinada com MNIST.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            online === null
              ? "border-slate-700 bg-slate-800/60 text-slate-400"
              : online
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              online === null
                ? "bg-slate-500"
                : online
                  ? "animate-pulse bg-emerald-400"
                  : "bg-rose-400"
            }`}
          />
          {online === null ? "Verificando API..." : online ? "API conectada" : "API offline"}
        </span>
      </header>

      <div className="grid flex-1 items-start gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <section aria-label="Quadro de desenho">
          <DrawCanvas
            onStrokeEnd={handleStrokeEnd}
            onChange={handleChange}
            onClear={handleClear}
            hintVisible={!hasInk}
            disabled={loading}
          />
        </section>

        <section aria-label="Reconhecimento" className="flex flex-col gap-6">
          <PredictionPanel
            result={result}
            loading={loading}
            error={error}
            hasDrawing={hasInk}
          />
          <MatrixStrip
            drawn={hasInk ? matrix : null}
            processed={result?.processed ?? null}
            bits={result?.bits ?? null}
          />
        </section>
      </div>

      <footer className="pb-2 text-center text-xs text-slate-500">
        FastAPI · scikit-learn MLP (784-400-200-10) · MNIST · Next.js
      </footer>
    </main>
  );
}
