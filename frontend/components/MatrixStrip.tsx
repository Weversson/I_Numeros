"use client";

import { useMemo } from "react";
import MatrixPreview from "@/components/MatrixPreview";

interface MatrixStripProps {
  drawn: number[] | null;
  processed: number[] | null;
  bits: number[] | null;
}

export default function MatrixStrip({ drawn, processed, bits }: MatrixStripProps) {
  const drawnBits = useMemo(
    () => (drawn ? drawn.map((v) => (v > 0.12 ? 1 : 0)) : null),
    [drawn],
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/40 backdrop-blur">
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-400">
        Matriz de bits 28×28
      </h2>
      <div className="flex flex-wrap items-start justify-around gap-x-4 gap-y-6">
        <MatrixPreview label="1 · Desenho digitalizado" data={drawn} />
        <MatrixPreview label="2 · Bits (limiarização)" data={drawnBits} />
        <MatrixPreview label="3 · Entrada da rede" data={processed ?? bits ?? null} active />
      </div>
      <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-500">
        O desenho é reduzido para 28×28, binarizado, recortado, redimensionado
        para 20×20 e centralizado pelo centro de massa — o mesmo padrão do MNIST.
      </p>
    </div>
  );
}
