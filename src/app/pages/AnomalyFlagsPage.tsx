import { ArrowLeft, CheckCircle2, Filter, RefreshCw, ShieldAlert, Trash2, X } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { buildApiUrl, buildRcaApiUrl } from '@/app/api';

interface AnomalyItem {
  id: string;
  application_id: number;
  config_id: number;
  window_timestamp: string;
  score: number;
  severity: 'WARNING' | 'CRITICAL' | string;
  root_cause?: string | null;
  evidence: Record<string, unknown>;
  created_at: string;
}

interface AnomalyListResponse {
  total: number;
  items: AnomalyItem[];
}

interface FlagCounts {
  total: number;
  CRITICAL: number;
  WARNING: number;
}

interface RootCauseAnalysisResult {
  id: string;
  application_id: number;
  config_id: number;
  window_timestamp: string;
  ml_severity: string;
  ml_root_cause: string;
  root_cause: string;
  confidence: number;
  affected_component: string;
  evidence: string;
  reasoning: string;
  recommended_actions: string[];
  anomalies_detected: string[];
  analysis_source: string;
  created_at: string;
}

const oneDayMs = 24 * 60 * 60 * 1000;

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toIsoDayStart = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
};

const toIsoDayEnd = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
};

const shiftDateInput = (value: string, days: number) => {
  const [year, month, day] = value.split('-').map(Number);
  const shifted = new Date(year, month - 1, day);
  shifted.setDate(shifted.getDate() + days);
  return toDateInputValue(shifted);
};

const localDateKey = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return toDateInputValue(date);
};

const isWithinSelectedRange = (value: string, from: string, to: string) => {
  const key = localDateKey(value);
  if (!key) {
    return false;
  }

  return (!from || key >= from) && (!to || key <= to);
};

const buildCounts = (items: AnomalyItem[]): FlagCounts =>
  items.reduce(
    (accumulator, item) => {
      accumulator.total += 1;
      if (item.severity === 'CRITICAL') {
        accumulator.CRITICAL += 1;
      } else if (item.severity === 'WARNING') {
        accumulator.WARNING += 1;
      }
      return accumulator;
    },
    { total: 0, CRITICAL: 0, WARNING: 0 },
  );

const getDefaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 2);
  return {
    dateFrom: toDateInputValue(start),
    dateTo: toDateInputValue(end),
  };
};

