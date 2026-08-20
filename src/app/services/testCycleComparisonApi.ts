import { buildApiUrl } from '@/app/api';

const COMPARE_BASE = '/compare-service';

// ---------------------------------------------------------------------------
// Types — main backend
// ---------------------------------------------------------------------------

export interface TestCycle {
  id: number;
  test_script_id: number;
  script_name: string | null;
  application_id: number | null;
  status: 'running' | 'passed' | 'completed' | 'failed' | 'aborted';
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
  /** Row id in `comparison_results`. Null when the save failed. */
  comparison_id?: number | null;
  saved?: boolean;
  save_error?: string;
}

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

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function fetchCycles(applicationId: number): Promise<TestCycle[]> {
  const res = await fetch(
    buildApiUrl(`/api/v1/test-cycles?application_id=${applicationId}`),
    { headers: authHeaders() },
  );
  await checkResponse(res);
  return res.json() as Promise<TestCycle[]>;
}

export async function fetchEndpoints(applicationId: number): Promise<Endpoint[]> {
  const res = await fetch(
    buildApiUrl(`/api/v1/application/${applicationId}/endpoints`),
    { headers: authHeaders() },
  );
  await checkResponse(res);
  return res.json() as Promise<Endpoint[]>;
}

export async function fetchMetricCatalog(applicationId: number): Promise<MetricEntry[]> {
  const res = await fetch(`${COMPARE_BASE}/metric-catalog?application_id=${applicationId}`);
  await checkResponse(res);
  const data = await res.json() as { metrics: MetricEntry[] };
  return data.metrics;
}

export async function runComparison(req: CompareRequest): Promise<CompareResult> {
  const res = await fetch(`${COMPARE_BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  await checkResponse(res);
  return res.json() as Promise<CompareResult>;
}

// ---------------------------------------------------------------------------
// Comparison history (`comparison_results` table)
// ---------------------------------------------------------------------------

/** One flattened metric-breakdown row, as rendered on the results page. */
export interface SavedMetricRow {
  metric_key: string;
  endpoint_id: string | null;
  label: string;
  category: string | null;
  aggregation: string | null;
  unit: string | null;
  higher_is_worse: boolean | null;
  rank: number | null;
  significance: number | null;
  comparable: boolean | null;
  status: string | null;
  values: Array<{
    cycle_id: number;
    cycle_label: string;
    value: number | null;
    is_baseline: boolean;
    pct_change: number | null;
    diff: number | null;
    classification: string | null;
  }>;
  threshold_check: ThresholdCheck | null;
  cross_cycle_stats: CrossCycleStats | null;
}

/** The page-render payload stored alongside the raw report. */
export interface SavedDisplay {
  app_name: string | null;
  application_id: number;
  mode: 'baseline' | 'threshold';
  cycles: Array<{
    cycle_id: number;
    label: string;
    role: 'baseline' | 'target';
    test_script_id: number | null;
    status: string | null;
    start_time: string | null;
    end_time: string | null;
    duration_seconds: number | null;
  }>;
  metrics: MetricEntry[];
  rows: SavedMetricRow[];
}

/** A history row — the listing endpoint omits `report` and `display`. */
export interface SavedComparisonSummary {
  id: number;
  application_id: number;
  user_id: number | null;
  mode: 'baseline' | 'threshold';
  cycle_ids: number[];
  baseline_cycle_id: number | null;
  endpoint_ids: number[];
  metric_keys: string[];
  group_by_endpoint: boolean;
  regression_threshold_pct: number | null;
  thresholds_applied: boolean;
  regression_count: number;
  improvement_count: number;
  unchanged_count: number;
  violation_count: number;
  ok_count: number;
  no_threshold_count: number;
  metric_count: number;
  missing_metric_keys: string[];
  summary_text: string | null;
  summary_source: string | null;
  summary_model: string | null;
  top_metric_key: string | null;
  top_metric_significance: number | null;
  created_at: string;
}

/** A history row loaded in full. */
export interface SavedComparison extends SavedComparisonSummary {
  summary_error: string | null;
  report: CompareResult;
  display: SavedDisplay;
}

export async function fetchComparisonHistory(params: {
  applicationId?: number;
  userId?: number;
  cycleId?: number;
  limit?: number;
  offset?: number;
}): Promise<SavedComparisonSummary[]> {
  const query = new URLSearchParams();
  if (params.applicationId !== undefined) query.set('application_id', String(params.applicationId));
  if (params.userId !== undefined) query.set('user_id', String(params.userId));
  if (params.cycleId !== undefined) query.set('cycle_id', String(params.cycleId));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));

  const res = await fetch(`${COMPARE_BASE}/comparison-results?${query.toString()}`);
  await checkResponse(res);
  const data = await res.json() as { results: SavedComparisonSummary[] };
  return data.results;
}

export async function fetchSavedComparison(id: number): Promise<SavedComparison> {
  const res = await fetch(`${COMPARE_BASE}/comparison-results/${id}`);
  await checkResponse(res);
  return res.json() as Promise<SavedComparison>;
}

export async function deleteSavedComparison(id: number): Promise<void> {
  const res = await fetch(`${COMPARE_BASE}/comparison-results/${id}`, { method: 'DELETE' });
  await checkResponse(res);
}
