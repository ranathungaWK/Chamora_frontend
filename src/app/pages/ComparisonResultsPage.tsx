import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Server,
  TrendingDown,
  TrendingUp,
  Wifi,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import {
  type CompareResult,
  type MetricEntry,
  type MetricResult,
  type TestCycle,
} from '@/app/services/testCycleComparisonApi';

// ---------------------------------------------------------------------------
// Types for the page state passed via Router
// ---------------------------------------------------------------------------

export interface ComparisonResultsState {
  result: CompareResult;
  selectedCycles: TestCycle[];
  selectedMetrics: MetricEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatValue(value: number | null | undefined, unit: string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const u = unit ?? '';
  if (u === 'seconds') {
    if (Math.abs(value) < 0.001) return `${(value * 1e6).toFixed(0)} µs`;
    if (Math.abs(value) < 1) return `${(value * 1000).toFixed(1)} ms`;
    return `${value.toFixed(3)} s`;
  }
  if (u === 'bytes') {
    const abs = Math.abs(value);
    if (abs >= 1073741824) return `${(value / 1073741824).toFixed(2)} GB`;
    if (abs >= 1048576) return `${(value / 1048576).toFixed(2)} MB`;
    if (abs >= 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${value.toFixed(0)} B`;
  }
  if (u === 'ratio') return `${(value * 100).toFixed(2)} %`;
  if (u === 'percent') return `${value.toFixed(1)} %`;
  if (Math.abs(value) >= 10000) return value.toFixed(0);
  if (Math.abs(value) >= 1) return value.toFixed(3);
  return value.toFixed(5);
}

function formatPct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return '—';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)} %`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const CATEGORY_ICONS: Record<string, typeof BarChart3> = {
  Probing: Wifi,
  Container: Cpu,
  Host: Server,
  Application: Activity,
};

// ---------------------------------------------------------------------------
// Classification badge
// ---------------------------------------------------------------------------

function ClassificationBadge({ cls }: { cls: string | null | undefined }) {
  if (!cls) return <span className="text-xs text-slate-400">—</span>;
  const map: Record<string, { label: string; className: string }> = {
    regressed: { label: 'Regressed', className: 'bg-red-100 text-red-700 border-red-200' },
    improved: { label: 'Improved', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    unchanged: { label: 'Unchanged', className: 'bg-slate-100 text-slate-500 border-slate-200' },
    violated: { label: 'Violated', className: 'bg-red-100 text-red-700 border-red-200' },
    ok: { label: 'OK', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    no_threshold: { label: 'No threshold', className: 'bg-slate-100 text-slate-400 border-slate-200' },
    no_data: { label: 'No data', className: 'bg-amber-100 text-amber-600 border-amber-200' },
  };
  const { label, className } = map[cls] ?? { label: cls, className: 'bg-slate-100 text-slate-600 border-slate-200' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Metric row
// ---------------------------------------------------------------------------

function MetricRow({
  metricKey,
  result,
  cycles,
  baselineCycleId,
  mode,
  cycleLabelMap,
}: {
  metricKey: string;
  result: MetricResult;
  cycles: CompareResult['cycles'];
  baselineCycleId: number;
  mode: 'baseline' | 'threshold';
  cycleLabelMap: Record<number, string>;
}) {
  const valueMap = useMemo(
    () => Object.fromEntries(result.values.map((v) => [v.cycle_id, v.value])),
    [result.values],
  );
  const compMap = useMemo(
    () => Object.fromEntries((result.comparisons ?? []).map((c) => [c.cycle_id, c])),
    [result.comparisons],
  );

  const label = result.label ??
    metricKey.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
      <td className="py-3.5 pl-5 pr-4 align-top">
        <div className="font-medium text-slate-800 text-sm leading-tight">{label}</div>
        <div className="text-xs text-slate-400 mt-0.5">
          {result.category} · {result.aggregation} · {result.unit ?? 'unknown'}
        </div>
      </td>

      {mode === 'baseline' ? (
        <>
          {cycles.map((cycle) => {
            const val = valueMap[cycle.cycle_id];
            const comp = compMap[cycle.cycle_id];
            const isBaseline = cycle.cycle_id === baselineCycleId;
            return (
              <td key={cycle.cycle_id} className="px-4 py-3.5 text-right align-top">
                <div className="text-sm font-semibold text-slate-800">
                  {formatValue(val, result.unit)}
                </div>
                {isBaseline && (
                  <div className="text-xs text-indigo-400 mt-0.5">baseline</div>
                )}
                {comp && comp.pct_change !== null && (
                  <div className={`text-xs font-medium mt-0.5 ${
                    (result.higher_is_worse ? comp.pct_change > 0 : comp.pct_change < 0)
                      ? 'text-red-500'
                      : comp.pct_change === 0
                      ? 'text-slate-400'
                      : 'text-emerald-500'
                  }`}>
                    {formatPct(comp.pct_change)}
                  </div>
                )}
              </td>
            );
          })}
          <td className="px-4 py-3.5 text-right align-top">
            {(() => {
              const nonBaselineComps = (result.comparisons ?? []).filter(
                (c) => c.cycle_id !== baselineCycleId,
              );
              if (nonBaselineComps.length === 0) return <span className="text-xs text-slate-400">—</span>;
              const worst = nonBaselineComps.reduce((a, b) => {
                const order = { regressed: 0, unchanged: 1, improved: 2 };
                return (order[a.classification] ?? 3) <= (order[b.classification] ?? 3) ? a : b;
              });
              return <ClassificationBadge cls={worst.classification} />;
            })()}
          </td>
        </>
      ) : (
        <>
          <td className="px-4 py-3.5 text-right align-top">
            <div className="text-sm font-semibold text-slate-800">
              {formatValue(result.threshold_check?.value, result.unit)}
            </div>
          </td>
          <td className="px-4 py-3.5 text-right align-top text-sm text-slate-600">
            {result.threshold_check?.threshold.max !== undefined
              ? `≤ ${formatValue(result.threshold_check.threshold.max, result.unit)}`
              : result.threshold_check?.threshold.min !== undefined
              ? `≥ ${formatValue(result.threshold_check.threshold.min, result.unit)}`
              : '—'}
          </td>
          <td className="px-4 py-3.5 text-right align-top">
            <ClassificationBadge cls={result.threshold_check?.classification} />
          </td>
        </>
      )}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main results page
// ---------------------------------------------------------------------------

export function ComparisonResultsPage() {
  const { appId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as ComparisonResultsState | null;
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  if (!state?.result) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-800 mb-2">No results to display</h2>
          <p className="text-sm text-slate-500 mb-5">
            Navigate here from the Test Cycle Comparison page.
          </p>
          <Link
            to={`/test-cycle-comparison/${appId ?? ''}`}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Comparison
          </Link>
        </div>
      </div>
    );
  }

  const { result, selectedCycles, selectedMetrics } = state;
  const isBaseline = result.mode === 'baseline';

  // Map cycle_id → human label for column headers
  const cycleLabelMap = useMemo((): Record<number, string> => {
    const map: Record<number, string> = {};
    for (const c of result.cycles) {
      const match = selectedCycles.find((sc) => sc.id === c.cycle_id);
      map[c.cycle_id] = match?.script_name ?? `Cycle #${c.cycle_id}`;
    }
    return map;
  }, [result.cycles, selectedCycles]);

  // Sort metrics by significance rank
  const sortedMetrics = useMemo((): [string, MetricResult][] => {
    return Object.entries(result.metrics).sort(
      (a, b) => (a[1].significance?.rank ?? 999) - (b[1].significance?.rank ?? 999),
    );
  }, [result.metrics]);

  const summaryText = result.summary?.summary ?? null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ---- Nav ---- */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center justify-center w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  Comparison Results
                </h1>
                <p className="text-xs text-slate-500">
                  {isBaseline ? 'Baseline comparison' : 'Threshold check'} · Application #{appId}
                </p>
              </div>
            </div>
          </div>

          {/* Summary counts chips */}
          <div className="flex flex-wrap items-center gap-2">
            {isBaseline ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
                  <TrendingDown className="w-4 h-4" />
                  {result.regression_count} regression{result.regression_count !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                  <TrendingUp className="w-4 h-4" />
                  {result.improvement_count} improvement{result.improvement_count !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600">
                  {result.unchanged_count} unchanged
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
                  <XCircle className="w-4 h-4" />
                  {result.violation_count} violation{result.violation_count !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  {result.ok_count} within threshold
                </span>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="p-6 max-w-[1400px] mx-auto space-y-6">

        {/* ---- Cycles info bar ---- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {result.cycles.map((c) => {
            const sc = selectedCycles.find((x) => x.id === c.cycle_id);
            const isBase = c.cycle_id === result.baseline_cycle_id;
            return (
              <div
                key={c.cycle_id}
                className={`rounded-2xl border p-4 ${isBase ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${isBase ? 'text-indigo-600' : 'text-slate-500'}`}>
                    {isBase ? 'Baseline' : 'Target'}
                  </span>
                </div>
                <p className="font-semibold text-slate-800 text-sm truncate">
                  {cycleLabelMap[c.cycle_id]}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatDate(c.start_time)} · {formatDuration(c.duration_seconds)}
                </p>
                {sc && (
                  <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    sc.status === 'passed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {sc.status}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* ---- LLM / fallback summary ---- */}
        {summaryText && (
          <div className="rounded-2xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setSummaryExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">AI Analysis</p>
                  <p className="text-xs text-slate-500">
                    {result.summary?.source === 'llm'
                      ? `Generated by ${result.summary.model ?? 'LLM'}`
                      : 'Deterministic summary (LLM unavailable)'}
                  </p>
                </div>
              </div>
              {summaryExpanded
                ? <ChevronUp className="w-5 h-5 text-slate-400" />
                : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {summaryExpanded && (
              <div className="px-6 pb-5 border-t border-indigo-100">
                <div className="mt-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-[inherit]">
                  {summaryText}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- Missing metrics warning ---- */}
        {result.missing_metric_keys.length > 0 && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">No data found for: </span>
              {result.missing_metric_keys.join(', ')}
            </p>
          </div>
        )}

        {/* ---- Metric results table ---- */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">Metric breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sorted by significance · {sortedMetrics.length} metric{sortedMetrics.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="py-3 pl-5 pr-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 min-w-[200px]">
                    Metric
                  </th>
                  {isBaseline ? (
                    <>
                      {result.cycles.map((c) => (
                        <th
                          key={c.cycle_id}
                          className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 min-w-[130px]"
                        >
                          <div className="truncate max-w-[160px] ml-auto">
                            {cycleLabelMap[c.cycle_id]}
                          </div>
                          {c.cycle_id === result.baseline_cycle_id && (
                            <div className="text-indigo-400 normal-case tracking-normal font-normal text-[11px]">baseline</div>
                          )}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Status
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Actual</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Threshold</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedMetrics.map(([key, metricResult]) => (
                  <MetricRow
                    key={key}
                    metricKey={key}
                    result={metricResult}
                    cycles={result.cycles}
                    baselineCycleId={result.baseline_cycle_id}
                    mode={result.mode}
                    cycleLabelMap={cycleLabelMap}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- Footer action ---- */}
        <div className="flex justify-center pb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to comparison
          </button>
        </div>
      </div>
    </div>
  );
}