export function AnomalyFlagsPage() {
  const { appId, configId } = useParams();
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisResult, setAnalysisResult] = useState<RootCauseAnalysisResult | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyItem | null>(null);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('window_timestamp');
  const [order, setOrder] = useState('desc');
  const [severityFilter, setSeverityFilter] = useState('');
  const [{ dateFrom, dateTo }, setDateRange] = useState(getDefaultRange);

  const visibleAnomalies = anomalies.filter((item) => isWithinSelectedRange(item.window_timestamp, dateFrom, dateTo));
  const counts = buildCounts(visibleAnomalies);

  const loadFlags = async () => {
    if (!appId) {
      setError('Missing application id.');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Please log in to view anomaly flags.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (sortBy) params.set('sort_by', sortBy);
      if (order) params.set('order', order);
      if (severityFilter) params.set('severity', severityFilter);
      if (configId) params.set('config_id', configId);

      if (dateFrom) params.set('date_from', toIsoDayStart(shiftDateInput(dateFrom, -1)));
      if (dateTo) params.set('date_to', toIsoDayEnd(shiftDateInput(dateTo, 1)));

      const listResponse = await fetch(buildApiUrl(`/api/v1/anomaly-flags/application/${appId}?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (listResponse.status === 404) {
        setAnomalies([]);
        return;
      }

      if (!listResponse.ok) {
        throw new Error('Failed to load anomalies');
      }

      const payload = (await listResponse.json()) as AnomalyListResponse;
      const items = (payload.items ?? []).filter((item) => isWithinSelectedRange(item.window_timestamp, dateFrom, dateTo));
      setAnomalies(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setAnomalies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFlags();
  }, [appId, configId, sortBy, order, severityFilter, dateFrom, dateTo]);

  const acknowledgeOne = async (anomalyId: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setMutating(true);
    try {
      const response = await fetch(buildApiUrl(`/api/v1/anomaly-flags/${anomalyId}/acknowledge`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to acknowledge anomaly');
      await loadFlags();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setMutating(false);
    }
  };

  const runRootCauseAnalysis = async (anomaly: AnomalyItem) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setAnalysisError('Please log in to run root cause analysis.');
      return;
    }

    setSelectedAnomaly(anomaly);
    setAnalysisLoading(true);
    setAnalysisError('');
    setAnalysisResult(null);

    try {
      const response = await fetch(buildRcaApiUrl('/api/v1/analyze'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          record: {
            id: anomaly.id,
            application_id: anomaly.application_id,
            config_id: anomaly.config_id,
            window_timestamp: anomaly.window_timestamp,
            anomaly_score: anomaly.score,
            severity: anomaly.severity,
            root_cause: anomaly.root_cause ?? undefined,
            evidence: anomaly.evidence,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to run root cause analysis');
      }

      const payload = (await response.json()) as RootCauseAnalysisResult;
      setAnalysisResult(payload);
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalysisLoading(false);
    }
  };

  const closeAnalysisPanel = () => {
    setSelectedAnomaly(null);
    setAnalysisResult(null);
    setAnalysisError('');
    setAnalysisLoading(false);
  };

  const acknowledgeAll = async () => {
    if (!appId) return;
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setMutating(true);
    try {
      const params = new URLSearchParams();
      if (severityFilter) params.set('severity', severityFilter);
      if (configId) params.set('config_id', configId);
      if (dateFrom) params.set('date_from', toIsoDayStart(dateFrom));
      if (dateTo) params.set('date_to', toIsoDayEnd(dateTo));

      const response = await fetch(buildApiUrl(`/api/v1/anomaly-flags/application/${appId}/acknowledge-all?${params.toString()}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to acknowledge anomalies');
      await loadFlags();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setMutating(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to={`/anomaly-detection/${appId ?? ''}`} className="inline-flex items-center justify-center w-10 h-10 bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Anomaly Flags</h1>
            <p className="text-sm text-slate-500">Viewing flags for configuration {configId ?? 'all'}</p>
          </div>
        </div>
      </nav>

      <div className="w-full p-6">
        <div className="w-full bg-white/80 border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-700">Identified Anomalies</h2>
              <p className="text-sm text-slate-500">Showing anomalies for the last 3 days by default. Adjust the range to load earlier data.</p>
              <p className="text-xs text-slate-400 mt-1">Dates are matched against your browser's local calendar day.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadFlags()}
                className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
                disabled={loading || mutating}
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => void acknowledgeAll()}
                className="inline-flex items-center gap-2 h-10 px-3 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:bg-slate-400"
                disabled={loading || mutating || visibleAnomalies.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                Acknowledge All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total</p>
              <p className="mt-2 text-2xl font-bold text-slate-800">{counts.total}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-red-600">Critical</p>
              <p className="mt-2 text-2xl font-bold text-red-700">{counts.CRITICAL}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-600">Warning</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{counts.WARNING}</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-600">Config</p>
              <p className="mt-2 text-2xl font-bold text-indigo-700">{configId ?? '-'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <Filter className="w-4 h-4" />
              Filters
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="window_timestamp">Sort: Window Time</option>
              <option value="severity">Sort: Severity</option>
              <option value="score">Sort: Score</option>
              <option value="created_at">Sort: Created At</option>
            </select>
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="desc">Newest / Highest first</option>
              <option value="asc">Oldest / Lowest first</option>
            </select>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">All severities</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">From</label>
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => setDateRange((current) => ({ ...current, dateFrom: e.target.value }))}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              />
              <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">To</label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(e) => setDateRange((current) => ({ ...current, dateTo: e.target.value }))}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              />
              <button
                type="button"
                onClick={() => setDateRange(getDefaultRange())}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Last 3 days
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            <p>
              Date window: <span className="font-semibold">{dateFrom}</span> to <span className="font-semibold">{dateTo}</span>
            </p>
            <p className="text-indigo-700">Change the dates above to load older anomalies.</p>
          </div>

          {loading ? (
            <p className="text-sm text-slate-600">Loading anomalies...</p>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
          ) : visibleAnomalies.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-8 text-center">
              <p className="text-slate-700 font-semibold mb-1">No anomalies found</p>
              <p className="text-sm text-slate-500">No flags have been recorded for this configuration yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleAnomalies.map((a) => (
                <div key={a.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                      <div className="flex items-center gap-2">
                      <ShieldAlert className={`w-4 h-4 ${a.severity === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`} />
                      <p className="font-semibold text-slate-800">{a.root_cause ? 'Identified by rule based detection' : 'Identified by machine learning model'}</p>
                    </div>
                    <p className="text-sm text-slate-500">Severity: <span className={`font-semibold ${a.severity === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`}>{a.severity}</span></p>
                    <p className="text-xs text-slate-400">Window time: {new Date(a.window_timestamp).toLocaleString()}</p>
                    <p className="text-xs text-slate-400">Score: {a.score} | Config ID: {a.config_id}</p>
                    <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-slate-700">Evidence</summary>
                      <pre className="mt-2 overflow-x-auto text-xs text-slate-600">{JSON.stringify(a.evidence, null, 2)}</pre>
                    </details>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end">
                    <Link
                      to={`/anomaly-flags/${appId}/${configId}/${a.id}/root-cause`}
                      className="inline-flex items-center gap-2 h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Root Cause
                    </Link>
                    <button
                      onClick={() => void acknowledgeOne(a.id)}
                      disabled={mutating}
                      className="inline-flex items-center gap-2 h-10 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-slate-400"
                    >
                      <Trash2 className="w-4 h-4" />
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedAnomaly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8">
          <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Root Cause Analysis</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Anomaly {selectedAnomaly.id}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  The full anomaly record is sent to the RCA engine as the analysis payload.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAnalysisPanel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                aria-label="Close root cause analysis panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-0 md:grid-cols-2">
              <div className="border-b border-slate-200 p-6 md:border-b-0 md:border-r">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Full anomaly record</p>
                    <h4 className="mt-1 text-base font-semibold text-slate-900">Source payload</h4>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedAnomaly.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {selectedAnomaly.severity}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Application</p>
                    <p className="mt-1 font-medium text-slate-800">{selectedAnomaly.application_id}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Config</p>
                    <p className="mt-1 font-medium text-slate-800">{selectedAnomaly.config_id}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Window time</p>
                    <p className="mt-1 font-medium text-slate-800">{new Date(selectedAnomaly.window_timestamp).toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Score</p>
                    <p className="mt-1 font-medium text-slate-800">{selectedAnomaly.score}</p>
                  </div>
                </div>

                <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4" open>
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">Complete payload JSON</summary>
                  <pre className="mt-3 max-h-[26rem] overflow-auto text-xs leading-5 text-slate-700">
                    {JSON.stringify(
                      {
                        id: selectedAnomaly.id,
                        application_id: selectedAnomaly.application_id,
                        config_id: selectedAnomaly.config_id,
                        window_timestamp: selectedAnomaly.window_timestamp,
                        score: selectedAnomaly.score,
                        severity: selectedAnomaly.severity,
                        root_cause: selectedAnomaly.root_cause,
                        evidence: selectedAnomaly.evidence,
                        created_at: selectedAnomaly.created_at,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">RCA engine response</p>
                    <h4 className="mt-1 text-base font-semibold text-slate-900">Analysis output</h4>
                  </div>
                </div>

                {analysisLoading ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Running root cause analysis...</div>
                ) : analysisError ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{analysisError}</div>
                ) : analysisResult ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Root cause</p>
                        <p className="mt-1 font-semibold text-slate-800">{analysisResult.root_cause}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Confidence</p>
                        <p className="mt-1 font-semibold text-slate-800">{analysisResult.confidence}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Affected component</p>
                        <p className="mt-1 font-semibold text-slate-800">{analysisResult.affected_component}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Analysis source</p>
                        <p className="mt-1 font-semibold text-slate-800">{analysisResult.analysis_source}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reasoning</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{analysisResult.reasoning}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recommended actions</p>
                      <ul className="mt-2 space-y-2 text-sm text-slate-700">
                        {analysisResult.recommended_actions.map((action) => (
                          <li key={action} className="rounded-lg bg-slate-50 px-3 py-2">
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <summary className="cursor-pointer text-sm font-medium text-slate-700">Raw RCA JSON</summary>
                      <pre className="mt-3 max-h-[18rem] overflow-auto text-xs leading-5 text-slate-700">{JSON.stringify(analysisResult, null, 2)}</pre>
                    </details>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    Click Root Cause again to run the RCA engine with the complete anomaly record.
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void runRootCauseAnalysis(selectedAnomaly)}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-slate-400"
                    disabled={analysisLoading}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Run RCA
                  </button>
                  <button
                    type="button"
                    onClick={closeAnalysisPanel}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnomalyFlagsPage;
