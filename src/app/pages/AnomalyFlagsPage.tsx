import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useEffect, useState } from 'react';
import { buildApiUrl } from '@/app/api';

interface AnomalyItem {
  id: string;
  window_timestamp: string;
  severity: string;
  root_cause?: string | null;
}

export function AnomalyFlagsPage() {
  const { appId, configId } = useParams();
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!configId) return;
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const resp = await fetch(buildApiUrl(`/api/v1/anomalies/config/${configId}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) {
          if (resp.status === 404) {
            setAnomalies([]);
            return;
          }
          throw new Error('Failed to load anomalies');
        }
        const data = (await resp.json()) as AnomalyItem[];
        setAnomalies(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [configId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to={`/anomaly-detection/${appId ?? ''}`} className="inline-flex items-center justify-center w-10 h-10 bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Anomaly Flags</h1>
            <p className="text-sm text-slate-500">Viewing flags for configuration {configId}</p>
          </div>
        </div>
      </nav>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white/80 border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Identified Anomalies</h2>

          {loading ? (
            <p className="text-sm text-slate-600">Loading anomalies...</p>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
          ) : anomalies.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-8 text-center">
              <p className="text-slate-700 font-semibold mb-1">No anomalies found</p>
              <p className="text-sm text-slate-500">No flags have been recorded for this configuration yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div>
                      <p className="font-medium text-slate-800">{a.root_cause ?? `Anomaly ${a.severity}`}</p>
                      <p className="text-sm text-slate-500">Severity: <span className={`font-semibold ${a.severity === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`}>{a.severity}</span></p>
                      <p className="text-xs text-slate-400">{new Date(a.window_timestamp).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert(a.root_cause ?? 'No root cause available')}
                        className="inline-flex items-center h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                      >
                        Root Cause
                      </button>
                      <button
                        onClick={() => console.log('Inspect', a.id)}
                        className="inline-flex items-center h-10 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnomalyFlagsPage;
