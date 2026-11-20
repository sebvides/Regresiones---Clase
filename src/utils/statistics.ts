export interface SaleRecord {
  id: number;
  rawPrice: string;
  price: number;
  bowls: number;
  soda: number;
  beer: number;
}

export type VariableKey = 'price' | 'bowls' | 'soda' | 'beer';
export type TargetKey = 'bowls' | 'soda' | 'beer';
export type SplitMode = 'sequential' | 'random42';

export interface VariableMeta {
  key: VariableKey;
  label: string;
  shortLabel: string;
  csvHeader: string;
  role: 'Independiente (X)' | 'Dependiente (Y)';
  type: 'Cuantitativa Continua' | 'Cuantitativa Discreta';
  scale: 'Razón';
  unit: string;
  decimals: number;
  description: string;
}

export const VARIABLES_META: Record<VariableKey, VariableMeta> = {
  price: {
    key: 'price',
    label: 'Precio del Bowl',
    shortLabel: 'Bowl Price',
    csvHeader: 'Bowl Price',
    role: 'Independiente (X)',
    type: 'Cuantitativa Continua',
    scale: 'Razón',
    unit: 'USD ($)',
    decimals: 2,
    description:
      'Precio unitario fijado para cada bowl en el registro. Originalmente codificado con coma decimal ("9,3") y normalizado a punto decimal (9.30). Actúa como variable predictora en todas las regresiones.',
  },
  bowls: {
    key: 'bowls',
    label: 'Bowls Vendidos',
    shortLabel: 'Bowls',
    csvHeader: 'Bowls',
    role: 'Dependiente (Y)',
    type: 'Cuantitativa Discreta',
    scale: 'Razón',
    unit: 'unidades',
    decimals: 0,
    description:
      'Cantidad entera de bowls vendidos por registro operativo. Representa la demanda principal directamente sensible a la variación del precio del bowl.',
  },
  soda: {
    key: 'soda',
    label: 'Sodas Vendidas',
    shortLabel: 'Soda',
    csvHeader: 'Soda',
    role: 'Dependiente (Y)',
    type: 'Cuantitativa Discreta',
    scale: 'Razón',
    unit: 'unidades',
    decimals: 0,
    description:
      'Número entero de sodas vendidas. Funciona como producto complementario directo de los bowls; su demanda cae cuando sube el precio del bowl.',
  },
  beer: {
    key: 'beer',
    label: 'Cervezas Vendidas',
    shortLabel: 'Beer',
    csvHeader: 'Beer',
    role: 'Dependiente (Y)',
    type: 'Cuantitativa Discreta',
    scale: 'Razón',
    unit: 'unidades',
    decimals: 0,
    description:
      'Cantidad entera de cervezas vendidas por registro. Presenta demanda más independiente e inelástica respecto al precio del bowl.',
  },
};

export interface DescriptiveStats {
  key: VariableKey;
  n: number;
  sum: number;
  mean: number;
  median: number;
  mode: number[];
  std: number;
  variance: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
  cv: number;
}

export interface CorrelationCell {
  row: VariableKey;
  col: VariableKey;
  r: number;
  rSquared: number;
  pValue: number;
  covariance: number;
  strength: string;
}

export interface OLSResult {
  target: TargetKey;
  n: number;
  b0: number;
  b1: number;
  seB0: number;
  seB1: number;
  tB0: number;
  tB1: number;
  pB0: number;
  pB1: number;
  ciB1Low: number;
  ciB1High: number;
  r2: number;
  adjR2: number;
  rmse: number;
  mae: number;
  mape: number;
  sse: number;
  ssr: number;
  sst: number;
  fStat: number;
  sigmaHat: number;
  dw: number;
  dwInterpretation: string;
  aic: number;
  aicGaussian: number;
  bic: number;
  bicGaussian: number;
  predictions: number[];
  residuals: number[];
}

export interface ValidationRow {
  id: number;
  price: number;
  actual: number;
  predicted: number;
  error: number;
  absError: number;
  pctError: number;
}

export interface TrainValidationResult {
  target: TargetKey;
  splitMode: SplitMode;
  trainRecords: SaleRecord[];
  testRecords: SaleRecord[];
  trainOLS: OLSResult;
  cpAgainstSelf: number;
  cpAgainstQuad: number;
  cpNullModel: number;
  quadAdjR2: number;
  quadAic: number;
  quadBic: number;
  valPredictions: ValidationRow[];
  valRmse: number;
  valMae: number;
  valMape: number;
  valR2: number;
  valBias: number;
  overfitRatio: number;
}

