export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Probability {
  digit: number;
  p: number;
}

export interface PredictionResult {
  digit: number;
  confidence: number;
  probabilities: Probability[];
  processed: number[];
  bits: number[];
  inference_ms: number;
}

export async function predictDigit(
  pixels: number[],
): Promise<PredictionResult> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pixels }),
    });
  } catch {
    throw new Error(
      "Não foi possível conectar à API. Verifique se o servidor Python está rodando na porta 8000.",
    );
  }
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      /* corpo sem detalhes */
    }
    throw new Error(message);
  }
  return res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
