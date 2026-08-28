import json
import os
import time

import joblib
import numpy as np
from scipy.ndimage import binary_dilation, binary_erosion
from scipy.ndimage import shift as nd_shift
from sklearn.metrics import accuracy_score
from sklearn.neural_network import MLPClassifier

from mnist_data import load_mnist

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")
MODEL_PATH = os.path.join(MODEL_DIR, "digit_mlp.joblib")
META_PATH = os.path.join(MODEL_DIR, "meta.json")

SEED = 42
N_AUGMENTED = 25000


def jitter(image, dy, dx):
    return nd_shift(image, (dy, dx), order=1, mode="constant", cval=0.0, prefilter=False)


def thicken(image):
    mask = binary_dilation(image > 0.25)
    return np.maximum(image, mask.astype(np.float64) * 0.85)


def thin(image):
    mask = binary_erosion(image > 0.25)
    return image * mask


def augment(x, y, rng, n_extra=N_AUGMENTED):
    extra_x = np.empty((n_extra, x.shape[1]), dtype=np.float64)
    idx = rng.integers(0, len(x), n_extra)
    for k, i in enumerate(idx):
        img = x[i].reshape(28, 28).copy()
        dy, dx = (int(v) for v in rng.integers(-2, 3, 2))
        img = jitter(img, dy, dx)
        r = rng.random()
        if r < 0.30:
            img = thicken(img)
        elif r < 0.55:
            img = thin(img)
        extra_x[k] = np.clip(img.ravel(), 0.0, 1.0)
    return np.vstack([x, extra_x]), np.concatenate([y, y[idx]])


def main():
    t0 = time.time()
    rng = np.random.default_rng(SEED)

    print("[1/4] Carregando MNIST...")
    x_train, y_train, x_test, y_test = load_mnist()
    print(f"       treino={len(x_train)} teste={len(x_test)}")

    print("[2/4] Gerando dados aumentados (shift/dilatacao/erosao)...")
    x_all, y_all = augment(x_train, y_train, rng)
    print(f"       total para treino={len(x_all)}")

    print("[3/4] Treinando MLP 784-400-200-10 ...")
    clf = MLPClassifier(
        hidden_layer_sizes=(400, 200),
        activation="relu",
        solver="adam",
        alpha=1e-4,
        batch_size=200,
        learning_rate_init=1e-3,
        max_iter=40,
        early_stopping=True,
        n_iter_no_change=6,
        validation_fraction=0.08,
        random_state=SEED,
        verbose=True,
    )
    clf.fit(x_all, y_all)

    print("[4/4] Avaliando...")
    pred = clf.predict(x_test)
    acc = float(accuracy_score(y_test, pred))
    print(f"\nAcuracia no teste: {acc:.4f}")

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(clf, MODEL_PATH)
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(
            {
                "accuracy": acc,
                "trained_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                "n_train": int(len(x_all)),
                "architecture": "784-400-200-10",
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    print(f"Modelo salvo em {MODEL_PATH}")
    print(f"Tempo total: {time.time() - t0:.1f}s")
    print(f"TRAIN_DONE acc={acc:.4f}")


if __name__ == "__main__":
    main()
