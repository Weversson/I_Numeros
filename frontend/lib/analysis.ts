export interface StrokeMetrics {
  strokes: number;
  userStrokes: number;
  drawingMs: number;
  density: number;
  coverage: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface PreprocessStep {
  id: string;
  label: string;
  description: string;
  pixels: number[];
}

const INK_THRESHOLD = 0.05;
const CONTENT_SIZE = 20;
const TARGET = 28;

export function binarize(matrix: number[]): number[] {
  return matrix.map((v) => (v > INK_THRESHOLD ? 1 : 0));
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function getContentBox(bits: number[]): BBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let y = 0; y < TARGET; y++) {
    for (let x = 0; x < TARGET; x++) {
      if (bits[y * TARGET + x] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

function countComponents(bits: number[]): number {
  const visited = new Array<boolean>(TARGET * TARGET).fill(false);
  let count = 0;
  const stack: number[] = [];
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === 0 || visited[i]) continue;
    count++;
    stack.push(i);
    visited[i] = true;
    while (stack.length) {
      const cur = stack.pop()!;
      const x = cur % TARGET;
      const y = (cur / TARGET) | 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= TARGET || ny < 0 || ny >= TARGET) continue;
        const idx = ny * TARGET + nx;
        if (bits[idx] === 0 || visited[idx]) continue;
        visited[idx] = true;
        stack.push(idx);
      }
    }
  }
  return count;
}

export function analyzeDrawing(matrix: number[], interaction: {
  userStrokes: number;
  drawingMs: number;
}): StrokeMetrics | null {
  const bits = binarize(matrix);
  const box = getContentBox(bits);
  if (!box) return null;

  const w = box.maxX - box.minX + 1;
  const h = box.maxY - box.minY + 1;
  const boxArea = w * h;

  let inkCount = 0;
  let weightedX = 0;
  let weightedY = 0;
  for (let y = 0; y < TARGET; y++) {
    for (let x = 0; x < TARGET; x++) {
      if (bits[y * TARGET + x] === 0) continue;
      inkCount++;
      weightedX += x;
      weightedY += y;
    }
  }

  const strokes = countComponents(bits);

  return {
    strokes,
    userStrokes: interaction.userStrokes,
    drawingMs: interaction.drawingMs,
    density: inkCount / (TARGET * TARGET),
    coverage: boxArea / (TARGET * TARGET),
    centerX: weightedX / inkCount / (TARGET - 1),
    centerY: weightedY / inkCount / (TARGET - 1),
    width: w,
    height: h,
    aspectRatio: h / w,
  };
}

function bilinearResize(src: number[], srcW: number, srcH: number, dstW: number, dstH: number): number[] {
  const out = new Array<number>(dstW * dstH).fill(0);
  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      const gx = (dx + 0.5) * (srcW / dstW) - 0.5;
      const gy = (dy + 0.5) * (srcH / dstH) - 0.5;
      const x0 = Math.max(0, Math.min(srcW - 1, Math.floor(gx)));
      const y0 = Math.max(0, Math.min(srcH - 1, Math.floor(gy)));
      const x1 = Math.min(srcW - 1, x0 + 1);
      const y1 = Math.min(srcH - 1, y0 + 1);
      const fx = Math.max(0, Math.min(1, gx - x0));
      const fy = Math.max(0, Math.min(1, gy - y0));
      const p00 = src[y0 * srcW + x0];
      const p10 = src[y0 * srcW + x1];
      const p01 = src[y1 * srcW + x0];
      const p11 = src[y1 * srcW + x1];
      out[dy * dstW + dx] =
        p00 * (1 - fx) * (1 - fy) +
        p10 * fx * (1 - fy) +
        p01 * (1 - fx) * fy +
        p11 * fx * fy;
    }
  }
  return out;
}

function canvasFromCentered(content: number[], cw: number, ch: number): number[] {
  const canvas = new Array<number>(TARGET * TARGET).fill(0);
  let ink = 0;
  let cy = 0;
  let cx = 0;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const v = content[y * cw + x];
      ink += v;
      cy += v * y;
      cx += v * x;
    }
  }
  if (ink === 0) return canvas;
  const centerY = cy / ink;
  const centerX = cx / ink;
  let oy = Math.round(TARGET / 2 - centerY);
  let ox = Math.round(TARGET / 2 - centerX);
  oy = Math.max(0, Math.min(TARGET - ch, oy));
  ox = Math.max(0, Math.min(TARGET - cw, ox));
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      canvas[(oy + y) * TARGET + (ox + x)] = content[y * cw + x];
    }
  }
  return canvas;
}

export function buildPreprocessSteps(matrix: number[]): PreprocessStep[] {
  const bits = binarize(matrix);
  const box = getContentBox(bits);
  if (!box) return [];

  const width = box.maxX - box.minX + 1;
  const height = box.maxY - box.minY + 1;

  const cropped = new Array<number>(width * height).fill(0);
  for (let y = box.minY; y <= box.maxY; y++) {
    for (let x = box.minX; x <= box.maxX; x++) {
      cropped[(y - box.minY) * width + (x - box.minX)] = matrix[y * TARGET + x];
    }
  }

  const cropPadded = new Array<number>(TARGET * TARGET).fill(0);
  let ocx = Math.round((TARGET - width) / 2);
  let ocy = Math.round((TARGET - height) / 2);
  ocx = Math.max(0, ocx);
  ocy = Math.max(0, ocy);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cropPadded[(ocy + y) * TARGET + (ocx + x)] = cropped[y * width + x];
    }
  }

  const scale = CONTENT_SIZE / Math.max(width, height);
  const nw = Math.max(1, Math.min(width, Math.round(width * scale)));
  const nh = Math.max(1, Math.min(height, Math.round(height * scale)));
  const resized = bilinearResize(cropped, width, height, nw, nh);

  const centered = canvasFromCentered(resized, nw, nh);

  return [
    {
      id: "crop",
      label: "Recorte",
      description: `${width}×${height} da região de tinta`,
      pixels: cropPadded,
    },
    {
      id: "resize",
      label: "Redimensionamento",
      description: `${nw}×${nh} (padrão 20×20)`,
      pixels: (() => {
        const p = new Array<number>(TARGET * TARGET).fill(0);
        const ox = Math.round((TARGET - nw) / 2);
        const oy = Math.round((TARGET - nh) / 2);
        for (let y = 0; y < nh; y++) {
          for (let x = 0; x < nw; x++) {
            p[(oy + y) * TARGET + (ox + x)] = resized[y * nw + x];
          }
        }
        return p;
      })(),
    },
    {
      id: "center",
      label: "Centralização",
      description: "alinhado pelo centro de massa",
      pixels: centered,
    },
  ];
}
