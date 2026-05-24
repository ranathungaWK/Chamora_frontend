import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Loader2,
  RefreshCw,
  Server,
  TrendingDown,
  TrendingUp,
  Wifi,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  type Endpoint,
  type MetricEntry,
  type TestCycle,
  fetchCycles,
  fetchEndpoints,
  fetchMetricCatalog,
  runComparison,
} from '@/app/services/testCycleComparisonApi';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Running…';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const CATEGORY_ICONS: Record<string, typeof BarChart3> = {
  Probing: Wifi,
  Container: Cpu,
  Host: Server,
  Application: Activity,
};

function categoryIcon(category: string): typeof BarChart3 {
  return CATEGORY_ICONS[category] ?? BarChart3;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function TestCycleComparisonPage() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const applicationId = appId ? parseInt(appId, 10) : NaN;

  // Backend data
  const [cycles, setCycles] = useState<TestCycle[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [metrics, setMetrics] = useState<MetricEntry[]>([]);

  // Loading
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [catalogError, setCatalogError] = useState('');

  // Selection
  const [selectedCycleIds, setSelectedCycleIds] = useState<number[]>([]);
  const [selectedMetricKeys, setSelectedMetricKeys] = useState<string[]>([]);
  const [selectedEndpointIds, setSelectedEndpointIds] = useState<number[]>([]);
  const [selectionError, setSelectionError] = useState('');

  // Threshold inputs (single-cycle mode)
  const [thresholdValues, setThresholdValues] = useState<Record<string, string>>({});

  // Comparison loading state
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState('');

  // --- Data loading ---
  const loadData = async () => {
    if (isNaN(applicationId)) {
      setLoadError('Invalid application ID in URL.');
      setIsLoading(false);
      return;
    }

    if (!localStorage.getItem('access_token')) {
      navigate('/login');
      return;
    }

    setIsLoading(true);
    setLoadError('');
    setCatalogError('');

    try {
      const [cyclesData, endpointsData] = await Promise.all([
        fetchCycles(applicationId),
        fetchEndpoints(applicationId),
      ]);
      setCycles(cyclesData);
      setEndpoints(endpointsData);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load cycles or endpoints.';
      if (msg.toLowerCase().includes('credential') || msg.includes('401')) {
        navigate('/login');
        return;
      }
      setLoadError(msg);
      setIsLoading(false);
      return;
    }

    try {
      const catalogData = await fetchMetricCatalog(applicationId);
      setMetrics(catalogData);
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : 'Failed to load metric catalog.');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [applicationId]);

  // --- Derived state ---
  const isThresholdMode = selectedCycleIds.length === 1;

  const selectedCycles = useMemo(
    () => cycles.filter((c) => selectedCycleIds.includes(c.id)),
    [cycles, selectedCycleIds],
  );
  const selectedMetrics = useMemo(
    () => metrics.filter((m) => selectedMetricKeys.includes(m.key)),
    [metrics, selectedMetricKeys],
  );
  const endpointIdsForRequest =
    selectedEndpointIds.length > 0 ? selectedEndpointIds : endpoints.map((e) => e.id);

  const canCompare =
    selectedCycleIds.length >= 2 &&
    selectedCycleIds.length <= 4 &&
    selectedMetricKeys.length > 0 &&
    endpointIdsForRequest.length > 0;

  const canThresholdCheck =
    isThresholdMode &&
    selectedMetricKeys.length > 0 &&
    endpointIdsForRequest.length > 0;

  const metricsByCategory = useMemo(() => {
    const groups: Record<string, MetricEntry[]> = {};
    for (const m of metrics) {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    }
    return groups;
  }, [metrics]);

  // Auto-fill empty threshold inputs when entering single-cycle mode
  useEffect(() => {
    if (!isThresholdMode || selectedMetricKeys.length === 0) return;
    setThresholdValues((current) => {
      const next = { ...current };
      let changed = false;
      for (const key of selectedMetricKeys) {
        if (next[key] === undefined) {
          next[key] = '';
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [isThresholdMode, selectedMetricKeys]);

  // --- Handlers ---
  const toggleCycle = (cycleId: number) => {
    setSelectionError('');
    setSelectedCycleIds((current) => {
      if (current.includes(cycleId)) return current.filter((id) => id !== cycleId);
      if (current.length >= 4) {
        setSelectionError('You can compare up to 4 cycles at a time.');
        return current;
      }
      return [...current, cycleId];
    });
  };

  const toggleMetric = (key: string) => {
    setSelectionError('');
    setSelectedMetricKeys((current) => {
      if (current.includes(key)) return current.filter((k) => k !== key);
      if (current.length >= 10) {
        setSelectionError('You can select up to 10 metrics at a time.');
        return current;
      }
      return [...current, key];
    });
  };

  const toggleEndpoint = (endpointId: number) => {
    setSelectedEndpointIds((current) =>
      current.includes(endpointId)
        ? current.filter((id) => id !== endpointId)
        : [...current, endpointId],
    );
  };

  const handleCompare = async () => {
    if (!canCompare) {
      setSelectionError('Select 2–4 cycles and at least 1 metric.');
      return;
    }
    setIsComparing(true);
    setCompareError('');
    try {
      const result = await runComparison({
        cycle_ids: selectedCycleIds,
        endpoint_ids: endpointIdsForRequest,
        metric_keys: selectedMetricKeys,
        baseline_cycle_id: selectedCycleIds[0],
        regression_threshold_pct: 10.0,
        include_summary: true,
      });
      navigate(`/comparison-results/${appId}`, {
        state: { result, selectedCycles, selectedMetrics },
      });
    } catch (e) {
      setCompareError(e instanceof Error ? e.message : 'Comparison failed.');
    } finally {
      setIsComparing(false);
    }
  };

  const handleThresholdCheck = async () => {
    if (!canThresholdCheck) {
      setSelectionError('Select exactly 1 cycle and at least 1 metric.');
      return;
    }
    const thresholds: Record<string, { min?: number; max?: number }> = {};
    for (const key of selectedMetricKeys) {
      const raw = thresholdValues[key];
      const val = Number(raw);
      if (!raw || isNaN(val)) continue;
      const meta = metrics.find((m) => m.key === key);
      thresholds[key] = (meta?.higher_is_worse ?? true) ? { max: val } : { min: val };
    }
    setIsComparing(true);
    setCompareError('');
    try {
      const result = await runComparison({
        cycle_ids: selectedCycleIds,
        endpoint_ids: endpointIdsForRequest,
        metric_keys: selectedMetricKeys,
        thresholds: Object.keys(thresholds).length > 0 ? thresholds : undefined,
        include_summary: false,
      });
      navigate(`/comparison-results/${appId}`, {
        state: { result, selectedCycles, selectedMetrics },
      });
    } catch (e) {
      setCompareError(e instanceof Error ? e.message : 'Threshold check failed.');
    } finally {
      setIsComparing(false);
    }
  };

  // --- Render: loading ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium">Loading test cycles…</p>
        </div>
      </div>
    );
  }

  // --- Render: fatal error ---
  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Failed to load data</h2>
          <p className="text-sm text-slate-600 mb-5">{loadError}</p>
          <Button
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-2.5 text-white"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // --- Render: main page ---
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              to={`/application/${appId}`}
              className="flex items-center justify-center w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  Test Cycle Comparison
                </h1>
                <p className="text-xs text-slate-500">Application #{appId}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg">
            <BarChart3 className="w-4 h-4 text-slate-600" />
            <span className="text-slate-700 font-medium">{cycles.length} Test Cycles</span>
          </div>
        </div>
      </nav>

      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ---- Left 2/3 ---- */}
          <div className="lg:col-span-2 space-y-6">

            {selectionError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {selectionError}
              </div>
            )}

            {/* Cycle selection */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">Step 1</p>
                  <h2 className="text-xl font-bold text-slate-800 mt-1">Select test cycles</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Pick 2–4 cycles to compare, or 1 cycle for threshold validation.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-slate-800">
                    {selectedCycleIds.length}<span className="text-slate-400">/4</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">selected</p>
                </div>
              </div>

              {cycles.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 py-10 text-center">
                  <BarChart3 className="w-8 h-8 text-slate-300" />
                  <p className="text-sm text-slate-500">No test cycles found for this application.</p>
                  <p className="text-xs text-slate-400">Run a test to create your first cycle.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cycles.map((cycle, index) => {
                    const isSelected = selectedCycleIds.includes(cycle.id);
                    const isNewest = index === 0;
                    const isPassed = cycle.status === 'passed';
                    return (
                      <div
                        key={cycle.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleCycle(cycle.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleCycle(cycle.id);
                          }
                        }}
                        className={`cursor-pointer rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                          isSelected ? 'border-indigo-400 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              isPassed
                                ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                                : 'bg-gradient-to-br from-red-500 to-orange-600'
                            }`}>
                              {isPassed
                                ? <CheckCircle2 className="w-5 h-5 text-white" />
                                : <XCircle className="w-5 h-5 text-white" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-slate-800 text-sm">
                                  {cycle.script_name ?? `Cycle #${cycle.id}`}
                                </h4>
                                {isNewest && (
                                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                                    Latest
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {formatDate(cycle.start_time)} · {formatDuration(cycle.duration_seconds)}
                              </p>
                            </div>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleCycle(cycle.id)}
                              aria-label={`Select ${cycle.script_name ?? `Cycle ${cycle.id}`}`}
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {isPassed ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {cycle.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Metric catalog */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">Step 2</p>
                  <h2 className="text-xl font-bold text-slate-800 mt-1">Select metrics</h2>
                  <p className="text-sm text-slate-500 mt-1">Choose up to 10 metrics from the live catalog.</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-slate-800">
                    {selectedMetricKeys.length}<span className="text-slate-400">/10</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">selected</p>
                </div>
              </div>

              {catalogError && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-amber-800">{catalogError}</p>
                    <button
                      type="button"
                      onClick={() =>
                        void fetchMetricCatalog(applicationId)
                          .then(setMetrics)
                          .catch((e: Error) => setCatalogError(e.message))
                      }
                      className="mt-1 text-xs font-medium text-amber-700 underline hover:text-amber-900"
                    >
                      Retry loading catalog
                    </button>
                  </div>
                </div>
              )}

              {metrics.length === 0 && !catalogError ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 py-10 text-center">
                  <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                  <p className="text-sm text-slate-400">Loading metric catalog…</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {Object.entries(metricsByCategory).map(([category, catMetrics]) => {
                    const Icon = categoryIcon(category);
                    return (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                            <Icon className="w-3.5 h-3.5 text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-slate-700">{category}</h3>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            {catMetrics.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {catMetrics.map((metric) => {
                            const isSelected = selectedMetricKeys.includes(metric.key);
                            return (
                              <button
                                key={metric.key}
                                type="button"
                                onClick={() => toggleMetric(metric.key)}
                                className={`w-full rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                                  isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 truncate">{metric.label}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      {metric.aggregation} · {metric.unit}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <span className="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                                      ✓
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ---- Right 1/3 sidebar ---- */}
          <div>
            <div className="sticky top-6 space-y-4">
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  {isThresholdMode ? 'Threshold validation' : 'Comparison summary'}
                </h3>

                <div className="space-y-3 mb-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Selected cycles</p>
                    {selectedCycles.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedCycles.map((c, i) => (
                          <div key={c.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                            <p className="font-medium text-slate-700">
                              {c.script_name ?? `Cycle #${c.id}`}
                            </p>
                            <p className="text-slate-400 mt-0.5">
                              {formatDate(c.start_time)}
                              {i === 0 && selectedCycles.length > 1 ? ' · baseline' : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">None selected</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Selected metrics</p>
                    {selectedMetrics.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMetrics.map((m) => (
                          <span key={m.key} className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                            {m.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">None selected</p>
                    )}
                  </div>
                </div>

                {/* Endpoint filter */}
                {endpoints.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">
                      Endpoint filter
                      <span className="ml-1 normal-case text-slate-400">(all by default)</span>
                    </p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {endpoints.map((ep) => {
                        const checked = selectedEndpointIds.length === 0 || selectedEndpointIds.includes(ep.id);
                        return (
                          <label key={ep.id} className="flex items-start gap-2 cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleEndpoint(ep.id)}
                              aria-label={ep.target_name}
                              className="mt-0.5"
                            />
                            <div className="text-xs leading-snug">
                              <p className="font-medium text-slate-700">{ep.target_name}</p>
                              <p className="text-slate-400">{ep.container_name}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Threshold inputs */}
                {isThresholdMode && selectedMetrics.length > 0 && (
                  <div className="mb-5 space-y-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Threshold values</p>
                    {selectedMetrics.map((metric) => (
                      <div key={metric.key}>
                        <label className="text-xs text-slate-600 mb-1 block font-medium">
                          {metric.label}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={thresholdValues[metric.key] ?? ''}
                          onChange={(e) =>
                            setThresholdValues((prev) => ({ ...prev, [metric.key]: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          placeholder={metric.higher_is_worse ? `Max ${metric.unit}` : `Min ${metric.unit}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Action button */}
                <Button
                  type="button"
                  onClick={isThresholdMode ? () => void handleThresholdCheck() : () => void handleCompare()}
                  disabled={isThresholdMode ? !canThresholdCheck || isComparing : !canCompare || isComparing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-3 text-white shadow-md transition-all hover:from-indigo-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-400"
                >
                  {isComparing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Running…
                    </>
                  ) : (
                    <>
                      {isThresholdMode ? 'Check Thresholds' : 'Run Comparison'}
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                {compareError && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700">{compareError}</p>
                  </div>
                )}

                <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                  {isThresholdMode
                    ? 'Values outside the threshold will be flagged as violations.'
                    : 'First selected cycle is the baseline. Regressions are flagged at 10% change.'}
                </p>
              </div>

              {endpoints.length === 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm">
                  <p className="font-semibold text-amber-800">No endpoints configured</p>
                  <p className="mt-1 text-amber-700 text-xs">
                    At least one endpoint is required to scope metric queries. Register endpoints first.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
