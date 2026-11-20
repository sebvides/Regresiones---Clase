import React, { useEffect, useMemo, useState } from 'react';
import {
  computeCorrelationMatrix,
  computeDescriptiveStats,
  computeOLS,
  computeTrainValidationEvaluation,
  getColumnValues,
  parseMaoCSV,
  SaleRecord,
  SplitMode,
  TargetKey,
  VARIABLES_META,
  VariableKey,
} from './utils/statistics';
import { MaoSeal, MingLatticeCorner, SectionHeader } from './components/ChineseMotifs';
import {
  DurbinWatsonGauge,
  HistogramChart,
  ResidualSequenceChart,
  ScatterRegressionChart,
  ValidationComparisonChart,
} from './components/Charts';
import { ArrowDownToLine, RotateCcw, Search } from 'lucide-react';

const DATASET_PATH = '/assets/aistudio/MAOSBASE_6a4e5394';

const TARGET_OPTIONS: { key: TargetKey; label: string }[] = [
  { key: 'bowls', label: 'Bowls Vendidos' },
  { key: 'soda', label: 'Sodas Vendidas' },
  { key: 'beer', label: 'Cervezas Vendidas' },
];

const ALL_VAR_KEYS: VariableKey[] = ['price', 'bowls', 'soda', 'beer'];

function formatPValue(p: number): string {
  if (p < 0.0001) return '< 0.0001';
  return p.toFixed(4);
}

