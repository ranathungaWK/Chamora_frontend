import { buildApiUrl } from '@/app/api';

// ---------------------------------------------------------------------------
// Types — main backend
// ---------------------------------------------------------------------------

export interface TestCycle {
  id: number;
  test_script_id: number;
  script_name: string | null;
  application_id: number | null;
  status: 'running' | 'passed' | 'failed' | 'aborted';
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
}

export interface Endpoint {
  id: number;
  application_id: number;
  target_name: string;
  container_name: string;
}

interface ApplicationResponse {
  id: number;
  endpoints?: Endpoint[];
}

interface TestScriptResponse {
  id: number;
  application_id: number;
  script_name: string;
}

interface TestRunResponse {
  id: number;
  test_script_id: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | string;
  start_time: string;
  end_time: string | null;
  result_file_path: string | null;
}

// ---------------------------------------------------------------------------
// Types — comparison service
// ---------------------------------------------------------------------------

export interface MetricEntry {
  key: string;
  label: string;
  category: string;
  unit: string;
  aggregation: string;
  higher_is_worse: boolean;
  endpoint_scoped: boolean;
  label_filter: string | null;
  multi_series_aggregator: string;
  source: 'curated' | 'inferred';
}

export interface ThresholdSpec {
  min?: number;
  max?: number;
  target?: number;
}

export interface CompareRequest {
  cycle_ids: number[];
  endpoint_ids: number[];
  metric_keys?: string[];
  baseline_cycle_id?: number;
  group_by_endpoint?: boolean;
  regression_threshold_pct?: number;
  aggregation_overrides?: Record<string, string>;
  thresholds?: Record<string, ThresholdSpec>;
  include_summary?: boolean;
  summary_top_n?: number;
}

export interface MetricValue {
  cycle_id: number;
  value: number | null;
}

export interface MetricComparison {
  cycle_id: number;
  diff: number;
  pct_change: number;
  classification: 'regressed' | 'improved' | 'unchanged';
  baseline_was_zero: boolean;
}

export interface ThresholdCheck {
  threshold: ThresholdSpec;
  value: number | null;
  classification: 'violated' | 'ok' | 'no_threshold' | 'no_data';
  violation?: {
    kind: string;
    limit: number;
    exceeded_by: number;
    exceeded_by_pct: number;
  };
}

export interface CrossCycleStats {
  mean: number;
  stddev: number;
  cv: number;
  trend_slope_per_cycle: number;
}

export interface MetricResult {
  values: MetricValue[];
  comparisons: MetricComparison[] | null;
  threshold_check: ThresholdCheck | null;
  cross_cycle_stats: CrossCycleStats | null;
  significance: { score: number; rank: number };
  comparable: boolean;
  unit: string;
  category: string;
  higher_is_worse: boolean;
  aggregation: string;
  scoped_to_endpoints: boolean;
}

export interface CompareSummary {
  summary: string;
  source: 'llm' | 'fallback';
  model: string | null;
  error: string | null;
}

export interface CompareResult {
  cycles: Array<{
    cycle_id: number;
    start_time: string | null;
    end_time: string | null;
    duration_seconds: number | null;
  }>;
  baseline_cycle_id: number;
  group_by_endpoint: boolean;
  regression_threshold_pct: number;
  mode: 'threshold' | 'baseline';
  thresholds_applied: boolean;
  metrics: Record<string, MetricResult>;
  regression_count: number;
  improvement_count: number;
  unchanged_count: number;
  violation_count: number;
  ok_count: number;
  no_threshold_count: number;
  missing_metric_keys: string[];
  summary?: CompareSummary;
}

const DEFAULT_METRICS: MetricEntry[] = [
  {
    key: 'cycle_duration_seconds',
    label: 'Cycle Duration',
    category: 'Cycle Health',
    unit: 'seconds',
    aggregation: 'latest',
    higher_is_worse: true,
    endpoint_scoped: false,
    label_filter: null,
    multi_series_aggregator: 'avg',
    source: 'inferred',
  },
  {
    key: 'cycle_success_rate',
    label: 'Success Rate',
    category: 'Cycle Health',
    unit: 'percent',
    aggregation: 'latest',
    higher_is_worse: false,
    endpoint_scoped: false,
    label_filter: null,
    multi_series_aggregator: 'avg',
    source: 'inferred',
  },
  {
    key: 'cycle_completion_score',
    label: 'Completion Score',
    category: 'Cycle Health',
    unit: 'score',
    aggregation: 'latest',
    higher_is_worse: true,
    endpoint_scoped: false,
    label_filter: null,
    multi_series_aggregator: 'avg',
    source: 'inferred',
  },
];

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function checkResponse(res: Response): Promise<void> {
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = await res.json();
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    } catch {
      // ignore parse error
    }
    throw new Error(detail ?? `Request failed (${res.status})`);
  }
}

