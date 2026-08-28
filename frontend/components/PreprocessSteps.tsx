"use client";

import { useMemo } from "react";
import MatrixPreview from "@/components/MatrixPreview";
import { buildPreprocessSteps } from "@/lib/analysis";

interface PreprocessStepsProps {
  matrix: number[] | null;
}

export default function PreprocessSteps({ matrix }: PreprocessStepsProps) {
  const steps = useMemo(
    () => (matrix ? buildPreprocessSteps(matrix) : []),
    [matrix],
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-500">
        Etapas do pré-processamento
      </h2>
      {steps.length > 0 ? (
        <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-5 sm:justify-start">
          {steps.map((step) => (
            <div key={step.id} className="flex flex-col items-center gap-1.5">
              <MatrixPreview label={step.label} data={step.pixels} />
              <span className="text-xs text-slate-500">
                {step.description}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          As etapas aparecem ao desenhar um dígito.
        </p>
      )}
    </section>
  );
}
