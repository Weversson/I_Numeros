import gzip
import os
import struct
import urllib.request

import numpy as np

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
MIRRORS = [
    "https://ossci-datasets.s3.amazonaws.com/mnist/",
    "https://storage.googleapis.com/cvdf-datasets/mnist/",
]
FILES = {
    "train_images": "train-images-idx3-ubyte.gz",
    "train_labels": "train-labels-idx1-ubyte.gz",
    "test_images": "t10k-images-idx3-ubyte.gz",
    "test_labels": "t10k-labels-idx1-ubyte.gz",
}


def _download(fname):
    os.makedirs(DATA_DIR, exist_ok=True)
    dest = os.path.join(DATA_DIR, fname)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return dest
    last_err = None
    for mirror in MIRRORS:
        try:
            print(f"       baixando {fname} de {mirror}")
            urllib.request.urlretrieve(mirror + fname, dest)
            return dest
        except Exception as e:
            last_err = e
            if os.path.exists(dest):
                os.remove(dest)
    raise RuntimeError(f"Falha ao baixar {fname}: {last_err}")


def _read_images(path):
    with gzip.open(path, "rb") as f:
        magic, n = struct.unpack(">II", f.read(8))
        rows, cols = struct.unpack(">II", f.read(8))
        data = np.frombuffer(f.read(rows * cols * n), dtype=np.uint8)
        return data.reshape(n, rows * cols).astype(np.float64) / 255.0


def _read_labels(path):
    with gzip.open(path, "rb") as f:
        magic, n = struct.unpack(">II", f.read(8))
        return np.frombuffer(f.read(n), dtype=np.uint8).astype(int)


def load_mnist():
    x_train = _read_images(_download(FILES["train_images"]))
    y_train = _read_labels(_download(FILES["train_labels"]))
    x_test = _read_images(_download(FILES["test_images"]))
    y_test = _read_labels(_download(FILES["test_labels"]))
    return x_train, y_train, x_test, y_test