function getMetricCatalog(): MetricEntry[] {
  return DEFAULT_METRICS;
}

async function fetchApplications(): Promise<ApplicationResponse[]> {
  const res = await fetch(buildApiUrl('/api/v1/application/me'), {
    headers: authHeaders(),
  });
  await checkResponse(res);
  return res.json() as Promise<ApplicationResponse[]>;
}

async function fetchScripts(applicationId: number): Promise<TestScriptResponse[]> {
  const res = await fetch(buildApiUrl(`/api/v1/k6/applications/${applicationId}/scripts`), {
    headers: authHeaders(),
  });
  await checkResponse(res);
  return res.json() as Promise<TestScriptResponse[]>;
}

async function fetchScriptHistory(scriptId: number): Promise<TestRunResponse[]> {
  const res = await fetch(buildApiUrl(`/api/v1/k6/scripts/${scriptId}/history`), {
    headers: authHeaders(),
  });
  await checkResponse(res);
  return res.json() as Promise<TestRunResponse[]>;
}

function getMetricValue(metricKey: string, cycle: TestCycle): number | null {
  switch (metricKey) {
    case 'cycle_duration_seconds':
      return cycle.duration_seconds;
    case 'cycle_success_rate':
      return cycle.status === 'passed' ? 100 : 0;
    case 'cycle_completion_score':
      if (cycle.status === 'passed') return 100;
      if (cycle.status === 'running') return 50;
      return 0;
    default:
      return null;
  }
}

function buildMetricResult(
  metric: MetricEntry,
  cycles: TestCycle[],
  baselineCycleId: number,
  thresholds?: Record<string, ThresholdSpec>,
): MetricResult {
  const values = cycles.map((cycle) => ({
    cycle_id: cycle.id,
    value: getMetricValue(metric.key, cycle),
  }));

  const baselineValue = values.find((item) => item.cycle_id === baselineCycleId)?.value ?? null;
  const comparisons = cycles.length > 1
    ? values
        .filter((item) => item.cycle_id !== baselineCycleId)
        .map((item) => {
          const diff = (item.value ?? 0) - (baselineValue ?? 0);
          const baselineWasZero = baselineValue === 0 || baselineValue === null;
          const pctChange = baselineWasZero || baselineValue === null
            ? 0
            : (diff / baselineValue) * 100;

          const worsened = metric.higher_is_worse ? diff > 0 : diff < 0;
          const improved = metric.higher_is_worse ? diff < 0 : diff > 0;

          return {
            cycle_id: item.cycle_id,
            diff,
            pct_change: pctChange,
            classification: worsened ? 'regressed' : improved ? 'improved' : 'unchanged',
            baseline_was_zero: baselineWasZero,
          } as MetricComparison;
        })
    : null;

  const threshold = thresholds?.[metric.key] ?? null;
  const thresholdCheck = threshold
    ? (() => {
        const value = values[0]?.value ?? null;
        if (value === null) {
          return {
            threshold,
            value,
            classification: 'no_data' as const,
          };
        }

        const violatedMax = threshold.max !== undefined && value > threshold.max;
        const violatedMin = threshold.min !== undefined && value < threshold.min;
        const violatedTarget = threshold.target !== undefined && value !== threshold.target;
        const violated = violatedMax || violatedMin || violatedTarget;

        return {
          threshold,
          value,
          classification: violated ? ('violated' as const) : ('ok' as const),
          violation: violated
            ? {
                kind: violatedMax ? 'max' : violatedMin ? 'min' : 'target',
                limit: threshold.max ?? threshold.min ?? threshold.target ?? value,
                exceeded_by: violatedMax ? value - (threshold.max as number) : 0,
                exceeded_by_pct: violatedMax && threshold.max ? ((value - threshold.max) / threshold.max) * 100 : 0,
              }
            : undefined,
        };
      })()
    : null;

  return {
    values,
    comparisons,
    threshold_check: thresholdCheck,
    cross_cycle_stats: null,
    significance: { score: 1, rank: 1 },
    comparable: true,
    unit: metric.unit,
    category: metric.category,
    higher_is_worse: metric.higher_is_worse,
    aggregation: metric.aggregation,
    scoped_to_endpoints: metric.endpoint_scoped,
  };
}