export function parseMaoCSV(csvText: string): SaleRecord[] {
  const lines = csvText.trim().split(/\r?\n/);
  const records: SaleRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const match = line.match(/^"([^"]+)"\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)$/);
    if (match) {
      const rawPrice = match[1];
      const price = parseFloat(rawPrice.replace(',', '.'));
      const bowls = parseInt(match[2], 10);
      const soda = parseInt(match[3], 10);
      const beer = parseInt(match[4], 10);
      if (!Number.isNaN(price) && !Number.isNaN(bowls) && !Number.isNaN(soda) && !Number.isNaN(beer)) {
        records.push({
          id: records.length + 1,
          rawPrice,
          price,
          bowls,
          soda,
          beer,
        });
      }
    } else {
      const parts = line.split(',');
      if (parts.length >= 4) {
        const rawPrice = parts[0].replace(/"/g, '').trim();
        const price = parseFloat(rawPrice.replace(',', '.'));
        const bowls = parseInt(parts[1], 10);
        const soda = parseInt(parts[2], 10);
        const beer = parseInt(parts[3], 10);
        if (!Number.isNaN(price) && !Number.isNaN(bowls) && !Number.isNaN(soda) && !Number.isNaN(beer)) {
          records.push({
            id: records.length + 1,
            rawPrice,
            price,
            bowls,
            soda,
            beer,
          });
        }
      }
    }
  }
  return records;
}

export function getColumnValues(records: SaleRecord[], key: VariableKey): number[] {
  return records.map((r) => r[key]);
}

