import { Activity, AlertTriangle, Cpu, HardDrive, MessageCircle, Clock, Server, ArrowLeft, TrendingUp, BarChart3, ChevronRight, FolderOpen, FileText, Trash2, Loader2, AlertCircle, Upload } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useEffect, useState } from 'react';
import { buildApiUrl } from '@/app/api';

interface AnomalyConfig {
  id: number;
  endpoint_id: number;
  is_active: boolean;
}

interface UserApplication {
  id: number;
  endpoints?: Array<{ id: number }>;
}

interface DocumentRecord {
  id: number;
  file_name: string;
  storage_path: string;
}

export function ApplicationDashboard() {
  const { appId } = useParams();

  // Mock data - in real app, fetch based on appId
  const appName = appId === 'hms-001' ? 'Hospital Management System' : 'Application Dashboard';
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState('');
  const [configuredEndpointCount, setConfiguredEndpointCount] = useState(0);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [documentsError, setDocumentsError] = useState('');
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);

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
      const response = await fetch(buildApiUrl(`/api/v1/documents/${appId}`), {
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

      await loadDocuments();
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : 'Failed to delete document');
    } finally {
      setDeletingDocumentId(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token || !appId) {
      setIsLoadingConfig(false);
      setConfiguredEndpointCount(0);
      setIsLoadingDocuments(false);
      return;
    }

    const loadConfigStatus = async () => {
      setIsLoadingConfig(true);
      setConfigError('');

      try {
        const [appsResponse, configsResponse] = await Promise.all([
          fetch(buildApiUrl('/api/v1/application/me'), {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(buildApiUrl('/api/v1/anomaly-configs/'), {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!appsResponse.ok) {
          throw new Error('Failed to load applications');
        }

        if (!configsResponse.ok) {
          throw new Error('Failed to load anomaly configurations');
        }

        const applications = (await appsResponse.json()) as UserApplication[];
        const allConfigs = (await configsResponse.json()) as AnomalyConfig[];

        const currentApp = applications.find((app) => String(app.id) === String(appId));
        const endpointIds = new Set((currentApp?.endpoints ?? []).map((endpoint) => endpoint.id));

        const appConfigCount = allConfigs.filter((config) => endpointIds.has(config.endpoint_id)).length;
        setConfiguredEndpointCount(appConfigCount);
      } catch (error) {
        setConfigError(error instanceof Error ? error.message : 'Failed to load anomaly configurations');
        setConfiguredEndpointCount(0);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    void loadConfigStatus();
    void loadDocuments();
  }, [appId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
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
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                {appName}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-700 font-medium">Active</span>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Content */}
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Application Details */}
        <div className="mb-6 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-600" />
            Application Details
          </h2>
          <div>
            <p className="text-sm text-slate-500 mb-1">Name</p>
            <p className="text-slate-800 font-semibold">{appName}</p>
          </div>
        </div>

        {/* Anomaly Detection & Test Cycle Comparison - Two Separate Cards */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Anomaly Detection Card */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                <AlertTriangle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Anomaly Detection</h3>
                <p className="text-sm text-slate-600">Performance anomaly monitoring</p>
              </div>
            </div>

            {/* Anomaly Count Display */}
            <div className="mb-6 p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-600">Anomaly Configuration</p>
                {configuredEndpointCount > 0 && !isLoadingConfig && (
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                )}
              </div>

              {isLoadingConfig ? (
                <p className="text-sm text-slate-600">Loading anomaly configuration status...</p>
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
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg font-semibold group"
            >
              View Anomaly Details
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Test Cycle Comparison Card */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Test Cycle Comparison</h3>
                <p className="text-sm text-slate-600">Compare test results across cycles</p>
              </div>
            </div>

            {/* Test Cycles Info Display */}
            <div className="mb-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-600">Available Test Cycles</p>
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-indigo-600">5</span>
                <span className="text-lg text-slate-600">cycles</span>
              </div>
              <p className="text-sm text-indigo-700 mt-2 font-medium">✓ Ready for comparison</p>
            </div>

            {/* Compare Button */}
            <Link
              to={`/test-cycle-comparison/${appId}`}
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-semibold group"
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
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                <FolderOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Documents</h3>
                <p className="text-sm text-slate-600">Uploaded files for this application</p>
              </div>
            </div>
            <Link
              to={`/onboarding/${appId}/3`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md hover:shadow-lg font-semibold"
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
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Loading uploaded documents...
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
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">{doc.file_name}</p>
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

        {/* Testing Environment Info card removed per request */}
      </div>

      {/* Floating Chatbot Icon */}
      <Link
        to={`/chatbot/${appId}`}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-xl hover:shadow-indigo-500/50 hover:scale-110 transition-all flex items-center justify-center group"
      >
        <MessageCircle className="w-7 h-7 text-white group-hover:rotate-12 transition-transform" />
      </Link>
    </div>
  );
}
