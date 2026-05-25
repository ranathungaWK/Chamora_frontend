import { ArrowLeft, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useEffect, useState } from 'react';
import { buildApiUrl } from '@/app/api';

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
  correlations: {
    memory_issue: boolean;
    cpu_issue: boolean;
    io_issue: boolean;
    infrastructure_issue: boolean;
    application_issue: boolean;
  };
  metrics_summary: {
    cpu_usage_pct: number;
    memory_usage_gb: number;
    memory_pressure_pct: number;
    memory_growth_mbps: number;
    latency_p95_ms: number;
    error_rate_pct: number;
    disk_io_pct: number;
    net_throughput_mbps: number;
    failure_streak: number;
  };
  analysis_source: string;
  created_at: string;
}

export function RootCauseAnalysisPage() {
  const { appId, configId, anomalyId } = useParams();
  const [anomaly, setAnomaly] = useState<AnomalyItem | null>(null);
  const [analysis, setAnalysis] = useState<RootCauseAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAndAnalyze = async () => {
      if (!anomalyId) {
        setError('Missing anomaly id.');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Please log in to view root cause analysis.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const anomalyResponse = await fetch(buildApiUrl(`/api/v1/anomaly-flags/${anomalyId}`), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!anomalyResponse.ok) {
          throw new Error('Failed to load anomaly details');
        }

        const anomalyPayload = (await anomalyResponse.json()) as AnomalyItem;
        setAnomaly(anomalyPayload);

        setRunningAnalysis(true);
        const analysisResponse = await fetch(buildApiUrl('/api/v1/analyze'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            record: {
              id: anomalyPayload.id,
              application_id: anomalyPayload.application_id,
              config_id: anomalyPayload.config_id,
              window_timestamp: anomalyPayload.window_timestamp,
              anomaly_score: anomalyPayload.score,
              severity: anomalyPayload.severity,
              root_cause: anomalyPayload.root_cause ?? undefined,
              evidence: anomalyPayload.evidence,
            },
          }),
        });

        if (!analysisResponse.ok) {
          throw new Error('Failed to run root cause analysis');
        }

        const analysisPayload = (await analysisResponse.json()) as RootCauseAnalysisResult;
        setAnalysis(analysisPayload);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setAnomaly(null);
        setAnalysis(null);
      } finally {
        setLoading(false);
        setRunningAnalysis(false);
      }
    };

    void loadAndAnalyze();
  }, [anomalyId]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="border-b border-slate-200 bg-white/90 px-6 py-4 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link to={`/anomaly-flags/${appId ?? ''}/${configId ?? ''}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Root Cause Analysis</h1>
            <p className="text-sm text-slate-500">Anomaly {anomalyId ?? '-'} for configuration {configId ?? '-'}</p>
          </div>
        </div>
      </nav>

      <div className="p-6">
        <div className="rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading anomaly and running RCA...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
          ) : anomaly && analysis ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className={`h-5 w-5 ${anomaly.severity === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`} />
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Anomaly record</h2>
                    <p className="text-sm text-slate-500">The complete anomaly payload sent to the RCA engine.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Severity</p>
                    <p className={`mt-1 font-semibold ${anomaly.severity === 'CRITICAL' ? 'text-red-700' : 'text-amber-700'}`}>{anomaly.severity}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Score</p>
                    <p className="mt-1 font-semibold text-slate-800">{anomaly.score}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Window time</p>
                    <p className="mt-1 font-semibold text-slate-800">{new Date(anomaly.window_timestamp).toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Config</p>
                    <p className="mt-1 font-semibold text-slate-800">{anomaly.config_id}</p>
                  </div>
                </div>

                <details className="rounded-xl border border-slate-200 bg-slate-50 p-4" open>
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">Full anomaly payload</summary>
                  <pre className="mt-3 max-h-[24rem] overflow-auto text-xs leading-5 text-slate-700">
                    {JSON.stringify(anomaly, null, 2)}
                  </pre>
                </details>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">RCA result</h2>
                    <p className="text-sm text-slate-500">Analysis output from the root cause engine.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Root cause</p>
                    <p className="mt-1 font-semibold text-slate-800">{analysis.root_cause}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Confidence</p>
                    <p className="mt-1 font-semibold text-slate-800">{analysis.confidence}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Affected component</p>
                    <p className="mt-1 font-semibold text-slate-800">{analysis.affected_component}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Source</p>
                    <p className="mt-1 font-semibold text-slate-800">{analysis.analysis_source}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reasoning</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{analysis.reasoning}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recommended actions</p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {analysis.recommended_actions.map((action) => (
                      <li key={action} className="rounded-lg bg-slate-50 px-3 py-2">{action}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Metrics summary</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                    <div><span className="text-slate-500">CPU</span><p className="font-semibold text-slate-800">{analysis.metrics_summary.cpu_usage_pct}</p></div>
                    <div><span className="text-slate-500">Memory GB</span><p className="font-semibold text-slate-800">{analysis.metrics_summary.memory_usage_gb}</p></div>
                    <div><span className="text-slate-500">Pressure %</span><p className="font-semibold text-slate-800">{analysis.metrics_summary.memory_pressure_pct}</p></div>
                    <div><span className="text-slate-500">Growth MB/s</span><p className="font-semibold text-slate-800">{analysis.metrics_summary.memory_growth_mbps}</p></div>
                    <div><span className="text-slate-500">Latency P95</span><p className="font-semibold text-slate-800">{analysis.metrics_summary.latency_p95_ms}</p></div>
                    <div><span className="text-slate-500">Errors %</span><p className="font-semibold text-slate-800">{analysis.metrics_summary.error_rate_pct}</p></div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Raw RCA JSON</p>
                  <pre className="mt-3 max-h-[18rem] overflow-auto text-xs leading-5 text-slate-700">{JSON.stringify(analysis, null, 2)}</pre>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    disabled={runningAnalysis}
                    className="inline-flex items-center gap-2 h-11 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-slate-400"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Run RCA Again
                  </button>
                  <Link
                    to={`/anomaly-flags/${appId ?? ''}/${configId ?? ''}`}
                    className="inline-flex items-center justify-center h-11 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Back to Flags
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default RootCauseAnalysisPage;