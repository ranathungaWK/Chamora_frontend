import { Activity, ArrowLeft, ArrowRight, Check, Plus, Trash2, Upload, FileText, Server, TestTube, FolderOpen, SkipForward, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { buildApiUrl } from '@/app/api';

interface OnboardingPageProps {
  onBackToDashboard?: () => void;
}

interface BlackboxTarget {
  id: string;
  targetName: string;
  containerName: string;
}

interface Phase1Data {
  applicationName: string;
  description: string;
  githubRepo: string;
  grafanaEndpoint: string;
  victoriaMetricsEndpoint: string;
  blackboxTargets: BlackboxTarget[];
}

interface Phase2Data {
  applicationId: string;
  testScriptName: string;
  description: string;
  scriptFile: File | null;
  scriptFileName: string;
}

interface UserApplication {
  id: number;
  name: string;
}

interface DocumentRecord {
  id: number;
  file_name: string;
  storage_path: string;
}

interface Phase3Data {
  applicationName: string;
  documents: DocumentRecord[];
}

export function OnboardingPage({ onBackToDashboard }: OnboardingPageProps) {
  const { appId, phase } = useParams();
  const navigate = useNavigate();
  const [currentPhase, setCurrentPhase] = useState<1 | 2 | 3>(1);
  const [completedPhases, setCompletedPhases] = useState<Set<number>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [isNewApp, setIsNewApp] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize phase from URL if provided
  useEffect(() => {
    if (appId && phase) {
      // Editing existing app - specific phase
      const phaseNum = parseInt(phase);
      if (phaseNum >= 1 && phaseNum <= 3) {
        setCurrentPhase(phaseNum as 1 | 2 | 3);
        setIsEditMode(true);
        setIsNewApp(false);
      }
    } else if (!appId) {
      // New app registration - only phase 1
      setCurrentPhase(1);
      setIsEditMode(false);
      setIsNewApp(true);
    }
  }, [phase, appId]);

  // Phase 1 State
  const [phase1Data, setPhase1Data] = useState<Phase1Data>({
    applicationName: '',
    description: '',
    githubRepo: '',
    grafanaEndpoint: '',
    victoriaMetricsEndpoint: '',
    blackboxTargets: [{ id: '1', targetName: '', containerName: '' }]
  });

  // Phase 2 State
  const [phase2Data, setPhase2Data] = useState<Phase2Data>({
    applicationId: appId ?? '',
    testScriptName: '',
    description: '',
    scriptFile: null,
    scriptFileName: ''
  });
  const [applications, setApplications] = useState<UserApplication[]>([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);

  // Phase 3 State
  const [phase3Data, setPhase3Data] = useState<Phase3Data>({
    applicationName: '',
    documents: []
  });
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
  const [documentsError, setDocumentsError] = useState('');

  // Phase 1 Functions
  const addBlackboxTarget = () => {
    setPhase1Data({
      ...phase1Data,
      blackboxTargets: [
        ...phase1Data.blackboxTargets,
        { id: Date.now().toString(), targetName: '', containerName: '' }
      ]
    });
  };

  const removeBlackboxTarget = (id: string) => {
    if (phase1Data.blackboxTargets.length > 1) {
      setPhase1Data({
        ...phase1Data,
        blackboxTargets: phase1Data.blackboxTargets.filter(target => target.id !== id)
      });
    }
  };

  const updateBlackboxTarget = (id: string, field: 'targetName' | 'containerName', value: string) => {
    setPhase1Data({
      ...phase1Data,
      blackboxTargets: phase1Data.blackboxTargets.map(target =>
        target.id === id ? { ...target, [field]: value } : target
      )
    });
  };

  // Phase 2 Functions
  const handleScriptFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhase2Data({
        ...phase2Data,
        scriptFile: file,
        scriptFileName: file.name
      });
    }
  };

  // Phase 3 Functions
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    if (!appId) {
      setDocumentsError('Documents can only be uploaded for an existing application.');
      return;
    }

    const uploadDocuments = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      setDocumentsError('');
      setIsUploadingDocuments(true);

      try {
        await Promise.all(
          Array.from(files).map(async (file) => {
            const formData = new FormData();
            formData.append('application_id', String(appId));
            formData.append('file', file);

            const response = await fetch(buildApiUrl('/api/v1/documents/'), {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            });

            if (!response.ok) {
              const error = await response.json().catch(() => ({}));
              throw new Error(error.detail ?? `Failed to upload ${file.name}`);
            }
          })
        );

        await loadDocuments();
      } finally {
        setIsUploadingDocuments(false);
      }
    };

    void uploadDocuments().catch((error) => {
      setDocumentsError(error instanceof Error ? error.message : 'Failed to upload documents');
    });
  };

  const loadDocuments = async () => {
    if (!appId) {
      setPhase3Data((prev) => ({ ...prev, documents: [] }));
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setDocumentsError('Not authenticated');
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

      const documents = (await response.json()) as DocumentRecord[];
      setPhase3Data((prev) => ({
        ...prev,
        documents,
      }));
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : 'Failed to load documents');
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const removeDocument = async (documentId: number) => {
    if (!appId) {
      setDocumentsError('Documents can only be removed for an existing application.');
      return;
    }

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
    if (currentPhase < 2) {
      return;
    }

    const fetchApplications = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setErrorMessage('Not authenticated');
        return;
      }

      setIsLoadingApplications(true);
      try {
        const response = await fetch(buildApiUrl('/api/v1/application/me'), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.detail ?? 'Failed to load applications');
        }

        const appList: UserApplication[] = await response.json();
        setApplications(appList);

        if (currentPhase === 3 && appId) {
          const currentApp = appList.find((app) => String(app.id) === String(appId));
          setPhase3Data((prev) => ({
            ...prev,
            applicationName: currentApp?.name ?? prev.applicationName ?? String(appId),
          }));
        }

        setPhase2Data((prev) => {
          if (prev.applicationId) {
            return prev;
          }

          if (appId && appList.some((app) => String(app.id) === String(appId))) {
            return { ...prev, applicationId: String(appId) };
          }

          if (appList.length === 1) {
            return { ...prev, applicationId: String(appList[0].id) };
          }

          return prev;
        });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load applications');
      } finally {
        setIsLoadingApplications(false);
      }
    };

    fetchApplications();
  }, [appId, currentPhase]);

  useEffect(() => {
    if (currentPhase !== 3) {
      return;
    }

    void loadDocuments();
  }, [appId, currentPhase]);

  // Navigation Functions
  const handlePhaseSubmit = async () => {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (isNewApp && currentPhase === 1) {
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('Not authenticated');
        }

        const response = await fetch(buildApiUrl('/api/v1/application/register'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: phase1Data.applicationName,
            description: phase1Data.description,
            github_repo: phase1Data.githubRepo || undefined,
            grafana_url: phase1Data.grafanaEndpoint,
            victoria_metrics_url: phase1Data.victoriaMetricsEndpoint,
            endpoints: phase1Data.blackboxTargets.map(target => ({
              target_name: target.targetName,
              container_name: target.containerName,
            })),
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.detail ?? 'Failed to register application');
        }

        alert('Application registered successfully! You can now add test cycles and documents from the dashboard.');
        navigate('/dashboard');
        return;
      }

      if (currentPhase === 2) {
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('Not authenticated');
        }

        if (!phase2Data.applicationId) {
          throw new Error('Please select an application');
        }

        if (!phase2Data.scriptFile) {
          throw new Error('Please upload a test script file');
        }

        const formData = new FormData();
        formData.append('application_id', phase2Data.applicationId);
        formData.append('script_name', phase2Data.testScriptName);
        formData.append('file', phase2Data.scriptFile);

        const response = await fetch(buildApiUrl('/api/v1/test-scripts/'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.detail ?? 'Failed to register test script');
        }

        setCompletedPhases(new Set([...completedPhases, currentPhase]));
        alert('Test cycles saved successfully!');
        navigate('/dashboard');
      } else if (currentPhase === 3) {
        setCompletedPhases(new Set([...completedPhases, currentPhase]));
        alert('Documents ready! You can review them from the dashboard.');
        navigate('/dashboard');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // For new apps on Phase 1, skip means cancel
    if (isNewApp && currentPhase === 1) {
      navigate('/dashboard');
      return;
    }

    // For editing existing apps, just go back
    console.log('Skipped phase', currentPhase);
    alert('No changes made.');
    navigate('/dashboard');
  };

  const goToPhase = (phase: 1 | 2 | 3) => {
    setCurrentPhase(phase);
  };

  const handleBackToDashboard = () => {
    if (onBackToDashboard) {
      onBackToDashboard();
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation Bar */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <button
              onClick={handleBackToDashboard}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  {isEditMode ? 'Update Application' : 'Application Onboarding'}
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  {isEditMode ? 'Add or update application data' : 'Register Your New Application'}
                </p>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl shadow-sm">
            <span className="text-sm text-slate-700 font-medium">Phase {currentPhase} of 3</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-600 font-semibold">In Progress</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Phase Navigation - Only show for editing existing apps */}
        {!isNewApp && (
          <div className="mb-8 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((phase) => (
                <button
                  key={phase}
                  onClick={() => goToPhase(phase as 1 | 2 | 3)}
                  className={`flex-1 flex items-center gap-4 px-6 py-4 rounded-lg transition-all ${
                    currentPhase === phase
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-105'
                      : completedPhases.has(phase)
                      ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200'
                      : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                  } ${phase !== 3 ? 'mr-4' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    currentPhase === phase
                      ? 'bg-white/20'
                      : completedPhases.has(phase)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {completedPhases.has(phase) ? <Check className="w-5 h-5" /> : phase}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">
                      {phase === 1 ? 'Application Data' : phase === 2 ? 'Test Cycles' : 'Documents'}
                    </p>
                    <p className={`text-xs ${currentPhase === phase ? 'text-white/80' : 'text-slate-500'}`}>
                      {phase === 1 ? 'Basic information' : phase === 2 ? 'Test scripts' : 'Related files'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phase 1: Application Data */}
        {currentPhase === 1 && (
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Application Details</h2>
                <p className="text-sm text-slate-600">Provide your application's basic information and configuration</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Application Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Application Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={phase1Data.applicationName}
                  onChange={(e) => setPhase1Data({ ...phase1Data, applicationName: e.target.value })}
                  placeholder="Enter application name"
                  className="w-full bg-white border-2 border-slate-300 focus:border-indigo-400 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={phase1Data.description}
                  onChange={(e) => setPhase1Data({ ...phase1Data, description: e.target.value })}
                  placeholder="Enter application description"
                  rows={3}
                  className="w-full bg-white border-2 border-slate-300 focus:border-indigo-400 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all resize-none"
                />
              </div>

              {/* GitHub Repo */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  GitHub Repository <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={phase1Data.githubRepo}
                  onChange={(e) => setPhase1Data({ ...phase1Data, githubRepo: e.target.value })}
                  placeholder="https://github.com/your-org/your-repo"
                  className="w-full bg-white border-2 border-slate-300 focus:border-indigo-400 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                />
              </div>

              {/* Endpoints Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Grafana Endpoint of Test Environment
                  </label>
                  <input
                    type="text"
                    value={phase1Data.grafanaEndpoint}
                    onChange={(e) => setPhase1Data({ ...phase1Data, grafanaEndpoint: e.target.value })}
                    placeholder="https://grafana.example.com"
                    className="w-full bg-white border-2 border-slate-300 focus:border-indigo-400 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Victoria Metrics Endpoint of Test Environment
                  </label>
                  <input
                    type="text"
                    value={phase1Data.victoriaMetricsEndpoint}
                    onChange={(e) => setPhase1Data({ ...phase1Data, victoriaMetricsEndpoint: e.target.value })}
                    placeholder="https://victoria-metrics.example.com"
                    className="w-full bg-white border-2 border-slate-300 focus:border-indigo-400 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                  />
                </div>
              </div>

              {/* Blackbox Targets Table */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    Blackbox Targets Configuration
                  </label>
                  <button
                    onClick={addBlackboxTarget}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Add Target
                  </button>
                </div>

                <div className="border-2 border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 grid grid-cols-12 gap-4 px-4 py-3 font-semibold text-sm text-slate-700 border-b-2 border-slate-200">
                    <div className="col-span-5">Blackbox Target Name</div>
                    <div className="col-span-5">Container Name</div>
                    <div className="col-span-2 text-center">Actions</div>
                  </div>

                  <div className="bg-white divide-y divide-slate-200">
                    {phase1Data.blackboxTargets.map((target, index) => (
                      <div key={target.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center">
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={target.targetName}
                            onChange={(e) => updateBlackboxTarget(target.id, 'targetName', e.target.value)}
                            placeholder="Target name"
                            className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-400 rounded px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
                          />
                        </div>
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={target.containerName}
                            onChange={(e) => updateBlackboxTarget(target.id, 'containerName', e.target.value)}
                            placeholder="Container name"
                            className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-400 rounded px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
                          />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <button
                            onClick={() => removeBlackboxTarget(target.id)}
                            disabled={phase1Data.blackboxTargets.length === 1}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {errorMessage && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {errorMessage}
                </div>
              )}
              <div className="flex items-center justify-between pt-6 border-t-2 border-slate-200">
                <button
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip for Now
                </button>
                <button
                  onClick={handlePhaseSubmit}
                  disabled={!phase1Data.applicationName || isSubmitting}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Registering...' : 'Submit & Continue'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: Test Cycles */}
        {currentPhase === 2 && (
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <TestTube className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Test Cycles Configuration</h2>
                <p className="text-sm text-slate-600">Upload k6 test scripts and provide test cycle details</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Application Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Select Application <span className="text-red-500">*</span>
                </label>
                <select
                  value={phase2Data.applicationId}
                  onChange={(e) => setPhase2Data({ ...phase2Data, applicationId: e.target.value })}
                  className="w-full bg-white border-2 border-slate-300 focus:border-indigo-400 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                  disabled={isLoadingApplications}
                >
                  <option value="">{isLoadingApplications ? 'Loading applications...' : 'Select application'}</option>
                  {applications.map((app) => (
                    <option key={app.id} value={String(app.id)}>
                      {app.name}
                    </option>
                  ))}
                </select>
                {!isLoadingApplications && applications.length === 0 && (
                  <p className="mt-2 text-sm text-amber-700">
                    No applications found. Please register an application first.
                  </p>
                )}
              </div>

              {/* Test Script Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Test Script Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={phase2Data.testScriptName}
                  onChange={(e) => setPhase2Data({ ...phase2Data, testScriptName: e.target.value })}
                  placeholder="Enter test script name"
                  className="w-full bg-white border-2 border-slate-300 focus:border-indigo-400 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={phase2Data.description}
                  onChange={(e) => setPhase2Data({ ...phase2Data, description: e.target.value })}
                  placeholder="Enter test script description"
                  rows={3}
                  className="w-full bg-white border-2 border-slate-300 focus:border-indigo-400 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all resize-none"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Upload Test Script File (k6) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".js,.mjs"
                    onChange={handleScriptFileUpload}
                    className="hidden"
                    id="script-upload"
                  />
                  <label
                    htmlFor="script-upload"
                    className="flex items-center justify-center gap-3 w-full bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 hover:border-indigo-400 rounded-lg px-6 py-8 cursor-pointer transition-all hover:bg-gradient-to-br hover:from-indigo-100 hover:to-purple-100"
                  >
                    <Upload className="w-8 h-8 text-indigo-600" />
                    <div className="text-center">
                      <p className="font-semibold text-slate-700">
                        {phase2Data.scriptFileName || 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">JS files only (k6 scripts)</p>
                    </div>
                  </label>
                </div>
                {phase2Data.scriptFileName && (
                  <div className="mt-3 flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm text-emerald-700 font-medium">{phase2Data.scriptFileName}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t-2 border-slate-200">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
                <button
                  onClick={handlePhaseSubmit}
                  disabled={!phase2Data.applicationId || !phase2Data.testScriptName || !phase2Data.scriptFile || isSubmitting}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Test Cycles'}
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phase 3: Documents */}
        {currentPhase === 3 && (
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Application Documents</h2>
                <p className="text-sm text-slate-600">Upload relevant documents and resources for your application</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Application Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Application Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={phase3Data.applicationName}
                  onChange={(e) => setPhase3Data({ ...phase3Data, applicationName: e.target.value })}
                  placeholder="Enter application name"
                  className="w-full bg-white border-2 border-slate-300 focus:border-indigo-400 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                />
              </div>

              {/* Document Upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Upload Documents
                </label>
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    onChange={handleDocumentUpload}
                    className="hidden"
                    id="document-upload"
                  />
                  <label
                    htmlFor="document-upload"
                    className={`flex items-center justify-center gap-3 w-full bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-dashed border-emerald-300 hover:border-emerald-400 rounded-lg px-6 py-12 cursor-pointer transition-all hover:bg-gradient-to-br hover:from-emerald-100 hover:to-teal-100 ${isUploadingDocuments ? 'opacity-70 pointer-events-none' : ''}`}
                  >
                    <Upload className="w-10 h-10 text-emerald-600" />
                    <div className="text-center">
                      <p className="font-semibold text-slate-700 text-lg">{isUploadingDocuments ? 'Uploading documents...' : 'Click to upload or drag and drop'}</p>
                      <p className="text-sm text-slate-500 mt-1">PDF, DOC, DOCX, TXT, or any other document types</p>
                      <p className="text-xs text-slate-400 mt-2">You can select multiple files at once</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Uploaded Documents List */}
              {documentsError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {documentsError}
                </div>
              )}

              {isLoadingDocuments ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Loading uploaded documents...
                </div>
              ) : phase3Data.documents.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Uploaded Documents ({phase3Data.documents.length})
                  </label>
                  <div className="space-y-2">
                    {phase3Data.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{doc.file_name}</p>
                            <p className="text-xs text-slate-500 break-all">{doc.storage_path}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => void removeDocument(doc.id)}
                          disabled={deletingDocumentId === doc.id}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t-2 border-slate-200">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
                <button
                  onClick={handlePhaseSubmit}
                  disabled={!phase3Data.applicationName}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Documents
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}