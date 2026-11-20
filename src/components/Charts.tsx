import React, { useState } from 'react';
import {
  OLSResult,
  SaleRecord,
  TargetKey,
  ValidationRow,
  VARIABLES_META,
  VariableKey,
} from '../utils/statistics';

interface HistogramProps {
  values: number[];
  varKey: VariableKey;
  mean: number;
  median: number;
}

export function HistogramChart({ values, varKey, mean, median }: HistogramProps) {
  const [hoverBin, setHoverBin] = useState<number | null>(null);
  const meta = VARIABLES_META[varKey];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const binCount = varKey === 'price' ? 7 : 9;
  const step = (max - min) / binCount || 1;

  const bins = Array.from({ length: binCount }, (_, i) => {
    const start = min + i * step;
    const end = i === binCount - 1 ? max + 0.0001 : min + (i + 1) * step;
    const count = values.filter((v) => v >= start && v < end).length;
    return {
      index: i,
      start,
      end: i === binCount - 1 ? max : min + (i + 1) * step,
      count,
    };
  });

  const maxCount = Math.max(...bins.map((b) => b.count), 1);
  const w = 440;
  const h = 210;
  const pad = { top: 24, right: 16, bottom: 38, left: 36 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const barW = plotW / binCount;

  const toX = (val: number) => pad.left + ((val - min) / (max - min || 1)) * plotW;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible" role="img" aria-label={`Histograma de ${meta.label}`}>
        {[0, 0.5, 1].map((frac) => {
          const y = pad.top + plotH * (1 - frac);
          const labelVal = Math.round(maxCount * frac);
          return (
            <g key={frac}>
              <line x1={pad.left} x2={w - pad.right} y1={y} y2={y} stroke="#E7E5E4" strokeDasharray="3 3" />
              <text x={pad.left - 8} y={y + 3} textAnchor="end" className="fill-stone-400 text-[10px] font-mono tabular-nums">
                {labelVal}
              </text>
            </g>
          );
        })}

        {bins.map((b) => {
          const barH = (b.count / maxCount) * plotH;
          const x = pad.left + b.index * barW + 2;
          const y = pad.top + plotH - barH;
          const isHovered = hoverBin === b.index;
          return (
            <g
              key={b.index}
              onMouseEnter={() => setHoverBin(b.index)}
              onMouseLeave={() => setHoverBin(null)}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={y}
                width={Math.max(barW - 4, 4)}
                height={barH}
                rx="2"
                fill={isHovered ? '#A61C1C' : '#292524'}
                fillOpacity={isHovered ? 0.92 : 0.82}
                className="transition-colors duration-150"
              />
              <text
                x={x + Math.max(barW - 4, 4) / 2}
                y={h - 14}
                textAnchor="middle"
                className="fill-stone-500 text-[9px] font-mono tabular-nums"
              >
                {b.start.toFixed(meta.decimals === 2 ? 1 : 0)}
              </text>
            </g>
          );
        })}

        {/* Mean line */}
        <line
          x1={toX(mean)}
          x2={toX(mean)}
          y1={pad.top - 6}
          y2={pad.top + plotH}
          stroke="#A61C1C"
          strokeWidth="1.75"
          strokeDasharray="4 2"
        />
        {/* Median line */}
        <line
          x1={toX(median)}
          x2={toX(median)}
          y1={pad.top - 6}
          y2={pad.top + plotH}
          stroke="#9A6B16"
          strokeWidth="1.75"
        />

        <line x1={pad.left} x2={w - pad.right} y1={pad.top + plotH} y2={pad.top + plotH} stroke="#D6D3D1" />
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#A61C1C] inline-block" />
            <span>Media: <strong className="font-mono tabular-nums text-stone-900">{mean.toFixed(2)}</strong></span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#9A6B16] inline-block" />
            <span>Mediana: <strong className="font-mono tabular-nums text-stone-900">{median.toFixed(2)}</strong></span>
          </span>
        </div>
        {hoverBin !== null && bins[hoverBin] && (
          <span className="font-mono tabular-nums text-stone-800">
            Rango [{bins[hoverBin].start.toFixed(meta.decimals === 2 ? 2 : 0)} – {bins[hoverBin].end.toFixed(meta.decimals === 2 ? 2 : 0)}]: {bins[hoverBin].count} reg.
          </span>
        )}
      </div>
    </div>
  );
}

interface ScatterProps {
  records: SaleRecord[];
  xKey: VariableKey;
  yKey: VariableKey;
  b0?: number;
  b1?: number;
  trainIds?: Set<number>;
  height?: number;
}

