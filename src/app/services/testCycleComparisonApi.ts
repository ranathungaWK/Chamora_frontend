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
