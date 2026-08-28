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
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-500">
        Representação em matriz 28×28
      </h2>
      <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-6 sm:justify-around">
        <MatrixPreview label="Desenho digitalizado" data={drawn} />
        <MatrixPreview label="Limiarização" data={drawnBits} />
        <MatrixPreview
          label="Entrada da rede"
          data={processed ?? bits ?? null}
          active
        />
      </div>
      <p className="mt-5 text-xs leading-relaxed text-slate-500">
        O desenho é convertido em 28×28, binarizado, recortado na região de
        tinta, redimensionado para 20×20 e centralizado pelo centro de massa,
        seguindo o mesmo critério de normalização usado no conjunto MNIST.
      </p>
    </section>
  );
}