export function ScatterRegressionChart({
  records,
  xKey,
  yKey,
  b0,
  b1,
  trainIds,
  height = 290,
}: ScatterProps) {
  const [hovered, setHovered] = useState<SaleRecord | null>(null);
  const xMeta = VARIABLES_META[xKey];
  const yMeta = VARIABLES_META[yKey];

  const xs = records.map((r) => r[xKey]);
  const ys = records.map((r) => r[yKey]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMinRaw = Math.min(...ys);
  const yMaxRaw = Math.max(...ys);
  const yPad = (yMaxRaw - yMinRaw) * 0.1 || 5;
  const yMin = Math.floor(yMinRaw - yPad);
  const yMax = Math.ceil(yMaxRaw + yPad);

  const w = 640;
  const h = height;
  const pad = { top: 20, right: 24, bottom: 42, left: 52 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const toX = (val: number) => pad.left + ((val - xMin) / (xMax - xMin || 1)) * plotW;
  const toY = (val: number) => pad.top + plotH - ((val - yMin) / (yMax - yMin || 1)) * plotH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => yMin + f * (yMax - yMin));
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => xMin + f * (xMax - xMin));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label={`Gráfico de dispersión ${xMeta.label} vs ${yMeta.label}`}>
        {yTicks.map((val, idx) => {
          const y = toY(val);
          return (
            <g key={idx}>
              <line x1={pad.left} x2={w - pad.right} y1={y} y2={y} stroke="#E7E5E4" strokeDasharray="3 3" />
              <text x={pad.left - 8} y={y + 3} textAnchor="end" className="fill-stone-500 text-[10px] font-mono tabular-nums">
                {Math.round(val)}
              </text>
            </g>
          );
        })}

        {xTicks.map((val, idx) => {
          const x = toX(val);
          return (
            <g key={idx}>
              <line x1={x} x2={x} y1={pad.top} y2={pad.top + plotH} stroke="#F5F5F4" />
              <text x={x} y={pad.top + plotH + 16} textAnchor="middle" className="fill-stone-500 text-[10px] font-mono tabular-nums">
                {val.toFixed(xMeta.decimals === 2 ? 2 : 0)}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={pad.left} x2={w - pad.right} y1={pad.top + plotH} y2={pad.top + plotH} stroke="#A8A29E" />
        <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + plotH} stroke="#A8A29E" />

        {/* Regression Line */}
        {b0 !== undefined && b1 !== undefined && (
          <line
            x1={toX(xMin)}
            y1={toY(b0 + b1 * xMin)}
            x2={toX(xMax)}
            y2={toY(b0 + b1 * xMax)}
            stroke="#A61C1C"
            strokeWidth="2.5"
          />
        )}

        {/* Data points */}
        {records.map((rec) => {
          const cx = toX(rec[xKey]);
          const cy = toY(rec[yKey]);
          const isTrain = trainIds ? trainIds.has(rec.id) : true;
          const isHovered = hovered?.id === rec.id;

          return (
            <circle
              key={rec.id}
              cx={cx}
              cy={cy}
              r={isHovered ? 6 : isTrain ? 3.7 : 4.3}
              fill={trainIds ? (isTrain ? '#292524' : '#9A6B16') : '#292524'}
              fillOpacity={isHovered ? 1 : trainIds ? (isTrain ? 0.65 : 0.9) : 0.68}
              stroke={isHovered ? '#A61C1C' : '#FAF8F5'}
              strokeWidth={isHovered ? 2 : 0.8}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHovered(rec)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}

        {/* Axis labels */}
        <text
          x={pad.left + plotW / 2}
          y={h - 6}
          textAnchor="middle"
          className="fill-stone-600 text-[11px] font-medium"
        >
          {xMeta.label} ({xMeta.unit})
        </text>
        <text
          x={14}
          y={pad.top + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${pad.top + plotH / 2})`}
          className="fill-stone-600 text-[11px] font-medium"
        >
          {yMeta.label}
        </text>
      </svg>

      <div className="mt-2 min-h-[24px] flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 border-t border-stone-100 pt-2">
        <div className="flex items-center gap-4">
          {trainIds ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#292524] inline-block" />
                <span>Entrenamiento 80% ({trainIds.size})</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#9A6B16] inline-block" />
                <span>Validación 20% ({records.length - trainIds.size})</span>
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#292524] inline-block" />
              <span>Observaciones reales (n = {records.length})</span>
            </span>
          )}
          {b0 !== undefined && b1 !== undefined && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#A61C1C] inline-block" />
              <span>Recta MCO</span>
            </span>
          )}
        </div>
        {hovered ? (
          <span className="font-mono tabular-nums text-stone-900">
            Reg #{hovered.id} · {xMeta.shortLabel}: {hovered[xKey].toFixed(xMeta.decimals)} · {yMeta.shortLabel}: {hovered[yKey].toFixed(yMeta.decimals)}
          </span>
        ) : (
          <span className="text-stone-400">Pase el cursor sobre un punto para inspeccionar</span>
        )}
      </div>
    </div>
  );
}

export function DurbinWatsonGauge({ dw, target }: { dw: number; target: TargetKey }) {
  const meta = VARIABLES_META[target];
  // n = 186, k = 1 -> Savin-White critical bounds approx dL = 1.75, dU = 1.77
  const dL = 1.75;
  const dU = 1.77;
  const pct = Math.min(100, Math.max(0, (dw / 4) * 100));

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-sm font-medium text-stone-800">{meta.label}</span>
          <span className="text-xs text-stone-500 ml-2">(Límites críticos α=0.05: dL={dL}, dU={dU})</span>
        </div>
        <span className="font-mono text-lg font-semibold tabular-nums text-stone-900">
          DW = {dw.toFixed(4)}
        </span>
      </div>

      <div className="relative h-7 rounded border border-stone-200 overflow-hidden flex text-[10px] font-medium">
        <div
          style={{ width: `${(dL / 4) * 100}%` }}
          className="bg-red-50 text-red-900 flex items-center justify-center border-r border-stone-200 truncate px-1"
          title="Autocorrelación Positiva (0 a 1.75)"
        >
          Autocorr. (+)
        </div>
        <div
          style={{ width: `${((dU - dL) / 4) * 100}%` }}
          className="bg-amber-50 text-amber-900 border-r border-stone-200"
          title="Zona de Indecisión"
        />
        <div
          style={{ width: `${((4 - dU - dU) / 4) * 100}%` }}
          className="bg-emerald-50 text-emerald-900 flex items-center justify-center border-r border-stone-200 truncate px-1"
          title="Independencia de Residuos (1.77 a 2.23)"
        >
          Independencia (Ideal ≈ 2.0)
        </div>
        <div
          style={{ width: `${((dU - dL) / 4) * 100}%` }}
          className="bg-amber-50 text-amber-900 border-r border-stone-200"
          title="Zona de Indecisión"
        />
        <div
          style={{ width: `${(dL / 4) * 100}%` }}
          className="bg-red-50 text-red-900 flex items-center justify-center truncate px-1"
          title="Autocorrelación Negativa (2.25 a 4.0)"
        >
          Autocorr. (-)
        </div>

        {/* Needle */}
        <div
          style={{ left: `calc(${pct}% - 2px)` }}
          className="absolute top-0 bottom-0 w-1 bg-[#A61C1C]"
        />
      </div>

      <div className="flex justify-between text-[11px] font-mono tabular-nums text-stone-500">
        <span>0.00</span>
        <span>dL {dL}</span>
        <span className="text-stone-900 font-semibold">2.00</span>
        <span>4-dL {(4 - dL).toFixed(2)}</span>
        <span>4.00</span>
      </div>
    </div>
  );
}

export function ResidualSequenceChart({ ols }: { ols: OLSResult }) {
  const w = 640;
  const h = 210;
  const pad = { top: 18, right: 20, bottom: 32, left: 48 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const maxAbs = Math.max(...ols.residuals.map((e) => Math.abs(e)), 10);
  const yMin = -Math.ceil(maxAbs * 1.1);
  const yMax = Math.ceil(maxAbs * 1.1);

  const toX = (i: number) => pad.left + (i / (ols.residuals.length - 1 || 1)) * plotW;
  const toY = (val: number) => pad.top + plotH - ((val - yMin) / (yMax - yMin)) * plotH;

  const pointsAttr = ols.residuals.map((e, i) => `${toX(i).toFixed(1)},${toY(e).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="Secuencia de residuos por observación">
      {[yMin, 0, yMax].map((v, i) => {
        const y = toY(v);
        return (
          <g key={i}>
            <line
              x1={pad.left}
              x2={w - pad.right}
              y1={y}
              y2={y}
              stroke={v === 0 ? '#A61C1C' : '#E7E5E4'}
              strokeDasharray={v === 0 ? undefined : '3 3'}
              strokeWidth={v === 0 ? 1.5 : 1}
            />
            <text x={pad.left - 8} y={y + 3} textAnchor="end" className="fill-stone-500 text-[10px] font-mono tabular-nums">
              {v > 0 ? `+${v}` : v}
            </text>
          </g>
        );
      })}
      <polyline fill="none" stroke="#44403C" strokeWidth="1.25" strokeOpacity="0.7" points={pointsAttr} />
      {ols.residuals.map((e, i) => (
        <circle
          key={i}
          cx={toX(i)}
          cy={toY(e)}
          r="2.2"
          fill={e >= 0 ? '#292524' : '#9A6B16'}
        />
      ))}
      <text x={pad.left + plotW / 2} y={h - 6} textAnchor="middle" className="fill-stone-600 text-[11px]">
        Orden de registro (1 a {ols.n}) — Oscilación aleatoria alrededor de 0
      </text>
    </svg>
  );
}

export function ValidationComparisonChart({
  rows,
  target,
}: {
  rows: ValidationRow[];
  target: TargetKey;
}) {
  const [hovered, setHovered] = useState<ValidationRow | null>(null);
  const meta = VARIABLES_META[target];

  const w = 640;
  const h = 250;
  const pad = { top: 20, right: 20, bottom: 38, left: 48 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const allVals = rows.flatMap((r) => [r.actual, r.predicted]);
  const yMin = Math.floor(Math.min(...allVals) - 10);
  const yMax = Math.ceil(Math.max(...allVals) + 10);

  const toX = (idx: number) => pad.left + (idx / (rows.length - 1 || 1)) * plotW;
  const toY = (val: number) => pad.top + plotH - ((val - yMin) / (yMax - yMin || 1)) * plotH;

  const actualLine = rows.map((r, i) => `${toX(i).toFixed(1)},${toY(r.actual).toFixed(1)}`).join(' ');
  const predLine = rows.map((r, i) => `${toX(i).toFixed(1)},${toY(r.predicted).toFixed(1)}`).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label={`Comparación Real vs Predicho en validación para ${meta.label}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((f, idx) => {
          const val = yMin + f * (yMax - yMin);
          const y = toY(val);
          return (
            <g key={idx}>
              <line x1={pad.left} x2={w - pad.right} y1={y} y2={y} stroke="#E7E5E4" strokeDasharray="3 3" />
              <text x={pad.left - 8} y={y + 3} textAnchor="end" className="fill-stone-500 text-[10px] font-mono tabular-nums">
                {Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Error vertical stems */}
        {rows.map((r, i) => (
          <line
            key={`stem-${r.id}`}
            x1={toX(i)}
            x2={toX(i)}
            y1={toY(r.actual)}
            y2={toY(r.predicted)}
            stroke="#D6D3D1"
            strokeWidth="1.2"
          />
        ))}

        <polyline fill="none" stroke="#292524" strokeWidth="1.8" points={actualLine} />
        <polyline fill="none" stroke="#A61C1C" strokeWidth="2" strokeDasharray="5 3" points={predLine} />

        {rows.map((r, i) => {
          const isHover = hovered?.id === r.id;
          return (
            <g
              key={r.id}
              onMouseEnter={() => setHovered(r)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <circle cx={toX(i)} cy={toY(r.actual)} r={isHover ? 5.5 : 3.5} fill="#292524" />
              <circle cx={toX(i)} cy={toY(r.predicted)} r={isHover ? 5.5 : 3.5} fill="#A61C1C" />
            </g>
          );
        })}

        <text x={pad.left + plotW / 2} y={h - 8} textAnchor="middle" className="fill-stone-600 text-[11px]">
          Registros del conjunto de validación (n = {rows.length}, 20% fuera de muestra)
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 border-t border-stone-100 pt-2">
        <div className="flex items-center gap-5">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#292524] inline-block" />
            <span>Valor Real (Observado)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#A61C1C] inline-block" />
            <span>Predicción Modelo (80%)</span>
          </span>
        </div>
        {hovered ? (
          <span className="font-mono tabular-nums text-stone-900">
            Reg #{hovered.id} (Precio ${hovered.price.toFixed(2)}) · Real: {hovered.actual} · Pred: {hovered.predicted.toFixed(1)} · Error: {hovered.error >= 0 ? '+' : ''}{hovered.error.toFixed(1)}
          </span>
        ) : (
          <span className="text-stone-400">Pase el cursor sobre cualquier registro de validación</span>
        )}
      </div>
    </div>
  );
}
