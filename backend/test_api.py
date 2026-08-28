import json
import sys
import urllib.request

import numpy as np

from mnist_data import load_mnist

API = "http://localhost:8000/predict"


def main():
    _, _, x_test, y_test = load_mnist()
    rng = np.random.default_rng(int(sys.argv[1]) if len(sys.argv) > 1 else 0)
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 20
    idxs = rng.choice(len(x_test), n, replace=False)
    correct = 0
    for i in idxs:
        body = json.dumps({"pixels": (x_test[i] * 255.0).tolist()}).encode()
        req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as r:
            out = json.load(r)
        ok = out["digit"] == int(y_test[i])
        correct += ok
        print(f"esperado={int(y_test[i])} previsto={out['digit']} confianca={out['confidence']:.3f} {'OK' if ok else 'ERRO'}")
    print(f"{correct}/{n} corretas")


if __name__ == "__main__":
    main()
