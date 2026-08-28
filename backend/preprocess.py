import numpy as np
from PIL import Image

INK_THRESHOLD = 0.05
CONTENT_SIZE = 20
TARGET = 28


def binarize(matrix):
    return (matrix > INK_THRESHOLD).astype(np.uint8)


def preprocess_matrix(matrix):
    m = np.asarray(matrix, dtype=np.float64)
    if m.max(initial=0.0) > 1.5:
        m = m / 255.0
    m = np.clip(np.nan_to_num(m, nan=0.0), 0.0, 1.0)

    bits = binarize(m)
    flat_bits = bits.ravel().astype(int)

    if not bits.any():
        return None, flat_bits

    ys, xs = np.nonzero(bits)
    y0, y1 = ys.min(), ys.max() + 1
    x0, x1 = xs.min(), xs.max() + 1
    crop = m[y0:y1, x0:x1]
    h, w = crop.shape

    scale = CONTENT_SIZE / float(max(h, w))
    nh = max(1, min(h, int(round(h * scale))))
    nw = max(1, min(w, int(round(w * scale))))

    img = Image.fromarray(np.clip(crop * 255.0, 0.0, 255.0).astype(np.uint8), mode="L")
    img = img.resize((nw, nh), Image.Resampling.BILINEAR)
    small = np.asarray(img, dtype=np.float64) / 255.0

    total = small.sum()
    if total <= 0:
        return None, flat_bits
    cy = float((small.sum(axis=1) * np.arange(nh)).sum() / total)
    cx = float((small.sum(axis=0) * np.arange(nw)).sum() / total)

    oy = int(round(TARGET / 2.0 - cy))
    ox = int(round(TARGET / 2.0 - cx))
    oy = max(0, min(TARGET - nh, oy))
    ox = max(0, min(TARGET - nw, ox))

    canvas = np.zeros((TARGET, TARGET), dtype=np.float64)
    canvas[oy:oy + nh, ox:ox + nw] = small
    return canvas.ravel(), flat_bits
