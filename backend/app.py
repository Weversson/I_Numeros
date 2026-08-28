import json
import os

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from preprocess import preprocess_matrix

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "digit_mlp.joblib")
META_PATH = os.path.join(BASE_DIR, "model", "meta.json")

model = None
meta = {}


def load_model():
    global model, meta
    if model is None:
        model = joblib.load(MODEL_PATH)
        if os.path.exists(META_PATH):
            with open(META_PATH, encoding="utf-8") as f:
                meta = json.load(f)
    return model


app = FastAPI(title="Reconhecedor de Numeros API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "app": "Reconhecedor de Numeros API",
        "status": "use http://localhost:3000 para abrir a interface",
        "endpoints": {"health": "/health", "predict": "POST /predict"},
    }


class PredictRequest(BaseModel):
    pixels: list[float]


class ProbabilityOut(BaseModel):
    digit: int
    p: float


class PredictResponse(BaseModel):
    digit: int
    confidence: float
    probabilities: list[ProbabilityOut]
    processed: list[float]
    bits: list[int]
    inference_ms: float


@app.get("/health")
def health():
    return {
        "status": "ok" if os.path.exists(MODEL_PATH) else "sem_modelo",
        "model_loaded": model is not None,
        "accuracy": meta.get("accuracy"),
        "classes": "0-9",
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    import time as _time

    t0 = _time.perf_counter()
    if len(req.pixels) != 784:
        raise HTTPException(status_code=422, detail="O corpo deve conter exatamente 784 pixels (matriz 28x28).")

    m = np.asarray(req.pixels, dtype=np.float64).reshape(28, 28)
    m = np.nan_to_num(m, nan=0.0, posinf=0.0, neginf=0.0)

    processed, bits = preprocess_matrix(m)
    if processed is None:
        raise HTTPException(status_code=400, detail="Desenho vazio: desenhe um numero antes de enviar.")

    clf = load_model()
    probs = clf.predict_proba(processed.reshape(1, -1))[0]
    digit = int(np.argmax(probs))

    return PredictResponse(
        digit=digit,
        confidence=float(probs[digit]),
        probabilities=[ProbabilityOut(digit=i, p=float(p)) for i, p in enumerate(probs)],
        processed=[float(v) for v in processed],
        bits=[int(v) for v in bits],
        inference_ms=round((_time.perf_counter() - t0) * 1000.0, 2),
    )
