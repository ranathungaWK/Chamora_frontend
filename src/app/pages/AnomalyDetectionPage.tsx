import { ArrowLeft, AlertTriangle, Database, Layers, Settings, Save, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useEffect, useState } from 'react';
import { buildApiUrl } from '@/app/api';

interface EndpointResponse {
  id: number;
  application_id: number;
  target_name: string;
  container_name: string;
}

interface ApplicationResponse {
  id: number;
  name: string;
  endpoints: EndpointResponse[];
}

interface RuleConfig {
  latency_threshold: number;
  error_rate_threshold: number;
  failure_streak_limit: number;
  cpu_usage_threshold: number;
  memory_pressure_threshold: number;
  disk_io_threshold: number;
  cpu_node_ratio_threshold: number;
  is_active: boolean;
}

interface ConfigSummary {
  config_id: number;
  endpoint_id: number;
  endpoint_name: string;
  container_name: string;
  latency_threshold: number;
  error_rate_threshold: number;
  failure_streak_limit: number;
  cpu_usage_threshold: number;
  memory_pressure_threshold: number;
  disk_io_threshold: number;
  cpu_node_ratio_threshold: number;
  is_active: boolean;
  created_at: string;
  anomaly_count: number;
}

const DEFAULT_RULE_CONFIG: RuleConfig = {
  latency_threshold: 1.5,
  error_rate_threshold: 0.05,
  failure_streak_limit: 3,
  cpu_usage_threshold: 0.8,
  memory_pressure_threshold: 0.9,
  disk_io_threshold: 0.7,
  cpu_node_ratio_threshold: 0.5,
  is_active: true,
};

