import { 
  Activity, 
  AlertTriangle, 
  MessageCircle, 
  Server, 
  ArrowLeft, 
  TrendingUp, 
  BarChart3, 
  ChevronRight, 
  FolderOpen, 
  FileText, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  Upload,
  Database,
  LineChart,
  Target,
  Plus,
  Edit2,
  Check,
  X,
  GitBranch,
  HeartPulse,
  ExternalLink
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { buildApiUrl } from '../api';
import { cachedFetch, invalidateCache } from '../lib/apiCache';
import {
  ApplicationDetails,
  ApplicationEndpoint,
  fetchApplicationDetails,
  updateVictoriaMetricsUrl,
  updateGrafanaUrl,
  updateGithubRepo,
  updateHealthEndpoint,
  addApplicationEndpoint,
  updateApplicationEndpoint,
  deleteApplicationEndpoint
} from '../services/applicationApi';

interface AnomalyConfig {
  id: number;
  endpoint_id: number;
  is_active: boolean;
}

interface UserApplication {
  id: number;
  name: string;
  endpoints?: Array<{ id: number }>;
}

interface DocumentRecord {
  id: number;
  file_name: string;
  storage_path: string;
}

export function ApplicationDashboard() {
  const { appId } = useParams();

  const [appDetails, setAppDetails] = useState<ApplicationDetails | null>(null);
  const [appName, setAppName] = useState('Loading...');
  const [appHealthStatus, setAppHealthStatus] = useState<'active' | 'inactive' | 'loading'>('loading');
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState('');
  const [configuredEndpointCount, setConfiguredEndpointCount] = useState(0);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [documentsError, setDocumentsError] = useState('');
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
  const [cyclesCount, setCyclesCount] = useState<number | null>(null);
  const [isLoadingCycles, setIsLoadingCycles] = useState(true);

  // --- Modal States ---
  // 1. Victoria Metrics Modal
  const [isVmModalOpen, setIsVmModalOpen] = useState(false);
  const [vmInput, setVmInput] = useState('');
  const [isSavingVm, setIsSavingVm] = useState(false);
  const [vmModalError, setVmModalError] = useState('');

  // 2. Grafana Modal
  const [isGrafanaModalOpen, setIsGrafanaModalOpen] = useState(false);
  const [grafanaInput, setGrafanaInput] = useState('');
  const [isSavingGrafana, setIsSavingGrafana] = useState(false);
  const [grafanaModalError, setGrafanaModalError] = useState('');

  // 3. GitHub Repo Modal
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [githubInput, setGithubInput] = useState('');
  const [isSavingGithub, setIsSavingGithub] = useState(false);
  const [githubModalError, setGithubModalError] = useState('');

  // 4. Health Endpoint Modal
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [healthInput, setHealthInput] = useState('');
  const [isSavingHealth, setIsSavingHealth] = useState(false);
  const [healthModalError, setHealthModalError] = useState('');

  // 5. Targets Modal
  const [isTargetsModalOpen, setIsTargetsModalOpen] = useState(false);
  const [targetsList, setTargetsList] = useState<ApplicationEndpoint[]>([]);
  const [newTargetName, setNewTargetName] = useState('');
  const [newContainerName, setNewContainerName] = useState('');
  const [isAddingTarget, setIsAddingTarget] = useState(false);
  const [targetModalError, setTargetModalError] = useState('');
  
  // Inline edit target
  const [editingTargetId, setEditingTargetId] = useState<number | null>(null);
  const [editTargetName, setEditTargetName] = useState('');
  const [editContainerName, setEditContainerName] = useState('');
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);
  const [deletingTargetId, setDeletingTargetId] = useState<number | null>(null);

  const loadDocuments = async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !appId) {
      setDocuments([]);
      setIsLoadingDocuments(false);
      return;
    }

    setIsLoadingDocuments(true);
    setDocumentsError('');

    try {
      const response = await cachedFetch(buildApiUrl(`/api/v1/documents/${appId}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? 'Failed to load documents');
      }

      const documentList = (await response.json()) as DocumentRecord[];
      setDocuments(documentList);
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : 'Failed to load documents');
      setDocuments([]);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const removeDocument = async (documentId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setDocumentsError('Not authenticated');
      return;
    }

    setDeletingDocumentId(documentId);
    setDocumentsError('');

    try {
      const response = await fetch(buildApiUrl(`/api/v1/documents/${documentId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? 'Failed to delete document');
      }

      // Invalidate documents cache so back-navigation sees updated list
      invalidateCache(`/api/v1/documents/${appId}`);
      await loadDocuments();
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : 'Failed to delete document');
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const loadConfigStatus = async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !appId) {
      setIsLoadingConfig(false);
      setIsLoadingCycles(false);
      setConfiguredEndpointCount(0);
      setIsLoadingDocuments(false);
      setCyclesCount(0);
      return;
    }

    setIsLoadingConfig(true);
    setIsLoadingCycles(true);
    setConfigError('');

    try {
      const [appDetailsRes, configsResponse, cyclesResponse] = await Promise.all([
        fetchApplicationDetails(appId).catch(() => null),
        fetch(buildApiUrl('/api/v1/anomaly-configs'), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => null),
        cachedFetch(buildApiUrl(`/api/v1/test-cycles?application_id=${appId}`), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => null),
      ]);

      if (appDetailsRes) {
        setAppDetails(appDetailsRes);
        setAppName(appDetailsRes.name);
        setTargetsList(appDetailsRes.endpoints || []);
      } else {
        // Fallback to /application/me
        const appsResponse = await cachedFetch(buildApiUrl('/api/v1/application/me'), {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
        if (appsResponse && appsResponse.ok) {
          const appsContentType = appsResponse.headers.get('content-type') || '';
          if (appsContentType.includes('application/json')) {
            const applications = (await appsResponse.json()) as UserApplication[];
            const currentApp = applications.find((app) => String(app.id) === String(appId));
            if (currentApp) {
              setAppName(currentApp.name);
            }
          }
        }
      }

      if (configsResponse && configsResponse.ok) {
        const configsContentType = configsResponse.headers.get('content-type') || '';
        if (configsContentType.includes('application/json')) {
          const allConfigs = (await configsResponse.json()) as AnomalyConfig[];
          const endpointIds = new Set((appDetailsRes?.endpoints ?? []).map((endpoint) => endpoint.id));
          const appConfigCount = allConfigs.filter((config) => endpointIds.has(config.endpoint_id)).length;
          setConfiguredEndpointCount(appConfigCount);
        } else {
          setConfiguredEndpointCount(0);
        }
      } else {
        setConfiguredEndpointCount(0);
      }

      if (cyclesResponse.ok) {
        const cyclesList = (await cyclesResponse.json()) as Array<{ status: string }>;
        const completedCount = cyclesList.filter(
          (c) => c.status === 'completed' || c.status === 'passed'
        ).length;
        setCyclesCount(completedCount);
      } else {
        setCyclesCount(0);
      }
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Failed to load configurations');
      setConfiguredEndpointCount(0);
      setCyclesCount(0);
    } finally {
      setIsLoadingConfig(false);
      setIsLoadingCycles(false);
    }

    try {
      const healthRes = await cachedFetch(buildApiUrl(`/api/v1/application/${appId}/health-check`), {
        headers: { Authorization: `Bearer ${token}` }
      }, 30_000);
      const healthData = await healthRes.json();
      setAppHealthStatus(healthData.status);
    } catch {
      setAppHealthStatus('inactive');
    }
  };

  useEffect(() => {
    void loadConfigStatus();
    void loadDocuments();
  }, [appId]);

  // --- Handlers for Modals ---

  // Victoria Metrics Handler
  const handleOpenVmModal = () => {
    setVmInput(appDetails?.victoria_metrics_url || '');
    setVmModalError('');
    setIsVmModalOpen(true);
  };

  const handleSaveVmUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId) return;
    setIsSavingVm(true);
    setVmModalError('');
    try {
      const updatedApp = await updateVictoriaMetricsUrl(appId, vmInput);
      setAppDetails(updatedApp);
      setIsVmModalOpen(false);
    } catch (err) {
      setVmModalError(err instanceof Error ? err.message : 'Failed to update Victoria Metrics URL');
    } finally {
      setIsSavingVm(false);
    }
  };

  // Grafana Handler
  const handleOpenGrafanaModal = () => {
    setGrafanaInput(appDetails?.grafana_url || '');
    setGrafanaModalError('');
    setIsGrafanaModalOpen(true);
  };

  const handleSaveGrafanaUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId) return;
    setIsSavingGrafana(true);
    setGrafanaModalError('');
    try {
      const updatedApp = await updateGrafanaUrl(appId, grafanaInput);
      setAppDetails(updatedApp);
      setIsGrafanaModalOpen(false);
    } catch (err) {
      setGrafanaModalError(err instanceof Error ? err.message : 'Failed to update Grafana URL');
    } finally {
      setIsSavingGrafana(false);
    }
  };

  // GitHub Repo Handler
  const handleOpenGithubModal = () => {
    setGithubInput(appDetails?.github_repo || '');
    setGithubModalError('');
    setIsGithubModalOpen(true);
  };

  const handleSaveGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId) return;
    setIsSavingGithub(true);
    setGithubModalError('');
    try {
      const updatedApp = await updateGithubRepo(appId, githubInput);
      setAppDetails(updatedApp);
      setIsGithubModalOpen(false);
    } catch (err) {
      setGithubModalError(err instanceof Error ? err.message : 'Failed to update GitHub repository');
    } finally {
      setIsSavingGithub(false);
    }
  };

  // Health Endpoint Handler
  const handleOpenHealthModal = () => {
    setHealthInput(appDetails?.health_endpoint || '');
    setHealthModalError('');
    setIsHealthModalOpen(true);
  };

  const handleSaveHealth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId) return;
    setIsSavingHealth(true);
    setHealthModalError('');
    try {
      const updatedApp = await updateHealthEndpoint(appId, healthInput);
      setAppDetails(updatedApp);
      setIsHealthModalOpen(false);
      // Re-trigger health check ping
      const token = localStorage.getItem('access_token');
      if (token) {
        setAppHealthStatus('loading');
        try {
          // Invalidate health cache so fresh check is performed
          invalidateCache(`/api/v1/application/${appId}/health-check`);
          const healthRes = await fetch(buildApiUrl(`/api/v1/application/${appId}/health-check`), {
            headers: { Authorization: `Bearer ${token}` }
          });
          const healthData = await healthRes.json();
          setAppHealthStatus(healthData.status);
        } catch {
          setAppHealthStatus('inactive');
        }
      }
    } catch (err) {
      setHealthModalError(err instanceof Error ? err.message : 'Failed to update health endpoint');
    } finally {
      setIsSavingHealth(false);
    }
  };

  // Targets Modal Handlers
  const handleOpenTargetsModal = () => {
    setTargetsList(appDetails?.endpoints || []);
    setNewTargetName('');
    setNewContainerName('');
    setEditingTargetId(null);
    setTargetModalError('');
    setIsTargetsModalOpen(true);
  };

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId || !newTargetName.trim() || !newContainerName.trim()) return;
    setIsAddingTarget(true);
    setTargetModalError('');
    try {
      const created = await addApplicationEndpoint(appId, newTargetName, newContainerName);
      const updated = [...targetsList, created];
      setTargetsList(updated);
      if (appDetails) {
        setAppDetails({ ...appDetails, endpoints: updated });
      }
      setNewTargetName('');
      setNewContainerName('');
    } catch (err) {
      setTargetModalError(err instanceof Error ? err.message : 'Failed to add target');
    } finally {
      setIsAddingTarget(false);
    }
  };

  const handleStartEditTarget = (ep: ApplicationEndpoint) => {
    setEditingTargetId(ep.id);
    setEditTargetName(ep.target_name);
    setEditContainerName(ep.container_name);
    setTargetModalError('');
  };

  const handleSaveEditTarget = async (endpointId: number) => {
    if (!appId || !editTargetName.trim() || !editContainerName.trim()) return;
    setIsUpdatingTarget(true);
    setTargetModalError('');
    try {
      const updated = await updateApplicationEndpoint(appId, endpointId, editTargetName, editContainerName);
      const nextList = targetsList.map((ep) => (ep.id === endpointId ? updated : ep));
      setTargetsList(nextList);
      if (appDetails) {
        setAppDetails({ ...appDetails, endpoints: nextList });
      }
      setEditingTargetId(null);
    } catch (err) {
      setTargetModalError(err instanceof Error ? err.message : 'Failed to update target');
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  const handleDeleteTarget = async (endpointId: number) => {
    if (!appId) return;
    setDeletingTargetId(endpointId);
    setTargetModalError('');
    try {
      await deleteApplicationEndpoint(appId, endpointId);
      const nextList = targetsList.filter((ep) => ep.id !== endpointId);
      setTargetsList(nextList);
      if (appDetails) {
        setAppDetails({ ...appDetails, endpoints: nextList });
      }
    } catch (err) {
      setTargetModalError(err instanceof Error ? err.message : 'Failed to delete target');
    } finally {
      setDeletingTargetId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Bar */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center justify-center w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg text-blue-900 flex items-center justify-center shadow-sm">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-blue-900">
                {appName}
              </h1>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
            appHealthStatus === 'active' ? 'bg-emerald-100 border-emerald-200' : 
            appHealthStatus === 'loading' ? 'bg-blue-100 border-blue-200' : 'bg-red-100 border-red-200'
          }`}>
            {appHealthStatus === 'active' ? (
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            ) : appHealthStatus === 'loading' ? (
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            ) : (
              <div className="w-2 h-2 bg-red-500 rounded-full" />
            )}
            <span className={`font-medium ${
              appHealthStatus === 'active' ? 'text-emerald-700' : 
              appHealthStatus === 'loading' ? 'text-blue-700' : 'text-red-700'
            }`}>
              {appHealthStatus === 'active' ? 'Active' : appHealthStatus === 'loading' ? 'Loading' : 'Inactive'}
            </span>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Content */}
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Application Details Card */}
        <div className="mb-6 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-600" />
                Application Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage connection endpoints, repository, and monitored target services</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleOpenGithubModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold transition-all shadow-xs"
              >
                <GitBranch className="w-3.5 h-3.5 text-slate-600" />
                GitHub Repo
              </button>
              <button
                onClick={handleOpenHealthModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold transition-all shadow-xs"
              >
                <HeartPulse className="w-3.5 h-3.5 text-emerald-600" />
                Health Endpoint
              </button>
              <button
                onClick={handleOpenVmModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition-all shadow-xs"
              >
                <Database className="w-3.5 h-3.5 text-blue-600" />
                Victoria Metrics
              </button>
              <button
                onClick={handleOpenGrafanaModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold transition-all shadow-xs"
              >
                <LineChart className="w-3.5 h-3.5 text-slate-600" />
                Grafana URL
              </button>
              <button
                onClick={handleOpenTargetsModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 text-white hover:bg-slate-800 rounded-lg text-xs font-semibold transition-all shadow-xs"
              >
                <Target className="w-3.5 h-3.5 text-blue-300" />
                Manage Targets ({appDetails?.endpoints?.length ?? 0})
              </button>
            </div>
          </div>

          {/* Details Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 pt-5">
            {/* Name */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Application Name</p>
              <p className="text-blue-900 font-bold text-base">{appName}</p>
            </div>

            {/* GitHub Repo */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GitHub Repo</p>
                <button
                  onClick={handleOpenGithubModal}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Change
                </button>
              </div>
              <p className="text-sm font-mono text-slate-700 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 truncate">
                {appDetails?.github_repo ? appDetails.github_repo : <span className="text-slate-400 font-sans italic">Not configured</span>}
              </p>
            </div>

            {/* Health Check Endpoint */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Health Endpoint</p>
                <button
                  onClick={handleOpenHealthModal}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Change
                </button>
              </div>
              <p className="text-sm font-mono text-slate-700 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 truncate">
                {appDetails?.health_endpoint ? appDetails.health_endpoint : <span className="text-slate-400 font-sans italic">Not configured</span>}
              </p>
            </div>

            {/* Victoria Metrics Endpoint */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Victoria Metrics</p>
                <button
                  onClick={handleOpenVmModal}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Change
                </button>
              </div>
              <p className="text-sm font-mono text-slate-700 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 truncate">
                {appDetails?.victoria_metrics_url ? appDetails.victoria_metrics_url : <span className="text-slate-400 font-sans italic">Not configured</span>}
              </p>
            </div>

            {/* Grafana Endpoint */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Grafana Dashboard</p>
                <button
                  onClick={handleOpenGrafanaModal}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Change
                </button>
              </div>
              <p className="text-sm font-mono text-slate-700 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 truncate">
                {appDetails?.grafana_url ? appDetails.grafana_url : <span className="text-slate-400 font-sans italic">Not configured</span>}
              </p>
            </div>
          </div>

          {/* Targets Summary Chips */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 mr-1">Active Targets:</span>
              {(appDetails?.endpoints && appDetails.endpoints.length > 0) ? (
                appDetails.endpoints.map((ep) => (
                  <span
                    key={ep.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-900 border border-blue-200"
                  >
                    <span className="font-semibold">{ep.target_name}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-mono text-[11px] text-blue-700">{ep.container_name}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No targets configured yet</span>
              )}
            </div>
            <button
              onClick={handleOpenTargetsModal}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold inline-flex items-center gap-1 underline underline-offset-2"
            >
              Configure Target Containers →
            </button>
          </div>
        </div>

        {/* Anomaly Detection & Test Cycle Comparison - Two Separate Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Anomaly Detection Card */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <AlertTriangle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-900">Anomaly Detection</h3>
                <p className="text-sm text-slate-600">Performance anomaly monitoring</p>
              </div>
            </div>

            {/* Anomaly Count Display */}
            <div className="mb-6 p-6 bg-blue-200 border-2 border-blue-300 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-600">Anomaly Configuration</p>
                {configuredEndpointCount > 0 && !isLoadingConfig && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                )}
              </div>

              {isLoadingConfig ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <p className="text-sm text-slate-600">Loading anomaly configuration status...</p>
                </div>
              ) : configError ? (
                <p className="text-sm text-red-700">{configError}</p>
              ) : configuredEndpointCount === 0 ? (
                <p className="text-sm text-amber-800 font-medium">
                  You haven&apos;t configured anomaly detection yet. Add a configuration to start monitoring this application.
                </p>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-amber-600">{configuredEndpointCount}</span>
                    <span className="text-lg text-slate-600">configured endpoints</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-2 font-medium">Configuration is active for anomaly monitoring.</p>
                </>
              )}
            </div>

            {/* View Details Button */}
            <Link
              to={`/anomaly-detection/${appId}`}
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-semibold group"
            >
              View Anomaly Details
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Test Cycle Comparison Card */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-900">Test Cycle Comparison</h3>
                <p className="text-sm text-slate-600">Compare test results across cycles</p>
              </div>
            </div>

            {/* Test Cycles Info Display */}
            <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-emerald-50 border-2 border-blue-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-600">Available Test Cycles</p>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              {isLoadingCycles ? (
                <div className="flex items-center gap-2 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <p className="text-xs text-slate-500">Loading cycles...</p>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-blue-600">{cyclesCount ?? 0}</span>
                    <span className="text-lg text-slate-600">cycles</span>
                  </div>
                  <p className="text-sm text-blue-700 mt-2 font-medium">
                    {(cyclesCount ?? 0) >= 1 ? '✓ Ready for comparison' : 'No completed cycles available'}
                  </p>
                </>
              )}
            </div>

            {/* Compare Button */}
            <Link
              to={`/test-cycle-comparison/${appId}`}
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-blue-900 text-white rounded-lg hover:bg-slate-800 transition-all shadow-md hover:shadow-lg font-semibold group"
            >
              Compare Test Cycles
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Documents Panel */}
        <div className="mb-6 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <FolderOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-900">Documents</h3>
                <p className="text-sm text-slate-600">Uploaded files for this application</p>
              </div>
            </div>
            <Link
              to={`/onboarding/${appId}/3`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-900 text-white rounded-lg hover:bg-slate-800 transition-all shadow-md hover:shadow-lg font-semibold"
            >
              <Upload className="w-4 h-4" />
              Add Documents
            </Link>
          </div>

          {documentsError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4" />
              {documentsError}
            </div>
          )}

          {isLoadingDocuments ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Loading uploaded documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-700 font-semibold mb-1">No documents uploaded yet</p>
              <p className="text-sm text-slate-500 mb-4">Add files from onboarding phase 3 to keep application artifacts in one place.</p>
              <Link
                to={`/onboarding/${appId}/3`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-all font-medium"
              >
                <Upload className="w-4 h-4" />
                Upload documents
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-blue-900 truncate">{doc.file_name}</p>
                      <p className="text-xs text-slate-500 break-all">{doc.storage_path}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => void removeDocument(doc.id)}
                    disabled={deletingDocumentId === doc.id}
                    className="inline-flex items-center gap-2 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                  >
                    {deletingDocumentId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Victoria Metrics Endpoint Popup                                  */}
      {/* ========================================================================= */}
      {isVmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center border border-blue-200">
                  <Database className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900">Victoria Metrics Endpoint</h3>
                  <p className="text-xs text-slate-500">Configure metrics query connection URL</p>
                </div>
              </div>
              <button
                onClick={() => setIsVmModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveVmUrl(e)}>
              <div className="p-6 space-y-4">
                {vmModalError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{vmModalError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Victoria Metrics URL
                  </label>
                  <input
                    type="text"
                    value={vmInput}
                    onChange={(e) => setVmInput(e.target.value)}
                    placeholder="http://localhost:8428 or http://victoria-metrics:8428"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    This endpoint is queried by the retriever and anomaly detection service for metric calculations.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsVmModalOpen(false)}
                  disabled={isSavingVm}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingVm}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                  {isSavingVm && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Endpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Grafana Endpoint Popup                                           */}
      {/* ========================================================================= */}
      {isGrafanaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center border border-slate-200">
                  <LineChart className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900">Grafana Endpoint</h3>
                  <p className="text-xs text-slate-500">Configure Grafana visualization dashboard URL</p>
                </div>
              </div>
              <button
                onClick={() => setIsGrafanaModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveGrafanaUrl(e)}>
              <div className="p-6 space-y-4">
                {grafanaModalError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{grafanaModalError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Grafana Dashboard URL
                  </label>
                  <input
                    type="text"
                    value={grafanaInput}
                    onChange={(e) => setGrafanaInput(e.target.value)}
                    placeholder="http://localhost:3000 or http://grafana:3000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Used for direct links and metric dashboard visualizations in reports.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsGrafanaModalOpen(false)}
                  disabled={isSavingGrafana}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingGrafana}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                  {isSavingGrafana && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Endpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: GitHub Repository Popup                                          */}
      {/* ========================================================================= */}
      {isGithubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 text-slate-800 rounded-xl flex items-center justify-center border border-slate-200">
                  <GitBranch className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900">GitHub Repository</h3>
                  <p className="text-xs text-slate-500">Configure connected repository for source analysis</p>
                </div>
              </div>
              <button
                onClick={() => setIsGithubModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveGithub(e)}>
              <div className="p-6 space-y-4">
                {githubModalError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{githubModalError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    GitHub Repository URL / Slug
                  </label>
                  <input
                    type="text"
                    value={githubInput}
                    onChange={(e) => setGithubInput(e.target.value)}
                    placeholder="e.g. organization/repo-name or https://github.com/org/repo"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Referenced by the root cause analysis and recommendation modules for code analysis.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsGithubModalOpen(false)}
                  disabled={isSavingGithub}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingGithub}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                  {isSavingGithub && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Repository
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Health Check Endpoint Popup                                      */}
      {/* ========================================================================= */}
      {isHealthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center border border-emerald-200">
                  <HeartPulse className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900">Health Check Endpoint</h3>
                  <p className="text-xs text-slate-500">Configure live service availability check URL</p>
                </div>
              </div>
              <button
                onClick={() => setIsHealthModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveHealth(e)}>
              <div className="p-6 space-y-4">
                {healthModalError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{healthModalError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Health Check URL
                  </label>
                  <input
                    type="text"
                    value={healthInput}
                    onChange={(e) => setHealthInput(e.target.value)}
                    placeholder="http://localhost:8080/actuator/health or http://localhost:8000/health"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Polled periodically to reflect the live status badge (Active/Inactive) on the navigation header.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsHealthModalOpen(false)}
                  disabled={isSavingHealth}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingHealth}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                  {isSavingHealth && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Endpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: Manage Monitored Targets Popup                                   */}
      {/* ========================================================================= */}
      {isTargetsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center border border-blue-200">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900">Monitored Targets</h3>
                  <p className="text-xs text-slate-500">Add, edit, or remove application target endpoints and containers</p>
                </div>
              </div>
              <button
                onClick={() => setIsTargetsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {targetModalError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{targetModalError}</span>
                </div>
              )}

              {/* Add New Target Form */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  Add New Monitored Target
                </h4>
                <form onSubmit={(e) => void handleAddTarget(e)} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Target / Service Name
                    </label>
                    <input
                      type="text"
                      value={newTargetName}
                      onChange={(e) => setNewTargetName(e.target.value)}
                      placeholder="e.g. appointment_service"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Docker Container Name
                    </label>
                    <input
                      type="text"
                      value={newContainerName}
                      onChange={(e) => setNewContainerName(e.target.value)}
                      placeholder="e.g. backend-container-1"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                      required
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <button
                      type="submit"
                      disabled={isAddingTarget}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                    >
                      {isAddingTarget ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Add
                    </button>
                  </div>
                </form>
              </div>

              {/* Existing Targets List */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Configured Targets ({targetsList.length})
                </h4>

                {targetsList.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 font-medium">No target endpoints registered</p>
                    <p className="text-xs text-slate-400 mt-0.5">Use the form above to add your first service target</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {targetsList.map((ep) => {
                      const isEditing = editingTargetId === ep.id;
                      const isDeleting = deletingTargetId === ep.id;

                      if (isEditing) {
                        return (
                          <div
                            key={ep.id}
                            className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-col sm:flex-row gap-2 items-center"
                          >
                            <input
                              type="text"
                              value={editTargetName}
                              onChange={(e) => setEditTargetName(e.target.value)}
                              className="w-full sm:flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="Target Name"
                            />
                            <input
                              type="text"
                              value={editContainerName}
                              onChange={(e) => setEditContainerName(e.target.value)}
                              className="w-full sm:flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="Container Name"
                            />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => void handleSaveEditTarget(ep.id)}
                                disabled={isUpdatingTarget}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                {isUpdatingTarget ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTargetId(null)}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={ep.id}
                          className="px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                              <Target className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-blue-900 truncate">{ep.target_name}</p>
                              <p className="text-xs font-mono text-slate-500 truncate">Container: {ep.container_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditTarget(ep)}
                              className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit target"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteTarget(ep.id)}
                              disabled={isDeleting}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete target"
                            >
                              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsTargetsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Generate Report Button */}
      <Link
        to={`/report/${appId}`}
        className="fixed bottom-28 right-6 w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-xl hover:shadow-emerald-500/50 hover:scale-110 transition-all flex items-center justify-center group"
        title="Generate Report"
      >
        <FileText className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
      </Link>

      {/* Floating Chatbot Icon */}
      <Link
        to={`/chatbot/${appId}`}
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 rounded-full shadow-xl hover:shadow-violet-500/50 hover:scale-110 transition-all flex items-center justify-center group"
      >
        <MessageCircle className="w-7 h-7 text-white group-hover:rotate-12 transition-transform" />
      </Link>
    </div>
  );
}