function buildLocalSummary(result: CompareResult): CompareSummary {
  if (result.mode === 'threshold') {
    return {
      summary: `${result.violation_count} threshold violation(s) detected across ${Object.keys(result.metrics).length} metric(s).`,
      source: 'fallback',
      model: null,
      error: null,
    };
  }

  return {
    summary: `${result.regression_count} regression(s), ${result.improvement_count} improvement(s), and ${result.unchanged_count} unchanged comparison(s).`,
    source: 'fallback',
    model: null,
    error: null,
  };
}
function toTestCycle(
  run: TestRunResponse,
  scriptName: string | null,
  applicationId: number,
): TestCycle {
  const endTime = run.end_time;
  const durationSeconds = endTime
    ? Math.max(0, Math.round((new Date(endTime).getTime() - new Date(run.start_time).getTime()) / 1000))
    : null;

  return {
    id: run.id,
    test_script_id: run.test_script_id,
    script_name: scriptName,
    application_id: applicationId,
    status:
      run.status === 'completed'
        ? 'passed'
        : run.status === 'failed'
          ? 'failed'
          : run.status === 'running'
            ? 'running'
            : 'aborted',
    start_time: run.start_time,
    end_time: run.end_time,
    duration_seconds: durationSeconds,
  };
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function fetchCycles(applicationId: number): Promise<TestCycle[]> {
  const scripts = await fetchScripts(applicationId);

  const histories = await Promise.all(
    scripts.map(async (script) => {
      const runs = await fetchScriptHistory(script.id);
      return runs.map((run) => toTestCycle(run, script.script_name, script.application_id));
    }),
  );

  return histories.flat().sort((left, right) => {
    const leftTime = new Date(left.start_time).getTime();
    const rightTime = new Date(right.start_time).getTime();
    return rightTime - leftTime;
  });
}

export async function fetchEndpoints(applicationId: number): Promise<Endpoint[]> {
  const applications = await fetchApplications();
  const currentApplication = applications.find((application) => application.id === applicationId);

  if (!currentApplication) {
    return [];
  }

  return currentApplication.endpoints ?? [];
}

export async function fetchMetricCatalog(applicationId: number): Promise<MetricEntry[]> {
  void applicationId;
  return getMetricCatalog();
}

export async function runComparison(
  req: CompareRequest,
  cycles: TestCycle[],
  metrics: MetricEntry[],
): Promise<CompareResult> {
  const cycleMap = new Map(cycles.map((cycle) => [cycle.id, cycle]));
  const selectedCycles = req.cycle_ids.map((cycleId) => cycleMap.get(cycleId)).filter((cycle): cycle is TestCycle => Boolean(cycle));
  const selectedMetricEntries = metrics.filter((metric) => req.metric_keys?.includes(metric.key));
  const baselineCycleId = req.baseline_cycle_id ?? req.cycle_ids[0];
  const mode: 'threshold' | 'baseline' = selectedCycles.length === 1 ? 'threshold' : 'baseline';

  const metricResults = Object.fromEntries(
    selectedMetricEntries.map((metric) => [
      metric.key,
      buildMetricResult(metric, selectedCycles, baselineCycleId, req.thresholds),
    ]),
  );

  const regressionCount = Object.values(metricResults).flatMap((metricResult) => metricResult.comparisons ?? []).filter((comparison) => comparison.classification === 'regressed').length;
  const improvementCount = Object.values(metricResults).flatMap((metricResult) => metricResult.comparisons ?? []).filter((comparison) => comparison.classification === 'improved').length;
  const unchangedCount = Object.values(metricResults).flatMap((metricResult) => metricResult.comparisons ?? []).filter((comparison) => comparison.classification === 'unchanged').length;
  const violationCount = Object.values(metricResults).filter((metricResult) => metricResult.threshold_check?.classification === 'violated').length;
  const okCount = Object.values(metricResults).filter((metricResult) => metricResult.threshold_check?.classification === 'ok').length;
  const noThresholdCount = Object.values(metricResults).filter((metricResult) => metricResult.threshold_check?.classification === 'no_threshold').length;

  const result: CompareResult = {
    cycles: selectedCycles.map((cycle) => ({
      cycle_id: cycle.id,
      start_time: cycle.start_time,
      end_time: cycle.end_time,
      duration_seconds: cycle.duration_seconds,
    })),
    baseline_cycle_id: baselineCycleId,
    group_by_endpoint: Boolean(req.group_by_endpoint),
    regression_threshold_pct: req.regression_threshold_pct ?? 10,
    mode,
    thresholds_applied: Boolean(req.thresholds && Object.keys(req.thresholds).length > 0),
    metrics: metricResults,
    regression_count: regressionCount,
    improvement_count: improvementCount,
    unchanged_count: unchangedCount,
    violation_count: violationCount,
    ok_count: okCount,
    no_threshold_count: noThresholdCount,
    missing_metric_keys: req.metric_keys?.filter((metricKey) => !metricResults[metricKey]) ?? [],
  };

  result.summary = buildLocalSummary(result);
  return result;
}
