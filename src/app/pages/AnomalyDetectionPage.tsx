import { ArrowLeft, AlertTriangle, Database, Layers, Settings, Save, Sparkles, X } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useEffect, useState } from 'react';
import { buildApiUrl } from '@/app/api';

const ML_TRAINING_COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000;

function formatRemainingTime(durationMs: number): string {
  const safeDuration = Math.max(0, durationMs);
  const totalMinutes = Math.ceil(safeDuration / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getMlTrainingCooldown(createdAt: string, nowMs: number) {
  const createdAtMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdAtMs)) {
    return { isReady: true, remainingMs: 0 };
  }

  const elapsedMs = nowMs - createdAtMs;
  const remainingMs = ML_TRAINING_COOLDOWN_MS - elapsedMs;
  return {
    isReady: remainingMs <= 0,
    remainingMs: Math.max(0, remainingMs),
  };
}

function formatMetricScore(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : '-';
}

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
  ml_inference_need: boolean;
  created_at: string;
  anomaly_count: number;
}

interface ModelMetric {
  id: string;
  config_id: number;
  model_version: string;
  recall_score: number;
  precision_score: number;
  accuracy_score: number;
  f1_score: number;
  evaluation_type: string;
  is_promoted: boolean;
  created_at: string;
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
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
  const [isModelsModalOpen, setIsModelsModalOpen] = useState(false);
  const [selectedConfigForModels, setSelectedConfigForModels] = useState<ConfigSummary | null>(null);
  const [selectedConfigModels, setSelectedConfigModels] = useState<ModelMetric[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');

  // Rule-based configuration fields (aligned with anomaly_config_registration schemas)
  const [ruleConfig, setRuleConfig] = useState<RuleConfig>(DEFAULT_RULE_CONFIG);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 60000);