function quantile(sorted: number[], p: number): number {
  const pos = (sorted.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

// Standard normal two-tailed p-value approximation (Abramowitz & Stegun)
function normalTwoTailedP(zAbs: number): number {
  if (zAbs > 8) return 0;
  const t = 1 / (1 + 0.2316419 * zAbs);
  const d = 0.3989422804014327 * Math.exp((-zAbs * zAbs) / 2);
  const prob =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return Math.min(1, Math.max(0, 2 * prob));
}

export function computeDescriptiveStats(records: SaleRecord[], key: VariableKey): DescriptiveStats {
  const values = getColumnValues(records, key);
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;
  const median = quantile(sorted, 0.5);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;

  const freq = new Map<number, number>();
  let maxFreq = 0;
  for (const v of values) {
    const c = (freq.get(v) || 0) + 1;
    freq.set(v, c);
    if (c > maxFreq) maxFreq = c;
  }
  const mode = Array.from(freq.entries())
    .filter(([, count]) => count === maxFreq)
    .map(([val]) => val)
    .sort((a, b) => a - b)
    .slice(0, 3);

  const sqDiffs = values.map((v) => (v - mean) ** 2);
  const variance = sqDiffs.reduce((a, b) => a + b, 0) / (n - 1);
  const std = Math.sqrt(variance);

  const m3 = values.reduce((acc, v) => acc + ((v - mean) / std) ** 3, 0);
  const m4 = values.reduce((acc, v) => acc + ((v - mean) / std) ** 4, 0);
  const skewness = (n / ((n - 1) * (n - 2))) * m3;
  const kurtosis =
    ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * m4 -
    (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));

  return {
    key,
    n,
    sum,
    mean,
    median,
    mode,
    std,
    variance,
    min,
    max,
    range,
    q1,
    q3,
    iqr,
    skewness,
    kurtosis,
    cv: (std / mean) * 100,
  };
}

function classifyCorrelation(r: number): string {
  const absR = Math.abs(r);
  if (absR >= 0.999) return 'Identidad perfecta';
  const dir = r >= 0 ? 'positiva' : 'negativa';
  if (absR >= 0.75) return `Muy fuerte ${dir}`;
  if (absR >= 0.5) return `Moderada-fuerte ${dir}`;
  if (absR >= 0.3) return `Moderada ${dir}`;
  if (absR >= 0.15) return `Débil ${dir}`;
  return `Muy débil ${dir}`;
}

export function computeCorrelationMatrix(records: SaleRecord[]): CorrelationCell[][] {
  const keys: VariableKey[] = ['price', 'bowls', 'soda', 'beer'];
  const n = records.length;

  return keys.map((rowKey) => {
    const xs = getColumnValues(records, rowKey);
    const mx = xs.reduce((a, b) => a + b, 0) / n;

    return keys.map((colKey) => {
      const ys = getColumnValues(records, colKey);
      const my = ys.reduce((a, b) => a + b, 0) / n;

      let num = 0;
      let dx2 = 0;
      let dy2 = 0;
      for (let i = 0; i < n; i++) {
        const dx = xs[i] - mx;
        const dy = ys[i] - my;
        num += dx * dy;
        dx2 += dx * dx;
        dy2 += dy * dy;
      }
      const covariance = num / (n - 1);
      const r = rowKey === colKey ? 1 : num / Math.sqrt(dx2 * dy2);
      const tStat = Math.abs(r) >= 0.9999 ? 99 : Math.abs(r) * Math.sqrt((n - 2) / (1 - r * r));
      const pValue = rowKey === colKey ? 0 : normalTwoTailedP(tStat);

      return {
        row: rowKey,
        col: colKey,
        r,
        rSquared: r * r,
        pValue,
        covariance,
        strength: classifyCorrelation(r),
      };
    });
  });
}

export function computeOLS(records: SaleRecord[], target: TargetKey): OLSResult {
  const n = records.length;
  const xs = records.map((r) => r.price);
  const ys = records.map((r) => r[target]);

  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;

  let sxy = 0;
  let sxx = 0;
  let sst = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    sst += dy * dy;
  }

  const b1 = sxy / sxx;
  const b0 = my - b1 * mx;

  const predictions = xs.map((x) => b0 + b1 * x);
  const residuals = ys.map((y, i) => y - predictions[i]);

  const sse = residuals.reduce((acc, e) => acc + e * e, 0);
  const ssr = sst - sse;
  const r2 = 1 - sse / sst;
  const adjR2 = 1 - ((1 - r2) * (n - 1)) / (n - 2);
  const rmse = Math.sqrt(sse / n);
  const mae = residuals.reduce((acc, e) => acc + Math.abs(e), 0) / n;
  const mape =
    (ys.reduce((acc, y, i) => acc + Math.abs(residuals[i] / y), 0) / n) * 100;

  const sigmaHat2 = sse / (n - 2);
  const sigmaHat = Math.sqrt(sigmaHat2);
  const seB1 = Math.sqrt(sigmaHat2 / sxx);
  const seB0 = Math.sqrt(sigmaHat2 * (1 / n + (mx * mx) / sxx));

  const tB1 = b1 / seB1;
  const tB0 = b0 / seB0;
  const pB1 = normalTwoTailedP(Math.abs(tB1));
  const pB0 = normalTwoTailedP(Math.abs(tB0));

  const tCrit = 1.973; // t_{0.025, df~184}
  const ciB1Low = b1 - tCrit * seB1;
  const ciB1High = b1 + tCrit * seB1;
  const fStat = ssr / sigmaHat2;

  let dwNum = 0;
  for (let i = 1; i < n; i++) {
    dwNum += (residuals[i] - residuals[i - 1]) ** 2;
  }
  const dw = dwNum / sse;

  let dwInterpretation = 'Sin autocorrelación serial (independencia de residuos)';
  if (dw < 1.65) {
    dwInterpretation = 'Posible autocorrelación positiva en los residuos';
  } else if (dw > 2.35) {
    dwInterpretation = 'Posible autocorrelación negativa en los residuos';
  }

  const p = 2; // intercept + 1 predictor
  const aic = n * Math.log(sse / n) + 2 * p;
  const aicGaussian = n * Math.log(2 * Math.PI) + n * Math.log(sse / n) + n + 2 * (p + 1);
  const bic = n * Math.log(sse / n) + p * Math.log(n);
  const bicGaussian = n * Math.log(2 * Math.PI) + n * Math.log(sse / n) + n + (p + 1) * Math.log(n);

  return {
    target,
    n,
    b0,
    b1,
    seB0,
    seB1,
    tB0,
    tB1,
    pB0,
    pB1,
    ciB1Low,
    ciB1High,
    r2,
    adjR2,
    rmse,
    mae,
    mape,
    sse,
    ssr,
    sst,
    fStat,
    sigmaHat,
    dw,
    dwInterpretation,
    aic,
    aicGaussian,
    bic,
    bicGaussian,
    predictions,
    residuals,
  };
}