export function AnomalyDetectionPage() {
  const { appId } = useParams();
  const [appName, setAppName] = useState('Application');
  const [endpoints, setEndpoints] = useState<EndpointResponse[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState<number | null>(null);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [configMessage, setConfigMessage] = useState('');
  const [configMessageType, setConfigMessageType] = useState<'info' | 'success' | 'error'>('info');
  const [configSummaries, setConfigSummaries] = useState<ConfigSummary[]>([]);

  // Rule-based configuration fields (aligned with anomaly_config_registration schemas)
  const [ruleConfig, setRuleConfig] = useState<RuleConfig>(DEFAULT_RULE_CONFIG);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token || !appId) {
      setConfigMessage('Please log in to configure anomaly detection.');
      setConfigMessageType('error');
      return;
    }

    const loadAppEndpoints = async () => {
      setConfigMessage('');
      setConfigMessageType('info');
      try {
        const response = await fetch(buildApiUrl('/api/v1/application/me'), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load applications');
        }

        const applications = (await response.json()) as ApplicationResponse[];
        const currentApp = applications.find((app) => String(app.id) === String(appId));

        if (!currentApp) {
          setEndpoints([]);
          setConfigMessage('No matching application found for this dashboard.');
          setConfigMessageType('error');
          return;
        }

        setAppName(currentApp.name);
        setEndpoints(currentApp.endpoints ?? []);

        if ((currentApp.endpoints ?? []).length > 0) {
          setSelectedEndpointId(currentApp.endpoints[0].id);
        } else {
          setSelectedEndpointId(null);
          setConfigMessage('No endpoints found for this application. Add endpoints before configuring thresholds.');
          setConfigMessageType('info');
        }
      } catch (error) {
        setConfigMessage(error instanceof Error ? error.message : 'Failed to load endpoints');
        setConfigMessageType('error');
      }
    };

    void loadAppEndpoints();
  }, [appId]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token || !selectedEndpointId) {
      return;
    }

    const loadEndpointConfig = async () => {
      setIsLoadingConfig(true);
      setConfigMessage('');
      setConfigMessageType('info');
      try {
        const response = await fetch(buildApiUrl(`/api/v1/anomaly-configs/endpoint/${selectedEndpointId}`), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 404) {
          setHasExistingConfig(false);
          setRuleConfig(DEFAULT_RULE_CONFIG);
          setConfigMessage('No configuration found for this endpoint. Set thresholds and save to create one.');
          setConfigMessageType('info');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load endpoint configuration');
        }

        const data = (await response.json()) as RuleConfig;
        setRuleConfig({
          latency_threshold: data.latency_threshold,
          error_rate_threshold: data.error_rate_threshold,
          failure_streak_limit: data.failure_streak_limit,
          cpu_usage_threshold: data.cpu_usage_threshold,
          memory_pressure_threshold: data.memory_pressure_threshold,
          disk_io_threshold: data.disk_io_threshold,
          cpu_node_ratio_threshold: data.cpu_node_ratio_threshold,
          is_active: data.is_active,
        });
        setHasExistingConfig(true);
        setConfigMessage('Existing configuration loaded for selected endpoint.');
        setConfigMessageType('info');
      } catch (error) {
        setConfigMessage(error instanceof Error ? error.message : 'Failed to load configuration');
        setConfigMessageType('error');
      } finally {
        setIsLoadingConfig(false);
      }
    };

    void loadEndpointConfig();
  }, [selectedEndpointId]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token || !appId) {
      return;
    }

    const loadConfigSummaries = async () => {
      setIsLoadingSummaries(true);
      setSummaryError('');
      try {
        const response = await fetch(buildApiUrl(`/api/v1/anomaly-configs/application/${appId}/summary`), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load saved configurations');
        }

        const summaries = (await response.json()) as ConfigSummary[];
        setConfigSummaries(summaries);
      } catch (error) {
        setSummaryError(error instanceof Error ? error.message : 'Failed to load saved configurations');
        setConfigSummaries([]);
      } finally {
        setIsLoadingSummaries(false);
      }
    };

    void loadConfigSummaries();
  }, [appId, hasExistingConfig, isSavingConfig]);

  const handleSaveConfig = async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !selectedEndpointId) {
      setConfigMessage('Select an endpoint before saving configuration.');
      setConfigMessageType('error');
      return;
    }

    setIsSavingConfig(true);
    setConfigMessage('');
    setConfigMessageType('info');
    try {
      const endpointPath = `/api/v1/anomaly-configs/endpoint/${selectedEndpointId}`;
      const response = await fetch(
        buildApiUrl(hasExistingConfig ? endpointPath : '/api/v1/anomaly-configs/'),
        {
          method: hasExistingConfig ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(
            hasExistingConfig
              ? ruleConfig
              : {
                  endpoint_id: selectedEndpointId,
                  ...ruleConfig,
                },
          ),
        },
      );

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const detail =
          typeof errorPayload.detail === 'string'
            ? errorPayload.detail
            : hasExistingConfig
              ? 'Failed to update configuration'
              : 'Failed to create configuration';
        throw new Error(detail);
      }

      setHasExistingConfig(true);
      setConfigMessage('Rule-based configuration saved successfully.');
      setConfigMessageType('success');

      const refreshResponse = await fetch(buildApiUrl(`/api/v1/anomaly-configs/application/${appId}/summary`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (refreshResponse.ok) {
        const summaries = (await refreshResponse.json()) as ConfigSummary[];
        setConfigSummaries(summaries);
      }
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : 'Failed to save configuration');
      setConfigMessageType('error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation Bar */}
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
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
                  Anomaly Detection
                </h1>
                <p className="text-xs text-slate-600">{appName}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <Database className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-700 font-medium">{configSummaries.length} Saved Configurations</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Rule-Based Configuration Section */}
        <div className="mb-6 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-700 mb-1">Rule-Based System Configuration</h2>
              <p className="text-sm text-slate-500">Configure anomaly detection thresholds and activation settings.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <Settings className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-700">Configuration</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-800">Configuration Fields</h3>
              </div>
              <button
                onClick={handleSaveConfig}
                disabled={!selectedEndpointId || isSavingConfig || isLoadingConfig}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                {isSavingConfig ? 'Saving...' : hasExistingConfig ? 'Update Configuration' : 'Create Configuration'}
              </button>
            </div>

            <div className="mb-4">
              <label className="text-sm text-slate-600 mb-2 block font-medium">Select Endpoint</label>
              <select
                value={selectedEndpointId ?? ''}
                onChange={(e) => setSelectedEndpointId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {endpoints.length === 0 ? (
                  <option value="">No endpoints available</option>
                ) : (
                  endpoints.map((endpoint) => (
                    <option key={endpoint.id} value={endpoint.id}>
                      {endpoint.target_name} ({endpoint.container_name})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-slate-600 mb-2 block font-medium">Latency Threshold</label>
                <input
                  type="number"
                  step="0.01"
                  value={ruleConfig.latency_threshold}
                  onChange={(e) => setRuleConfig({ ...ruleConfig, latency_threshold: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-2 block font-medium">Error Rate Threshold</label>
                <input
                  type="number"
                  step="0.01"
                  value={ruleConfig.error_rate_threshold}
                  onChange={(e) => setRuleConfig({ ...ruleConfig, error_rate_threshold: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-2 block font-medium">Failure Streak Limit</label>
                <input
                  type="number"
                  value={ruleConfig.failure_streak_limit}
                  onChange={(e) => setRuleConfig({ ...ruleConfig, failure_streak_limit: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-2 block font-medium">CPU Usage Threshold</label>
                <input
                  type="number"
                  step="0.01"
                  value={ruleConfig.cpu_usage_threshold}
                  onChange={(e) => setRuleConfig({ ...ruleConfig, cpu_usage_threshold: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-2 block font-medium">Memory Pressure Threshold</label>
                <input
                  type="number"
                  step="0.01"
                  value={ruleConfig.memory_pressure_threshold}
                  onChange={(e) => setRuleConfig({ ...ruleConfig, memory_pressure_threshold: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-2 block font-medium">Disk I/O Threshold</label>
                <input
                  type="number"
                  step="0.01"
                  value={ruleConfig.disk_io_threshold}
                  onChange={(e) => setRuleConfig({ ...ruleConfig, disk_io_threshold: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-2 block font-medium">CPU Node Ratio Threshold</label>
                <input
                  type="number"
                  step="0.01"
                  value={ruleConfig.cpu_node_ratio_threshold}
                  onChange={(e) => setRuleConfig({ ...ruleConfig, cpu_node_ratio_threshold: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-2 block font-medium">Configuration Status</label>
                <div className="h-[50px] px-4 py-3 bg-white border-2 border-slate-300 rounded-lg flex items-center gap-2">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={ruleConfig.is_active}
                    onChange={(e) => setRuleConfig({ ...ruleConfig, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_active" className="text-sm text-slate-700 font-medium">Is Active</label>
                </div>
              </div>
            </div>

            {configMessage && (
              <div
                className={`mt-4 rounded-lg border px-4 py-3 text-sm font-medium ${
                  configMessageType === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : configMessageType === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-blue-200 bg-blue-50 text-blue-700'
                }`}
              >
                {configMessage}
              </div>
            )}

          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-700 mb-1 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Saved Configurations For This Application
              </h2>
              <p className="text-sm text-slate-500">Endpoint + container mapping and anomaly counts grouped by each saved configuration.</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-sky-50">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-sm text-indigo-700 font-medium">Live from database</span>
            </div>
          </div>

          {isLoadingSummaries ? (
            <p className="text-sm text-slate-600">Loading saved configurations...</p>
          ) : summaryError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {summaryError}
            </div>
          ) : configSummaries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-8 text-center">
              <p className="text-slate-700 font-semibold mb-1">No saved configurations found</p>
              <p className="text-sm text-slate-500">Create one from the section above and it will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {configSummaries.map((summary) => (
                <div
                  key={summary.config_id}
                  className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-indigo-50/40 to-sky-50/60 p-5 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Endpoint</p>
                      <h3 className="text-base font-bold text-slate-800 break-all">{summary.endpoint_name}</h3>
                      <p className="text-xs text-slate-600 mt-1">Container: {summary.container_name}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        summary.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {summary.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-3">
                    <p className="text-xs text-indigo-700 font-medium">Anomalies found for this configuration</p>
                    <p className="text-3xl font-bold text-indigo-700">{summary.anomaly_count}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-white px-2 py-1.5 border border-slate-200">
                      <span className="text-slate-500">Latency</span>
                      <p className="font-semibold text-slate-800">{summary.latency_threshold}</p>
                    </div>
                    <div className="rounded-lg bg-white px-2 py-1.5 border border-slate-200">
                      <span className="text-slate-500">Error Rate</span>
                      <p className="font-semibold text-slate-800">{summary.error_rate_threshold}</p>
                    </div>
                    <div className="rounded-lg bg-white px-2 py-1.5 border border-slate-200">
                      <span className="text-slate-500">CPU</span>
                      <p className="font-semibold text-slate-800">{summary.cpu_usage_threshold}</p>
                    </div>
                    <div className="rounded-lg bg-white px-2 py-1.5 border border-slate-200">
                      <span className="text-slate-500">Memory</span>
                      <p className="font-semibold text-slate-800">{summary.memory_pressure_threshold}</p>
                    </div>
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