    return () => window.clearInterval(timerId);
  }, []);

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

  const handleEditConfigClick = (summary: ConfigSummary) => {
    // select the endpoint so the config panel loads for this endpoint
    setSelectedEndpointId(summary.endpoint_id);
    // scroll to the configuration section after state updates (allow brief delay)
    setTimeout(() => {
      const el = document.getElementById('rule-config-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  const handleViewModelsClick = async (summary: ConfigSummary) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setModelsError('Please log in to view model metrics.');
      setIsModelsModalOpen(true);
      setSelectedConfigForModels(summary);
      setSelectedConfigModels([]);
      return;
    }

    setSelectedConfigForModels(summary);
    setIsModelsModalOpen(true);
    setIsLoadingModels(true);
    setModelsError('');
    setSelectedConfigModels([]);

    try {
      const response = await fetch(buildApiUrl(`/api/v1/anomaly-configs/${summary.config_id}/models`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load model metrics');
      }

      const models = (await response.json()) as ModelMetric[];
      setSelectedConfigModels(models);
    } catch (error) {
      setModelsError(error instanceof Error ? error.message : 'Failed to load model metrics');
    } finally {
      setIsLoadingModels(false);
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
        <div id="rule-config-section" className="mb-6 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
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
                (() => {
                  const cooldown = getMlTrainingCooldown(summary.created_at, currentTimeMs);
                  const trainingButtonLabel = summary.ml_inference_need
                    ? 'Disable ML Training'
                    : cooldown.isReady
                      ? 'Start ML Training'
                      : `Starts in ${formatRemainingTime(cooldown.remainingMs)}`;

                  return (
                <div
                  key={summary.config_id}
                  className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-indigo-50/40 to-sky-50/60 p-6 min-h-[220px] flex flex-col justify-between shadow-sm transition-all hover:shadow-md"
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

                  <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-4">
                    <p className="text-xs text-indigo-700 font-medium">Anomalies found for this configuration</p>
                    <p className="text-3xl font-bold text-indigo-700">{summary.anomaly_count}</p>
                  </div>

                  <div className="mb-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">ML Training Window</p>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-700 font-medium">
                        {cooldown.isReady
                          ? 'Ready to start ML training'
                          : `Available in ${formatRemainingTime(cooldown.remainingMs)}`}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          cooldown.isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {cooldown.isReady ? 'Ready' : 'Not enough data'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleViewModelsClick(summary)}
                      className="mt-3 inline-flex items-center justify-center h-10 px-4 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
                    >
                      View Available Models
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-3 flex-wrap">
                    <button
                      onClick={async () => {
                        if (!summary.ml_inference_need && !cooldown.isReady) {
                          return;
                        }
                        const token = localStorage.getItem('access_token');
                        if (!token) return;
                        try {
                          const res = await fetch(buildApiUrl(`/api/v1/anomaly-configs/${summary.config_id}/ml-need/toggle`), {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          if (!res.ok) throw new Error('Failed to toggle ML need');
                          const updated = await res.json();
                          // update local state
                          setConfigSummaries((prev) => prev.map((s) => (s.config_id === updated.id ? { ...s, ml_inference_need: updated.ml_inference_need } : s)));
                        } catch (err) {
                          // eslint-disable-next-line no-console
                          console.error(err);
                        }
                      }}
                      // keep sizing consistent with other action buttons
                      disabled={!summary.ml_inference_need && !cooldown.isReady}
                      className={`inline-flex items-center justify-center h-11 px-4 rounded-lg text-sm font-medium transition min-w-[170px] ${
                        summary.ml_inference_need
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600 shadow-sm'
                          : cooldown.isReady
                            ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
                            : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {trainingButtonLabel}
                    </button>

                    <Link
                      to={`/anomaly-flags/${appId}/${summary.config_id}`}
                      className="inline-flex items-center justify-center h-11 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition min-w-[120px]"
                    >
                      View Flags
                    </Link>

                    <button
                      onClick={() => handleEditConfigClick(summary)}
                      className="inline-flex items-center justify-center h-11 px-4 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition min-w-[120px] shadow-sm"
                    >
                      Edit Config
                    </button>
                  </div>
                </div>
                  );
                })()
              ))}
            </div>
          )}
        </div>
      </div>

      {isModelsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Available Models</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  {selectedConfigForModels?.endpoint_name ?? 'Selected configuration'}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Model metrics loaded from the MLModelMetric table for this configuration.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModelsModalOpen(false);
                  setSelectedConfigForModels(null);
                  setSelectedConfigModels([]);
                  setModelsError('');
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                aria-label="Close model details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto p-6">
              {isLoadingModels ? (
                <p className="text-sm text-slate-600">Loading model metrics...</p>
              ) : modelsError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {modelsError}
                </div>
              ) : selectedConfigModels.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
                  <p className="font-semibold text-slate-800">No model metrics found</p>
                  <p className="mt-1 text-sm text-slate-500">Train or promote a model for this config to see its metrics here.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr] gap-0 bg-slate-900 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white">
                    <div>Model</div>
                    <div>F1</div>
                    <div>Accuracy</div>
                    <div>Recall</div>
                    <div>Precision</div>
                    <div>Evaluated Type</div>
                    <div>Created</div>
                  </div>
                  <div className="divide-y divide-slate-200 bg-white">
                    {selectedConfigModels.map((model) => (
                      <div
                        key={model.id}
                        className={`grid grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr] gap-0 px-4 py-4 text-sm ${
                          model.is_promoted ? 'bg-emerald-50/70' : ''
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{model.model_version}</p>
                          <p className="text-xs text-slate-500">{model.is_promoted ? 'Promoted model' : 'Historical model'}</p>
                        </div>
                        <div className="font-medium text-slate-700">{formatMetricScore(model.f1_score)}</div>
                        <div className="font-medium text-slate-700">{formatMetricScore(model.accuracy_score)}</div>
                        <div className="font-medium text-slate-700">{formatMetricScore(model.recall_score)}</div>
                        <div className="font-medium text-slate-700">{formatMetricScore(model.precision_score)}</div>
                        <div className="text-slate-700">{model.evaluation_type}</div>
                        <div className="text-slate-700">{new Date(model.created_at).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