// Deterministic seeded shuffle (Mulberry32) for reproducible 80/20 split
function seededIndices(length: number, seed: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  let state = seed;
  const rand = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Solves 3x3 linear system using Gaussian elimination for quadratic reference model (Cp comparison)
function fitQuadraticSSE(records: SaleRecord[], target: TargetKey): { sse: number; adjR2: number; aic: number; bic: number } {
  const n = records.length;
  const xs = records.map((r) => r.price);
  const ys = records.map((r) => r[target]);

  // Center X around mean for numerical stability
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const z = xs.map((x) => x - mx);

  const A = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const B = [0, 0, 0];

  for (let i = 0; i < n; i++) {
    const row = [1, z[i], z[i] * z[i]];
    for (let r = 0; r < 3; r++) {
      B[r] += row[r] * ys[i];
      for (let c = 0; c < 3; c++) {
        A[r][c] += row[r] * row[c];
      }
    }
  }

  // Gaussian elimination with partial pivoting
  for (let i = 0; i < 3; i++) {
    let maxRow = i;
    for (let k = i + 1; k < 3; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    [B[i], B[maxRow]] = [B[maxRow], B[i]];

    for (let k = i + 1; k < 3; k++) {
      const factor = A[k][i] / A[i][i];
      for (let j = i; j < 3; j++) A[k][j] -= factor * A[i][j];
      B[k] -= factor * B[i];
    }
  }

  const coef = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let sum = B[i];
    for (let j = i + 1; j < 3; j++) sum -= A[i][j] * coef[j];
    coef[i] = sum / A[i][i];
  }

  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sse = 0;
  let sst = 0;
  for (let i = 0; i < n; i++) {
    const pred = coef[0] + coef[1] * z[i] + coef[2] * z[i] * z[i];
    sse += (ys[i] - pred) ** 2;
    sst += (ys[i] - my) ** 2;
  }

  const r2 = 1 - sse / sst;
  const adjR2 = 1 - ((1 - r2) * (n - 1)) / (n - 3);
  const p = 3;
  const aic = n * Math.log(sse / n) + 2 * p;
  const bic = n * Math.log(sse / n) + p * Math.log(n);
  return { sse, adjR2, aic, bic };
}

export function computeTrainValidationEvaluation(
  records: SaleRecord[],
  target: TargetKey,
  splitMode: SplitMode
): TrainValidationResult {
  const trainCount = Math.round(records.length * 0.8); // 149 out of 186 (80.1%)

  let trainRecords: SaleRecord[];
  let testRecords: SaleRecord[];

  if (splitMode === 'sequential') {
    trainRecords = records.slice(0, trainCount);
    testRecords = records.slice(trainCount);
  } else {
    const idxs = seededIndices(records.length, 42);
    const trainIdxSet = new Set(idxs.slice(0, trainCount));
    trainRecords = records.filter((_, i) => trainIdxSet.has(i));
    testRecords = records.filter((_, i) => !trainIdxSet.has(i));
  }

  const trainOLS = computeOLS(trainRecords, target);
  const quadRef = fitQuadraticSSE(trainRecords, target);

  const nTrain = trainRecords.length;
  const sigmaQuad2 = quadRef.sse / (nTrain - 3);
  const cpAgainstSelf = 2.0; // For p=2 full linear model vs itself, Cp = SSE/s^2 - n + 2p = (n-2) - n + 4 = 2.0
  const cpAgainstQuad = trainOLS.sse / sigmaQuad2 - nTrain + 2 * 2;
  const cpNullModel = trainOLS.sst / (trainOLS.sse / (nTrain - 2)) - nTrain + 2 * 1;

  const valPredictions: ValidationRow[] = testRecords.map((rec) => {
    const predicted = trainOLS.b0 + trainOLS.b1 * rec.price;
    const actual = rec[target];
    const error = actual - predicted;
    const absError = Math.abs(error);
    const pctError = (absError / actual) * 100;
    return {
      id: rec.id,
      price: rec.price,
      actual,
      predicted,
      error,
      absError,
      pctError,
    };
  });

  const nTest = valPredictions.length;
  const valSse = valPredictions.reduce((acc, r) => acc + r.error ** 2, 0);
  const valMeanActual = valPredictions.reduce((acc, r) => acc + r.actual, 0) / nTest;
  const valSst = valPredictions.reduce((acc, r) => acc + (r.actual - valMeanActual) ** 2, 0);

  const valRmse = Math.sqrt(valSse / nTest);
  const valMae = valPredictions.reduce((acc, r) => acc + r.absError, 0) / nTest;
  const valMape = valPredictions.reduce((acc, r) => acc + r.pctError, 0) / nTest;
  const valR2 = 1 - valSse / valSst;
  const valBias = valPredictions.reduce((acc, r) => acc + r.error, 0) / nTest;
  const overfitRatio = valRmse / trainOLS.rmse;

  return {
    target,
    splitMode,
    trainRecords,
    testRecords,
    trainOLS,
    cpAgainstSelf,
    cpAgainstQuad,
    cpNullModel,
    quadAdjR2: quadRef.adjR2,
    quadAic: quadRef.aic,
    quadBic: quadRef.bic,
    valPredictions,
    valRmse,
    valMae,
    valMape,
    valR2,
    valBias,
    overfitRatio,
  };
}