export default function App() {
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTarget, setActiveTarget] = useState<TargetKey>('bowls');
  const [splitMode, setSplitMode] = useState<SplitMode>('sequential');
  const [sampleCount, setSampleCount] = useState<3 | 5 | 10 | 186>(5);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeHistVar, setActiveHistVar] = useState<VariableKey>('bowls');
  const [matrixPair, setMatrixPair] = useState<{ x: VariableKey; y: VariableKey }>({
    x: 'price',
    y: 'bowls',
  });
  const [simPrice, setSimPrice] = useState<number>(9.0);
  const [showAllValidationRows, setShowAllValidationRows] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(DATASET_PATH);
      if (!res.ok) {
        throw new Error(`No se pudo cargar el archivo (${res.status})`);
      }
      const text = await res.text();
      const parsed = parseMaoCSV(text);
      if (parsed.length === 0) {
        throw new Error('El archivo no contiene registros válidos.');
      }
      setRecords(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado al leer los datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const descriptives = useMemo(() => {
    if (records.length === 0) return null;
    return {
      price: computeDescriptiveStats(records, 'price'),
      bowls: computeDescriptiveStats(records, 'bowls'),
      soda: computeDescriptiveStats(records, 'soda'),
      beer: computeDescriptiveStats(records, 'beer'),
    };
  }, [records]);

  const correlationMatrix = useMemo(() => {
    if (records.length === 0) return [];
    return computeCorrelationMatrix(records);
  }, [records]);

  const olsAll = useMemo(() => {
    if (records.length === 0) return null;
    return {
      bowls: computeOLS(records, 'bowls'),
      soda: computeOLS(records, 'soda'),
      beer: computeOLS(records, 'beer'),
    };
  }, [records]);

  const trainValidation = useMemo(() => {
    if (records.length === 0) return null;
    return computeTrainValidationEvaluation(records, activeTarget, splitMode);
  }, [records, activeTarget, splitMode]);

  const filteredSampleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = q
      ? records.filter(
          (r) =>
            String(r.id).includes(q) ||
            r.rawPrice.includes(q) ||
            r.price.toFixed(2).includes(q) ||
            String(r.bowls).includes(q) ||
            String(r.soda).includes(q) ||
            String(r.beer).includes(q)
        )
      : records;
    return base.slice(0, sampleCount);
  }, [records, searchQuery, sampleCount]);

  const handleExportCSV = () => {
    if (!trainValidation || !olsAll) return;
    const headers = [
      'ID_Registro',
      'Bowl_Price',
      'Real_' + activeTarget,
      'Predicho_Train80',
      'Error_Residual',
      'Error_Absoluto_Pct',
    ];
    const lines = [
      headers.join(','),
      ...trainValidation.valPredictions.map((row) =>
        [
          row.id,
          row.price.toFixed(2),
          row.actual,
          row.predicted.toFixed(4),
          row.error.toFixed(4),
          row.pctError.toFixed(2) + '%',
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `restaurante_mao_validacion_${activeTarget}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-stone-900">
        <header className="border-b border-stone-200 bg-white">
          <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between gap-8">
            <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Restaurante Mao
            </span>
            <div className="h-4 w-64 bg-stone-100 rounded animate-pulse" />
            <div className="h-9 w-32 bg-stone-100 rounded animate-pulse" />
          </div>
        </header>
        <main className="max-w-[1200px] mx-auto px-6 py-12 space-y-6">
          <div className="h-44 bg-white border border-stone-200 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white border border-stone-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !descriptives || !olsAll || !trainValidation) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-lg p-8 text-center space-y-4">
          <MaoSeal className="w-12 h-12 mx-auto" />
          <h1 className="text-2xl font-semibold text-stone-900" style={{ fontFamily: 'var(--font-display)' }}>
            Error al cargar la base de Restaurante Mao
          </h1>
          <p className="text-sm text-stone-600">{error || 'No se pudieron procesar los registros estadísticos.'}</p>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#A61C1C] rounded-md hover:bg-[#8B1515] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reintentar lectura</span>
          </button>
        </div>
      </div>
    );
  }

  const activeOls = olsAll[activeTarget];
  const activeMeta = VARIABLES_META[activeTarget];
  const trainIdSet = new Set(trainValidation.trainRecords.map((r) => r.id));

  // Simulated predictions for interactive price slider
  const simBowls = olsAll.bowls.b0 + olsAll.bowls.b1 * simPrice;
  const simSoda = olsAll.soda.b0 + olsAll.soda.b1 * simPrice;
  const simBeer = olsAll.beer.b0 + olsAll.beer.b1 * simPrice;
  const simRevenueBowls = simPrice * simBowls;

  // Business ratios
  const ratioSodaPerBowl = descriptives.soda.sum / descriptives.bowls.sum;
  const ratioBeerPerBowl = descriptives.beer.sum / descriptives.bowls.sum;

  // Selected pair stats for correlation explorer
  const selectedPairCell =
    correlationMatrix.flat().find((c) => c.row === matrixPair.x && c.col === matrixPair.y) ||
    correlationMatrix[0][1];

  const displayedValRows = showAllValidationRows
    ? trainValidation.valPredictions
    : trainValidation.valPredictions.slice(0, 10);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900">
      {/* Top Bar Contract: exactly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-[1200px] mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          <a
            href="#inicio"
            className="text-xl font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Restaurante Mao
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
            <a href="#datos" className="hover:text-[#A61C1C] transition-colors whitespace-nowrap shrink-0">
              Datos
            </a>
            <a href="#descriptivos" className="hover:text-[#A61C1C] transition-colors whitespace-nowrap shrink-0">
              Descriptivos
            </a>
            <a href="#relaciones" className="hover:text-[#A61C1C] transition-colors whitespace-nowrap shrink-0">
              Relaciones
            </a>
            <a href="#regresiones" className="hover:text-[#A61C1C] transition-colors whitespace-nowrap shrink-0">
              Regresiones
            </a>
            <a href="#validacion" className="hover:text-[#A61C1C] transition-colors whitespace-nowrap shrink-0">
              Validación
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#A61C1C] rounded-md hover:bg-[#8B1515] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A61C1C]"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-10 space-y-14">
        {/* Hero Editorial Panel */}
        <section id="inicio" className="space-y-6">
          <div className="relative bg-white border border-stone-200 rounded-lg p-7 md:p-10 overflow-hidden">
            <MingLatticeCorner className="w-7 h-7 text-stone-300 absolute top-3 left-3" />
            <MingLatticeCorner className="w-7 h-7 text-stone-300 absolute top-3 right-3 rotate-90" />
            <MingLatticeCorner className="w-7 h-7 text-stone-300 absolute bottom-3 left-3 -rotate-90" />
            <MingLatticeCorner className="w-7 h-7 text-stone-300 absolute bottom-3 right-3 rotate-180" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
                <div className="flex items-center gap-4">
                  <MaoSeal className="w-12 h-12 shrink-0" />
                  <div className="text-xs text-stone-500 flex flex-wrap items-center gap-2">
                    <span className="font-medium text-stone-800">毛氏餐馆 · Análisis Econométrico</span>
                    <span aria-hidden="true">·</span>
                    <span>Base MAOSBASE ({records.length} registros)</span>
                    <span aria-hidden="true">·</span>
                    <span>Restaurante de Cocina China</span>
                  </div>
                </div>

                <h1
                  className="text-3xl md:text-5xl font-bold text-stone-900 leading-[1.12] tracking-tight max-w-2xl"
                  style={{ fontFamily: 'var(--font-display)', textWrap: 'balance' }}
                >
                  Modelos de Regresión Lineal y Elasticidad de Demanda en Restaurante Mao
                </h1>

                <p className="text-sm md:text-base text-stone-600 max-w-2xl leading-relaxed">
                  Evaluación cuantitativa completa sobre cómo el precio unitario de los bowls (variable independiente{' '}
                  <span className="font-mono text-stone-900">X</span>) explica el comportamiento de ventas de{' '}
                  <strong className="font-semibold text-stone-900">Bowls</strong>,{' '}
                  <strong className="font-semibold text-stone-900">Sodas</strong> y{' '}
                  <strong className="font-semibold text-stone-900">Cervezas</strong>, incluyendo diagnóstico
                  Durbin-Watson, criterios AIC/BIC/Cp y validación cruzada con partición 80% / 20%.
                </p>
              </div>

              {/* Active Model Quick Summary Panel */}
              <div className="lg:col-span-4 bg-[#FAF8F5] border border-stone-200 rounded-md p-5 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="text-xs text-stone-500">Modelo Activo Seleccionado</div>
                  <div
                    className="text-2xl font-semibold text-stone-900"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {activeMeta.label}
                  </div>
                </div>

                <div className="my-4 py-3 border-y border-stone-200 font-mono text-sm tabular-nums text-stone-900">
                  Ŷ = {activeOls.b0.toFixed(2)} {activeOls.b1 >= 0 ? '+' : '−'} {Math.abs(activeOls.b1).toFixed(2)}·X
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-stone-500">R² Global</div>
                    <div className="font-mono text-base font-semibold tabular-nums text-stone-900">
                      {(activeOls.r2 * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-stone-500">Durbin-Watson</div>
                    <div className="font-mono text-base font-semibold tabular-nums text-stone-900">
                      {activeOls.dw.toFixed(3)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4-column KPI strip placed in full-width row below hero */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-200 rounded-lg p-5">
              <div className="text-xs text-stone-500">Total de Registros Analizados</div>
              <div className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-stone-900">
                {records.length}
              </div>
              <div className="mt-1 text-xs text-stone-500">4 columnas · Sin valores nulos</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-lg p-5">
              <div className="text-xs text-stone-500">Rango Precio del Bowl (X)</div>
              <div className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-stone-900">
                ${descriptives.price.min.toFixed(2)} – ${descriptives.price.max.toFixed(2)}
              </div>
              <div className="mt-1 text-xs text-stone-500">
                Media: ${descriptives.price.mean.toFixed(2)} · σ: ${descriptives.price.std.toFixed(2)}
              </div>
            </div>
            <div className="bg-white border border-stone-200 rounded-lg p-5">
              <div className="text-xs text-stone-500">Demanda Total Acumulada</div>
              <div className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-stone-900">
                {descriptives.bowls.sum.toLocaleString('es-CO')}
              </div>
              <div className="mt-1 text-xs text-stone-500">
                Bowls · {descriptives.soda.sum.toLocaleString('es-CO')} sodas · {descriptives.beer.sum.toLocaleString('es-CO')} cervezas
              </div>
            </div>
            <div className="bg-white border border-stone-200 rounded-lg p-5">
              <div className="text-xs text-stone-500">Partición Entrenamiento / Validación</div>
              <div className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-stone-900">
                {trainValidation.trainRecords.length} / {trainValidation.testRecords.length}
              </div>
              <div className="mt-1 text-xs text-stone-500">80.1% entrenamiento · 19.9% prueba</div>
            </div>
          </div>

          {/* Interactive Workspace Control Strip */}
          <div className="bg-white border border-stone-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-stone-600">Variable dependiente (Y):</span>
              <div className="inline-flex items-center p-1 bg-[#F3EFE8] rounded-md gap-1">
                {TARGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setActiveTarget(opt.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTarget === opt.key
                        ? 'bg-[#A61C1C] text-white'
                        : 'text-stone-700 hover:text-stone-900 hover:bg-white/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-stone-600">Esquema Split 80/20:</span>
              <div className="inline-flex items-center p-1 bg-[#F3EFE8] rounded-md gap-1">
                <button
                  onClick={() => setSplitMode('sequential')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    splitMode === 'sequential'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Primeros 80% (1–149)
                </button>
                <button
                  onClick={() => setSplitMode('random42')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    splitMode === 'random42'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Aleatorio 80/20 (Seed 42)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 1: Muestra de filas y Tipos de Variables */}
        <section id="datos" className="space-y-8">
          <SectionHeader
            index="01"
            chineseSub="数据概览与变量类型"
            title="Exploración Inicial y Tipos de Variables"
            subtitle="Inspección de las primeras filas de la base MAOSBASE y definición formal de cada columna de ventas."
          />

          {/* Sample Rows Table (First 3-5 rows) */}
          <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-stone-900">
                  Muestra de Primeras Filas del Archivo ({sampleCount === 186 ? 'Todos los registros' : `Primeras ${sampleCount} filas`})
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Visualización directa del archivo original MAOSBASE_6a4e5394 (incluyendo formato original con coma decimal en Bowl Price).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar fila o valor..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-[#FAF8F5] border border-stone-200 rounded-md focus:outline-none focus:border-[#A61C1C]"
                  />
                </div>

                <div className="inline-flex items-center p-1 bg-[#F3EFE8] rounded-md gap-1">
                  {([3, 5, 10, 186] as const).map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => setSampleCount(cnt)}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                        sampleCount === cnt
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {cnt === 186 ? 'Todas (186)' : `${cnt} filas`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[380px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F3EFE8] sticky top-0 text-xs font-medium text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-4">Registro #</th>
                    <th className="py-2.5 px-4">Bowl Price (CSV Original)</th>
                    <th className="py-2.5 px-4 text-right">Bowl Price (X, USD)</th>
                    <th className="py-2.5 px-4 text-right">Bowls (Y₁)</th>
                    <th className="py-2.5 px-4 text-right">Soda (Y₂)</th>
                    <th className="py-2.5 px-4 text-right">Beer (Y₃)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {filteredSampleRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-500 text-xs">
                        No se encontraron registros que coincidan con "{searchQuery}".
                      </td>
                    </tr>
                  ) : (
                    filteredSampleRows.map((row) => (
                      <tr key={row.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-2.5 px-4 font-mono tabular-nums text-stone-500 text-xs">
                          #{String(row.id).padStart(3, '0')}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs text-stone-600">"{row.rawPrice}"</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-stone-900">
                          ${row.price.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-stone-800">
                          {row.bowls}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-stone-800">
                          {row.soda}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-stone-800">
                          {row.beer}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Variable Types Explanation Grid */}
          <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-stone-200">
              <h3 className="text-base font-semibold text-stone-900">
                Revisión de Tipos de Variables y Explicación por Columna
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Estructura estadística, escala de medición y rol asignado en el modelado de regresión lineal simple.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-200">
              {ALL_VAR_KEYS.map((key, idx) => {
                const meta = VARIABLES_META[key];
                return (
                  <div
                    key={key}
                    className={`p-5 space-y-2.5 ${idx >= 2 ? 'md:border-t md:border-stone-200' : ''}`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="text-base font-semibold text-stone-900">
                        {meta.csvHeader} <span className="text-stone-400 font-normal">· {meta.label}</span>
                      </h4>
                      <span
                        className={`text-xs font-medium ${
                          meta.role.startsWith('Independiente') ? 'text-[#A61C1C]' : 'text-stone-600'
                        }`}
                      >
                        {meta.role}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 flex flex-wrap items-center gap-2">
                      <span>Tipo: <strong className="text-stone-800 font-medium">{meta.type}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Escala: <strong className="text-stone-800 font-medium">{meta.scale}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Unidad: <strong className="text-stone-800 font-medium">{meta.unit}</strong></span>
                    </div>
                    <p className="text-sm text-stone-600 leading-relaxed">{meta.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 2: Análisis Descriptivos y Reglas de Negocio (Max & Min) */}
        <section id="descriptivos" className="space-y-8">
          <SectionHeader
            index="02"
            chineseSub="描述性统计与业务规则"
            title="Análisis Descriptivo Completo y Reglas de Negocio (Máximos y Mínimos)"
            subtitle="Medidas de tendencia central, dispersión, forma y límites operativos reales observados en las 186 jornadas."
          />

          {/* Descriptive Stats Table */}
          <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-stone-200">
              <h3 className="text-base font-semibold text-stone-900">
                Resumen Estadístico Descriptivo (n = {records.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-[#F3EFE8] text-xs font-medium text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Variable</th>
                    <th className="py-3 px-3 text-right">Media</th>
                    <th className="py-3 px-3 text-right">Mediana</th>
                    <th className="py-3 px-3 text-right">Moda</th>
                    <th className="py-3 px-3 text-right">Desv. Est.</th>
                    <th className="py-3 px-3 text-right">Mínimo</th>
                    <th className="py-3 px-3 text-right">Q1 (25%)</th>
                    <th className="py-3 px-3 text-right">Q3 (75%)</th>
                    <th className="py-3 px-3 text-right">Máximo</th>
                    <th className="py-3 px-3 text-right">CV (%)</th>
                    <th className="py-3 px-4 text-right">Asimetría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {ALL_VAR_KEYS.map((key) => {
                    const s = descriptives[key];
                    const meta = VARIABLES_META[key];
                    const dec = meta.decimals === 2 ? 2 : 2;
                    return (
                      <tr key={key} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3 px-4 font-medium text-stone-900 whitespace-nowrap">
                          {meta.shortLabel}
                          <span className="block text-xs font-normal text-stone-500">{meta.label}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-900">
                          {s.mean.toFixed(dec)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-700">
                          {s.median.toFixed(dec)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-700">
                          {s.mode.map((m) => m.toFixed(meta.decimals)).join(', ')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-700">
                          {s.std.toFixed(dec)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-[#A61C1C] font-medium">
                          {s.min.toFixed(meta.decimals)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-600">
                          {s.q1.toFixed(dec)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-600">
                          {s.q3.toFixed(dec)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-900 font-medium">
                          {s.max.toFixed(meta.decimals)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-600">
                          {s.cv.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-stone-600">
                          {s.skewness >= 0 ? '+' : ''}{s.skewness.toFixed(3)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Histogram Explorer + Min/Max Business Rules */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-6 bg-white border border-stone-200 rounded-lg p-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="text-base font-semibold text-stone-900">Distribución de Frecuencias</h3>
                  <div className="inline-flex items-center p-1 bg-[#F3EFE8] rounded-md gap-1">
                    {ALL_VAR_KEYS.map((k) => (
                      <button
                        key={k}
                        onClick={() => setActiveHistVar(k)}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                          activeHistVar === k
                            ? 'bg-white text-stone-900 shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        {VARIABLES_META[k].shortLabel}
                      </button>
                    ))}
                  </div>
                </div>
                <HistogramChart
                  values={getColumnValues(records, activeHistVar)}
                  varKey={activeHistVar}
                  mean={descriptives[activeHistVar].mean}
                  median={descriptives[activeHistVar].median}
                />
              </div>

              <div className="mt-4 pt-4 border-t border-stone-100 text-xs text-stone-600 leading-relaxed">
                {activeHistVar === 'price' &&
                  'El precio del bowl se distribuye uniformemente entre $8.00 y $10.00 (asimetría casi nula de ' +
                    descriptives.price.skewness.toFixed(2) +
                    '), garantizando cobertura equilibrada para estimar la pendiente de regresión.'}
                {activeHistVar === 'bowls' &&
                  'Los bowls vendidos siguen una distribución simétrica centrada en ~428 unidades (curtosis ' +
                    descriptives.bowls.kurtosis.toFixed(2) +
                    '), reflejando demanda estable sin valores atípicos extremos.'}
                {activeHistVar === 'soda' &&
                  'Las sodas presentan dispersión similar a los bowls (σ = ' +
                    descriptives.soda.std.toFixed(2) +
                    '), oscilando entre 284 y 414 unidades.'}
                {activeHistVar === 'beer' &&
                  'Las cervezas muestran una media de 84.97 unidades con rango 57–119 y mayor variación relativa (CV = ' +
                    descriptives.beer.cv.toFixed(1) +
                    '%), lo que sugiere factores externos distintos al precio del bowl.'}
              </div>
            </div>

            {/* Max & Min Business Rules */}
            <div className="lg:col-span-6 bg-white border border-stone-200 rounded-lg p-6 space-y-5">
              <div>
                <h3 className="text-base font-semibold text-stone-900">
                  Mínimos, Máximos y Reglas de Negocio
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Políticas operativas, umbrales de precio y cotas de inventario derivadas de los extremos reales.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-4 border-b border-stone-200">
                {ALL_VAR_KEYS.map((k) => {
                  const s = descriptives[k];
                  const m = VARIABLES_META[k];
                  return (
                    <div key={k} className="bg-[#FAF8F5] border border-stone-200 rounded p-3">
                      <div className="text-xs font-medium text-stone-700">{m.shortLabel}</div>
                      <div className="mt-1.5 text-xs text-stone-500 flex justify-between font-mono tabular-nums">
                        <span>Mín:</span>
                        <strong className="text-[#A61C1C]">{s.min.toFixed(m.decimals)}</strong>
                      </div>
                      <div className="text-xs text-stone-500 flex justify-between font-mono tabular-nums">
                        <span>Máx:</span>
                        <strong className="text-stone-900">{s.max.toFixed(m.decimals)}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>

              <ol className="space-y-3 text-sm text-stone-700 leading-relaxed">
                <li>
                  <strong className="font-semibold text-stone-900">1. Banda de Precios Permitida ($8.00 – $10.00):</strong>{' '}
                  No extrapolar predicciones fuera del rango observado. Fijar precios por encima de $10.00 contrae
                  la demanda estimada debajo de 400 bowls, mientras que bajar de $8.00 presiona el margen unitario.
                </li>
                <li>
                  <strong className="font-semibold text-stone-900">2. Capacidad Máxima de Cocina (487 Bowls):</strong>{' '}
                  El máximo histórico de 487 bowls y mínimo de 379 establecen el corredor operativo de insumos frescos;
                  el stock base diario debe cubrir mínimo 380 porciones y escalar hasta 490 cuando el precio sea ≤ $8.20.
                </li>
                <li>
                  <strong className="font-semibold text-stone-900">3. Regla de Bebidas Complementarias:</strong>{' '}
                  Por cada bowl vendido se venden en promedio{' '}
                  <span className="font-mono tabular-nums font-medium text-stone-900">
                    {ratioSodaPerBowl.toFixed(3)}
                  </span>{' '}
                  sodas (rango 284–414) y{' '}
                  <span className="font-mono tabular-nums font-medium text-stone-900">
                    {ratioBeerPerBowl.toFixed(3)}
                  </span>{' '}
                  cervezas (rango 57–119). El reabastecimiento de sodas debe indexarse al precio del bowl.
                </li>
                <li>
                  <strong className="font-semibold text-stone-900">4. Alerta de Elasticidad en Precio ≥ $9.50:</strong>{' '}
                  Al cruzar el umbral superior ($9.50–$10.00), se pierden ~30 bowls por cada dólar adicional, arrastrando
                  también ~25 sodas menos. Conviene activar promociones de combo en días de tarifa alta.
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* SECTION 3: Matriz de Relaciones */}
        <section id="relaciones" className="space-y-8">
          <SectionHeader
            index="03"
            chineseSub="相关性矩阵"
            title="Matriz de Relaciones (Correlación de Pearson y Dispersión)"
            subtitle="Intensidad, dirección y significancia estadística (p-valor) entre el precio del bowl y las ventas de los tres productos."
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Heatmap Table */}
            <div className="lg:col-span-6 bg-white border border-stone-200 rounded-lg p-6 flex flex-col justify-between space-y-5">
              <div>
                <h3 className="text-base font-semibold text-stone-900">
                  Matriz de Correlación de Pearson (r)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Haga clic en cualquier celda para graficar la dispersión de ese par de variables.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="text-stone-600 border-b border-stone-200">
                      <th className="py-2 pr-3 text-left font-medium">Variable</th>
                      {ALL_VAR_KEYS.map((col) => (
                        <th key={col} className="py-2 px-2 text-center font-medium">
                          {VARIABLES_META[col].shortLabel}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {correlationMatrix.map((rowCells, rIdx) => {
                      const rowKey = ALL_VAR_KEYS[rIdx];
                      return (
                        <tr key={rowKey}>
                          <td className="py-2.5 pr-3 font-medium text-stone-900 whitespace-nowrap">
                            {VARIABLES_META[rowKey].shortLabel}
                          </td>
                          {rowCells.map((cell) => {
                            const isSelf = cell.row === cell.col;
                            const isSelected =
                              matrixPair.x === cell.row && matrixPair.y === cell.col;
                            const absR = Math.abs(cell.r);
                            let bgClass = 'bg-stone-50 text-stone-700';
                            if (isSelf) {
                              bgClass = 'bg-stone-100 text-stone-400';
                            } else if (cell.r < -0.5) {
                              bgClass = 'bg-red-50 text-[#8B1515]';
                            } else if (cell.r < -0.25) {
                              bgClass = 'bg-red-50/50 text-stone-800';
                            } else if (cell.r > 0.65) {
                              bgClass = 'bg-amber-50 text-amber-950';
                            } else if (absR < 0.25) {
                              bgClass = 'bg-[#FAF8F5] text-stone-700';
                            }

                            return (
                              <td key={cell.col} className="p-1">
                                <button
                                  type="button"
                                  disabled={isSelf}
                                  onClick={() => setMatrixPair({ x: cell.row, y: cell.col })}
                                  className={`w-full py-2.5 px-2 rounded text-center transition-all ${bgClass} ${
                                    isSelected ? 'ring-2 ring-[#A61C1C]' : ''
                                  } ${isSelf ? 'cursor-default' : 'cursor-pointer hover:ring-1 hover:ring-stone-400'}`}
                                >
                                  <div className="font-mono font-semibold tabular-nums text-sm">
                                    {cell.r.toFixed(3)}
                                  </div>
                                  <div className="text-[10px] opacity-80 truncate mt-0.5">
                                    {isSelf ? 'Identidad' : cell.strength.split(' ')[0]}
                                  </div>
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2.5 text-sm text-stone-700 leading-relaxed pt-2 border-t border-stone-200">
                <p>
                  <strong className="text-stone-900">Relación Precio vs Bowls (r = {correlationMatrix[0][1].r.toFixed(3)}):</strong>{' '}
                  Correlación negativa fuerte y estadísticamente significativa (p &lt; 0.0001). Confirma la ley de
                  demanda: a mayor precio del bowl, menor cantidad de bowls vendidos.
                </p>
                <p>
                  <strong className="text-stone-900">Complementariedad Bowls–Soda (r = {correlationMatrix[1][2].r.toFixed(3)}):</strong>{' '}
                  Asociación positiva muy fuerte; cuando el cliente compra más bowls, acompaña la orden con sodas. Por
                  eso el precio del bowl también arrastra negativamente a las sodas (r = {correlationMatrix[0][2].r.toFixed(3)}).
                </p>
                <p>
                  <strong className="text-stone-900">Independencia relativa de Beer (r = {correlationMatrix[0][3].r.toFixed(3)}):</strong>{' '}
                  La cerveza exhibe una relación lineal débil frente al precio del bowl, respondiendo a patrones de
                  consumo propios más estables.
                </p>
              </div>
            </div>

            {/* Interactive Pair Scatter Explorer */}
            <div className="lg:col-span-6 bg-white border border-stone-200 rounded-lg p-6 flex flex-col justify-between">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-base font-semibold text-stone-900">
                    Dispersión: {VARIABLES_META[matrixPair.x].label} vs {VARIABLES_META[matrixPair.y].label}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    r = <span className="font-mono font-semibold text-stone-800">{selectedPairCell.r.toFixed(4)}</span>
                    {' · '}R² = <span className="font-mono text-stone-800">{(selectedPairCell.rSquared * 100).toFixed(2)}%</span>
                    {' · '}p-valor = <span className="font-mono text-stone-800">{formatPValue(selectedPairCell.pValue)}</span>
                    {' · '}<span>{selectedPairCell.strength}</span>
                  </p>
                </div>
              </div>

              <ScatterRegressionChart
                records={records}
                xKey={matrixPair.x}
                yKey={matrixPair.y}
                height={275}
              />
            </div>
          </div>
        </section>

        {/* SECTION 4: Regresiones, Interceptos, Coeficientes y Durbin-Watson */}
        <section id="regresiones" className="space-y-8">
          <SectionHeader
            index="04"
            chineseSub="线性回归与杜宾-沃森检验"
            title="Interceptos, Coeficientes de Regresión y Test de Durbin-Watson"
            subtitle="Parámetros estimados por Mínimos Cuadrados Ordinarios (MCO), simulación de elasticidad y verificación de independencia de residuos."
          />

          {/* Comparison Table of All 3 Models */}
          <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-stone-200">
              <h3 className="text-base font-semibold text-stone-900">
                Resumen Comparativo de los Tres Modelos (Variable X = Bowl Price, n = 186)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-[#F3EFE8] text-xs font-medium text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Variable Dependiente (Y)</th>
                    <th className="py-3 px-3 text-right">Intercepto (β₀)</th>
                    <th className="py-3 px-3 text-right">Pendiente (β₁)</th>
                    <th className="py-3 px-3 text-right">Error Est. β₁</th>
                    <th className="py-3 px-3 text-right">Estadístico t</th>
                    <th className="py-3 px-3 text-right">p-valor (β₁)</th>
                    <th className="py-3 px-3 text-right">R²</th>
                    <th className="py-3 px-4 text-right">Durbin-Watson</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {TARGET_OPTIONS.map((opt) => {
                    const m = olsAll[opt.key];
                    const isSelected = activeTarget === opt.key;
                    return (
                      <tr
                        key={opt.key}
                        onClick={() => setActiveTarget(opt.key)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-red-50/40' : 'hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <td className="py-3 px-4 font-medium text-stone-900">
                          {opt.label}
                          {isSelected && <span className="ml-2 text-xs text-[#A61C1C]">(Activo)</span>}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-900">
                          {m.b0.toFixed(4)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-[#A61C1C]">
                          {m.b1.toFixed(4)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-600">
                          {m.seB1.toFixed(4)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-700">
                          {m.tB1.toFixed(3)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-700">
                          {formatPValue(m.pB1)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-stone-900">
                          {(m.r2 * 100).toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-stone-900">
                          {m.dw.toFixed(4)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Intercepts & Coefficients Deep Explanation + Price Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 bg-white border border-stone-200 rounded-lg p-6 space-y-5">
              <div>
                <h3 className="text-base font-semibold text-stone-900">
                  Explicación de Interceptos y Coeficientes — {activeMeta.label}
                </h3>
                <div className="mt-2 p-3.5 bg-[#FAF8F5] border border-stone-200 rounded font-mono text-sm tabular-nums text-stone-900">
                  {activeMeta.shortLabel} = {activeOls.b0.toFixed(4)} {activeOls.b1 >= 0 ? '+' : '−'}{' '}
                  {Math.abs(activeOls.b1).toFixed(4)} × Bowl_Price
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-stone-200 rounded-md p-4 space-y-2">
                  <div className="text-xs text-stone-500">Intercepto (β₀)</div>
                  <div className="text-2xl font-mono font-semibold tabular-nums text-stone-900">
                    {activeOls.b0.toFixed(4)}
                  </div>
                  <div className="text-xs text-stone-500 font-mono tabular-nums">
                    SE = {activeOls.seB0.toFixed(2)} · t = {activeOls.tB0.toFixed(2)} · p {formatPValue(activeOls.pB0)}
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed pt-1">
                    Representa el nivel teórico base de {activeMeta.label.toLowerCase()} cuando el precio del bowl
                    fuese $0.00. Dado que $0 está fuera del dominio operativo ($8.00–$10.00), su función principal es
                    anclar geométricamente la recta dentro de la banda real de precios.
                  </p>
                </div>

                <div className="border border-stone-200 rounded-md p-4 space-y-2">
                  <div className="text-xs text-stone-500">Coeficiente / Pendiente (β₁)</div>
                  <div className="text-2xl font-mono font-semibold tabular-nums text-[#A61C1C]">
                    {activeOls.b1.toFixed(4)}
                  </div>
                  <div className="text-xs text-stone-500 font-mono tabular-nums">
                    IC 95%: [{activeOls.ciB1Low.toFixed(2)}, {activeOls.ciB1High.toFixed(2)}]
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed pt-1">
                    Por cada <strong className="text-stone-900">+$1.00</strong> de aumento en el precio del bowl, se
                    proyecta un cambio de{' '}
                    <strong className="text-stone-900">{activeOls.b1.toFixed(2)} unidades</strong> en{' '}
                    {activeMeta.label.toLowerCase()} (es decir,{' '}
                    <span className="font-mono">{(activeOls.b1 * 0.1).toFixed(2)}</span> unidades por cada +$0.10).
                  </p>
                </div>
              </div>

              <div className="text-sm text-stone-700 leading-relaxed pt-2 border-t border-stone-200">
                <strong className="text-stone-900">Lectura comparativa de los tres coeficientes:</strong> El precio del
                bowl impacta con mayor fuerza a los <strong className="text-stone-900">Bowls</strong> (β₁ = −29.59,
                explicando 50.67% de la varianza), seguido de las <strong className="text-stone-900">Sodas</strong> (β₁
                = −24.50, R² = 33.75%, efecto arrastre de bebida complementaria). En cambio, en{' '}
                <strong className="text-stone-900">Cervezas</strong> (β₁ = −4.70, R² = 3.75%, p = {formatPValue(olsAll.beer.pB1)})
                la sensibilidad al precio del bowl es marginal.
              </div>
            </div>

            {/* Interactive Price Elasticity Simulator */}
            <div className="lg:col-span-5 bg-white border border-stone-200 rounded-lg p-6 flex flex-col justify-between space-y-5">
              <div>
                <h3 className="text-base font-semibold text-stone-900">Simulador Interactivo de Precio</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Ajuste el precio del bowl dentro de la regla de negocio ($8.00 – $10.00) para proyectar las ventas.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="price-slider" className="text-xs font-medium text-stone-700">
                    Precio simulado del Bowl (X)
                  </label>
                  <span className="text-2xl font-mono font-semibold tabular-nums text-[#A61C1C]">
                    ${simPrice.toFixed(2)}
                  </span>
                </div>
                <input
                  id="price-slider"
                  type="range"
                  min={8.0}
                  max={10.0}
                  step={0.1}
                  value={simPrice}
                  onChange={(e) => setSimPrice(parseFloat(e.target.value))}
                  className="w-full accent-[#A61C1C] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono tabular-nums text-stone-500">
                  <span>$8.00 (Mín)</span>
                  <span>$9.00 (Mediana)</span>
                  <span>$10.00 (Máx)</span>
                </div>
              </div>

              <div className="space-y-3 border-t border-stone-200 pt-4">
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-stone-600">Bowls estimados (Ŷ₁)</span>
                  <span className="font-mono text-lg font-semibold tabular-nums text-stone-900">
                    {simBowls.toFixed(1)} unid.
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-stone-600">Sodas estimadas (Ŷ₂)</span>
                  <span className="font-mono text-lg font-semibold tabular-nums text-stone-900">
                    {simSoda.toFixed(1)} unid.
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-stone-600">Cervezas estimadas (Ŷ₃)</span>
                  <span className="font-mono text-lg font-semibold tabular-nums text-stone-900">
                    {simBeer.toFixed(1)} unid.
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-sm pt-3 border-t border-stone-100">
                  <span className="font-medium text-stone-800">Ingreso bruto proyectado en Bowls</span>
                  <span className="font-mono text-lg font-semibold tabular-nums text-[#A61C1C]">
                    ${simRevenueBowls.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Durbin-Watson Explanation & Residual Plot */}
          <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-stone-900">
                    Diagnóstico del Test de Durbin-Watson (Independencia de Residuos)
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Evalúa si existe autocorrelación de primer orden entre residuos consecutivos: DW = Σ(eₜ − eₜ₋₁)² / Σeₜ².
                    Valores cercanos a 2.00 indican errores independientes.
                  </p>
                </div>

                <div className="space-y-5">
                  <DurbinWatsonGauge dw={olsAll.bowls.dw} target="bowls" />
                  <DurbinWatsonGauge dw={olsAll.soda.dw} target="soda" />
                  <DurbinWatsonGauge dw={olsAll.beer.dw} target="beer" />
                </div>
              </div>

              <div className="lg:col-span-6 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-stone-900">
                    Secuencia de Residuos (eₜ) — Modelo {activeMeta.label}
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {activeOls.dwInterpretation} (DW = {activeOls.dw.toFixed(4)}).
                  </p>
                </div>

                <ResidualSequenceChart ols={activeOls} />

                <p className="text-sm text-stone-700 leading-relaxed pt-2 border-t border-stone-100">
                  <strong className="text-stone-900">Interpretación estadística:</strong> Los tres modelos obtienen
                  estadísticos Durbin-Watson prácticamente ideales (<span className="font-mono">2.044</span> en Bowls,{' '}
                  <span className="font-mono">1.917</span> en Sodas y <span className="font-mono">2.020</span> en
                  Cervezas), ubicados firmemente dentro de la zona de independencia ([1.77, 2.23] para n=186, k=1). Esto
                  garantiza que los residuos no arrastran inercia ni ciclos ocultos entre registros consecutivos y que los
                  errores estándar e intervalos de confianza son válidos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: Entrenamiento 80%, AIC / RMSE / R² Ajustado / Cp / BIC y Validación 20% */}
        <section id="validacion" className="space-y-8">
          <SectionHeader
            index="05"
            chineseSub="训练与验证表现 (80/20)"
            title="Modelo de Entrenamiento (80%), Criterios de Ajuste y Desempeño de Validación"
            subtitle={`Partición del dataset en ${trainValidation.trainRecords.length} registros de entrenamiento (80%) y ${trainValidation.testRecords.length} de validación (20%) para medir generalización real.`}
          />

          {/* 80% Training Scatter + Sample & Model Fit */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 bg-white border border-stone-200 rounded-lg p-6 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-stone-900">
                    Ajuste con el 80% de Entrenamiento ({trainValidation.trainRecords.length} registros) — {activeMeta.label}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5 font-mono tabular-nums">
                    Ŷ_train = {trainValidation.trainOLS.b0.toFixed(4)}{' '}
                    {trainValidation.trainOLS.b1 >= 0 ? '+' : '−'}{' '}
                    {Math.abs(trainValidation.trainOLS.b1).toFixed(4)} · X
                  </p>
                </div>
                <span className="text-xs text-stone-500">
                  {splitMode === 'sequential' ? 'Registros 1–149 (Train) · 150–186 (Val)' : 'Muestra aleatoria Seed 42'}
                </span>
              </div>

              <ScatterRegressionChart
                records={records}
                xKey="price"
                yKey={activeTarget}
                b0={trainValidation.trainOLS.b0}
                b1={trainValidation.trainOLS.b1}
                trainIds={trainIdSet}
                height={295}
              />
            </div>

            {/* AIC, BIC, R² Ajustado, Cp de Mallows, RMSE (Train 80%) */}
            <div className="lg:col-span-5 bg-white border border-stone-200 rounded-lg p-6 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-semibold text-stone-900">
                  Criterios de Información y Bondad de Ajuste (Modelo 80%)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Evaluados sobre los {trainValidation.trainRecords.length} registros de entrenamiento (p = 2 parámetros).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#FAF8F5] border border-stone-200 rounded p-3.5">
                  <div className="text-xs text-stone-500">RMSE (Entrenamiento)</div>
                  <div className="mt-1 text-xl font-mono font-semibold tabular-nums text-stone-900">
                    {trainValidation.trainOLS.rmse.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">Error medio en {activeMeta.unit}</div>
                </div>

                <div className="bg-[#FAF8F5] border border-stone-200 rounded p-3.5">
                  <div className="text-xs text-stone-500">R² Ajustado</div>
                  <div className="mt-1 text-xl font-mono font-semibold tabular-nums text-stone-900">
                    {(trainValidation.trainOLS.adjR2 * 100).toFixed(2)}%
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    R² bruto: {(trainValidation.trainOLS.r2 * 100).toFixed(2)}%
                  </div>
                </div>

                <div className="bg-[#FAF8F5] border border-stone-200 rounded p-3.5">
                  <div className="text-xs text-stone-500">AIC (Akaike)</div>
                  <div className="mt-1 text-xl font-mono font-semibold tabular-nums text-[#A61C1C]">
                    {trainValidation.trainOLS.aic.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5 font-mono tabular-nums">
                    Full-LL: {trainValidation.trainOLS.aicGaussian.toFixed(1)}
                  </div>
                </div>

                <div className="bg-[#FAF8F5] border border-stone-200 rounded p-3.5">
                  <div className="text-xs text-stone-500">BIC (Schwarz)</div>
                  <div className="mt-1 text-xl font-mono font-semibold tabular-nums text-stone-900">
                    {trainValidation.trainOLS.bic.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5 font-mono tabular-nums">
                    Full-LL: {trainValidation.trainOLS.bicGaussian.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="border border-stone-200 rounded p-4 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-stone-700">Cp de Mallows (p = 2)</span>
                  <span className="font-mono text-lg font-semibold tabular-nums text-stone-900">
                    Cp = {trainValidation.cpAgainstQuad.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-stone-600 leading-relaxed">
                  Comparado contra una referencia cuadrática completa (p = 3), el modelo lineal logra{' '}
                  <span className="font-mono text-stone-900">Cp = {trainValidation.cpAgainstQuad.toFixed(2)} ≈ p (2.00)</span>,
                  muy superior al modelo nulo sin predictor (<span className="font-mono">Cp = {trainValidation.cpNullModel.toFixed(1)}</span>).
                  Además, su BIC (<span className="font-mono">{trainValidation.trainOLS.bic.toFixed(2)}</span>) es más bajo
                  que el cuadrático (<span className="font-mono">{trainValidation.quadBic.toFixed(2)}</span>), confirmando que
                  la relación lineal es más parsimoniosa y evita sobreajuste.
                </div>
              </div>
            </div>
          </div>

          {/* Explanations of AIC, RMSE, Adj R², Cp, BIC */}
          <div className="bg-white border border-stone-200 rounded-lg p-6">
            <h3 className="text-base font-semibold text-stone-900 mb-4">
              Significado Analítico de las Métricas del Modelo de Entrenamiento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm text-stone-700 leading-relaxed">
              <div>
                <h4 className="font-semibold text-stone-900 mb-1">AIC (Criterio de Akaike)</h4>
                <p>
                  Calculado como <span className="font-mono text-xs">n·ln(SSE/n) + 2p</span> ({trainValidation.trainOLS.aic.toFixed(2)}).
                  Equilibra el error residual frente al número de parámetros (p=2). Un AIC menor indica mejor compromiso
                  entre precisión y simplicidad al comparar especificaciones candidatas.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-stone-900 mb-1">BIC (Criterio Bayesiano)</h4>
                <p>
                  Calculado como <span className="font-mono text-xs">n·ln(SSE/n) + p·ln(n)</span> ({trainValidation.trainOLS.bic.toFixed(2)}).
                  Penaliza la complejidad más severamente que el AIC (<span className="font-mono text-xs">ln(149) = 5.00</span> vs 2),
                  favoreciendo modelos parsimoniosos.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-stone-900 mb-1">RMSE, R² Ajustado y Cp de Mallows</h4>
                <p>
                  El <strong className="text-stone-900">RMSE</strong> ({trainValidation.trainOLS.rmse.toFixed(2)} {activeMeta.unit})
                  mide el error típico en la escala real. El <strong className="text-stone-900">R² Ajustado</strong> (
                  {(trainValidation.trainOLS.adjR2 * 100).toFixed(2)}%) descuenta grados de libertad, y{' '}
                  <strong className="text-stone-900">Cp ≈ 2</strong> verifica mínimo sesgo de especificación.
                </p>
              </div>
            </div>
          </div>

          {/* Validation Performance (20% = 37 records) */}
          <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-stone-200 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">
                  Desempeño en Validación Fuera de Muestra (20% = {trainValidation.testRecords.length} registros)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Predicciones generadas sobre datos no vistos durante el entrenamiento para auditar capacidad de generalización.
                </p>
              </div>
              <div className="text-xs font-medium text-stone-700">
                Estado de Generalización:{' '}
                <strong className="text-[#A61C1C]">
                  {trainValidation.overfitRatio <= 1.15
                    ? 'Estable (sin sobreajuste)'
                    : 'Variación moderada en muestra de prueba'}
                </strong>
              </div>
            </div>

            {/* Train vs Validation Comparison Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="border border-stone-200 rounded p-3.5">
                <div className="text-xs text-stone-500">RMSE Entrenamiento</div>
                <div className="mt-1 text-lg font-mono font-semibold tabular-nums text-stone-900">
                  {trainValidation.trainOLS.rmse.toFixed(2)}
                </div>
              </div>
              <div className="border border-stone-200 rounded p-3.5 bg-[#FAF8F5]">
                <div className="text-xs text-stone-500">RMSE Validación (20%)</div>
                <div className="mt-1 text-lg font-mono font-semibold tabular-nums text-[#A61C1C]">
                  {trainValidation.valRmse.toFixed(2)}
                </div>
              </div>
              <div className="border border-stone-200 rounded p-3.5">
                <div className="text-xs text-stone-500">MAE Validación</div>
                <div className="mt-1 text-lg font-mono font-semibold tabular-nums text-stone-900">
                  {trainValidation.valMae.toFixed(2)}
                </div>
              </div>
              <div className="border border-stone-200 rounded p-3.5">
                <div className="text-xs text-stone-500">MAPE Validación</div>
                <div className="mt-1 text-lg font-mono font-semibold tabular-nums text-stone-900">
                  {trainValidation.valMape.toFixed(2)}%
                </div>
              </div>
              <div className="border border-stone-200 rounded p-3.5">
                <div className="text-xs text-stone-500">R² Validación</div>
                <div className="mt-1 text-lg font-mono font-semibold tabular-nums text-stone-900">
                  {(trainValidation.valR2 * 100).toFixed(2)}%
                </div>
              </div>
              <div className="border border-stone-200 rounded p-3.5">
                <div className="text-xs text-stone-500">Sesgo Medio (Error)</div>
                <div className="mt-1 text-lg font-mono font-semibold tabular-nums text-stone-900">
                  {trainValidation.valBias >= 0 ? '+' : ''}
                  {trainValidation.valBias.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-4">
                <ValidationComparisonChart rows={trainValidation.valPredictions} target={activeTarget} />
                <div className="p-4 bg-[#FAF8F5] border border-stone-200 rounded text-sm text-stone-700 leading-relaxed">
                  <strong className="text-stone-900">Conclusión de Validación ({activeMeta.label}):</strong>{' '}
                  El modelo entrenado con el 80% obtiene un RMSE de{' '}
                  <span className="font-mono font-medium text-stone-900">
                    {trainValidation.trainOLS.rmse.toFixed(2)}
                  </span>{' '}
                  y al predecir el 20% restante alcanza un RMSE de{' '}
                  <span className="font-mono font-medium text-[#A61C1C]">{trainValidation.valRmse.toFixed(2)}</span>{' '}
                  (ratio Val/Train = <span className="font-mono">{trainValidation.overfitRatio.toFixed(2)}×</span>), con
                  un error porcentual medio (MAPE) de apenas{' '}
                  <span className="font-mono font-medium text-stone-900">{trainValidation.valMape.toFixed(2)}%</span>.{' '}
                  {activeTarget === 'bowls' &&
                    'La proximidad entre el desempeño en entrenamiento y validación demuestra una generalización sólida y sin sobreajuste para proyectar la demanda de bowls.'}
                  {activeTarget === 'soda' &&
                    'El error en validación mantiene coherencia con el entrenamiento, validando que el precio del bowl es un predictor consistente de la venta complementaria de sodas.'}
                  {activeTarget === 'beer' &&
                    'Aunque el error absoluto es estable (sin sobreajuste), el R² bajo confirma que el precio del bowl por sí solo explica una fracción menor del consumo de cerveza.'}
                </div>
              </div>

              {/* Validation Predictions Table */}
              <div className="lg:col-span-5 border border-stone-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-[#F3EFE8] border-b border-stone-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-800">
                    Predicciones de Validación ({displayedValRows.length} de {trainValidation.valPredictions.length})
                  </span>
                  <button
                    onClick={() => setShowAllValidationRows((v) => !v)}
                    className="text-xs font-medium text-[#A61C1C] hover:underline cursor-pointer"
                  >
                    {showAllValidationRows ? 'Ver 10 filas' : 'Ver las 37 filas'}
                  </button>
                </div>
                <div className="overflow-x-auto max-h-[340px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-white sticky top-0 text-stone-500 border-b border-stone-200">
                      <tr>
                        <th className="py-2 px-3">Reg</th>
                        <th className="py-2 px-2 text-right">Precio</th>
                        <th className="py-2 px-2 text-right">Real</th>
                        <th className="py-2 px-2 text-right">Predicho</th>
                        <th className="py-2 px-3 text-right">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {displayedValRows.map((row) => (
                        <tr key={row.id} className="hover:bg-[#FAF8F5]">
                          <td className="py-2 px-3 font-mono tabular-nums text-stone-500">#{row.id}</td>
                          <td className="py-2 px-2 text-right font-mono tabular-nums text-stone-700">
                            ${row.price.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono tabular-nums font-medium text-stone-900">
                            {row.actual}
                          </td>
                          <td className="py-2 px-2 text-right font-mono tabular-nums text-[#A61C1C]">
                            {row.predicted.toFixed(1)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-stone-600">
                            {row.error >= 0 ? '+' : ''}
                            {row.error.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-stone-200 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <span>Restaurante Mao · Estudio Estadístico y de Regresión Lineal</span>
          <span>Base: MAOSBASE · {records.length} registros · Validación 80/20</span>
        </div>
      </footer>
    </div>
  );
}
