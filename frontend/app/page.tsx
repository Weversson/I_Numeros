"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DrawCanvas, { type DrawCanvasHandle, type DrawingTool } from "@/components/DrawCanvas";
import Toolbar from "@/components/Toolbar";
import MatrixStrip from "@/components/MatrixStrip";
import PredictionPanel from "@/components/PredictionPanel";
import AnalysisPanel from "@/components/AnalysisPanel";
import PreprocessSteps from "@/components/PreprocessSteps";
import HistoryPanel, { type HistoryEntry } from "@/components/HistoryPanel";
import { checkHealth, predictDigit, type PredictionResult } from "@/lib/api";
import { analyzeDrawing } from "@/lib/analysis";

const EMPTY = Array<number>(784).fill(0);
const POLL_MS = 15000;

export default function Home() {
  const canvasRef = useRef<DrawCanvasHandle>(null);

  const [matrix, setMatrix] = useState<number[]>(EMPTY);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);

  const [tool, setTool] = useState<DrawingTool>("brush");
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(20);

  const [userStrokes, setUserStrokes] = useState(0);
  const [drawingMs, setDrawingMs] = useState(0);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const historyId = useRef(0);

  const hasInk = useMemo(() => matrix.some((v) => v > 0), [matrix]);
  const metrics = useMemo(
    () => analyzeDrawing(matrix, { userStrokes, drawingMs }),
    [matrix, userStrokes, drawingMs],
  );

  useEffect(() => {
    let alive = true;
    const ping = async () => {
      const ok = await checkHealth();
      if (alive) setOnline(ok);
    };
    void ping();
    const timer = setInterval(ping, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const resetResults = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const handleStrokeEnd = useCallback(
    async (pixels: number[]) => {
      setMatrix(pixels);
      if (!pixels.some((v) => v > 0)) {
        resetResults();
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await predictDigit(pixels);
        setResult(res);
        setHistory((prev) => [
          ...prev,
          { id: ++historyId.current, matrix: pixels, result: res, at: Date.now() },
        ]);
      } catch (e) {
        setResult(null);
        setError(e instanceof Error ? e.message : "Erro inesperado.");
      } finally {
        setLoading(false);
      }
    },
    [resetResults],
  );

  const handleInteraction = useCallback((strokes: number, ms: number) => {
    if (strokes === -1) {
      setUserStrokes(0);
      setDrawingMs(0);
      return;
    }
    setUserStrokes((s) => s + strokes);
    setDrawingMs((d) => d + ms);
  }, []);

  const handleHistoryChange = useCallback((u: boolean, r: boolean) => {
    setCanUndo(u);
    setCanRedo(r);
  }, []);

  const handleClear = useCallback(() => {
    canvasRef.current?.clear();
    setUserStrokes(0);
    setDrawingMs(0);
    resetResults();
  }, [resetResults]);

  const handleUndo = useCallback(() => canvasRef.current?.undo(), []);
  const handleRedo = useCallback(() => canvasRef.current?.redo(), []);

  const handleClearHistory = useCallback(() => setHistory([]), []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8 sm:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Board de desenho e análise
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Desenhe um dígito com as ferramentas disponíveis e acompanhe a
            predição, as métricas do traço e as etapas de processamento.
          </p>
        </div>
        <StatusPill online={online} />
      </header>

      <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,21rem)_1fr]">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-3 lg:sticky lg:top-6 lg:mx-0 lg:max-w-none">
          <Toolbar
            tool={tool}
            onToolChange={setTool}
            color={color}
            onColorChange={setColor}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClear={handleClear}
          />
          <DrawCanvas
            ref={canvasRef}
            tool={tool}
            color={color}
            brushSize={brushSize}
            onStrokeEnd={handleStrokeEnd}
            onClear={resetResults}
            onInteraction={handleInteraction}
            onHistoryChange={handleHistoryChange}
            hintVisible={!hasInk}
            disabled={loading}
          />
          <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
            O reconhecimento é disparado ao soltar o traço.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <PredictionPanel
            result={result}
            loading={loading}
            error={error}
            hasDrawing={hasInk}
          />
          <AnalysisPanel metrics={metrics} />
          <MatrixStrip
            drawn={hasInk ? matrix : null}
            processed={result?.processed ?? null}
            bits={result?.bits ?? null}
          />
          <PreprocessSteps matrix={hasInk ? matrix : null} />
          <HistoryPanel entries={history} onClear={handleClearHistory} />
        </div>
      </section>
    </main>
  );
}

function StatusPill({ online }: { online: boolean | null }) {
  const label =
    online === null
      ? "Conectando"
      : online
        ? "API online"
        : "API indisponível";
  const dot =
    online === null
      ? "bg-slate-400"
      : online
        ? "bg-emerald-500"
        : "bg-rose-500";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  );
}
