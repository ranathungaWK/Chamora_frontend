import {
  ArrowLeft,
  Play,
  Square,
  Loader2,
  AlertCircle,
  FileCode,
  FileText,
  Clock3,
  RefreshCw,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { buildApiUrl } from '@/app/api';

type RunPhase = 'idle' | 'queued' | 'running' | 'completed' | 'failed';

interface TestScript {
  id: number;
  script_name: string;
  storage_path: string;
  application_id: number;
}

interface TestRun {
  id: number;
  test_script_id: number;
  status: string;
  start_time: string;
  end_time: string | null;
  result_file_path: string | null;
}

interface CurrentRunView {
  runId: number;
  phase: RunPhase;
  startTime: string;
  endTime: string;
  resultFileName: string;
  resultFilePath: string;
}

const phaseLabel: Record<RunPhase, string> = {
  idle: 'Ready to run',
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
};

const phaseProgress: Record<RunPhase, number> = {
  idle: 0,
  queued: 18,
  running: 68,
  completed: 100,
  failed: 100,
};

export function AutomatedTestingPage() {
  const { appId } = useParams();
  const appName = appId === 'hms-001' ? 'Hospital Management System' : 'Application';

  const [testScripts, setTestScripts] = useState<TestScript[]>([]);
  const [loadingScripts, setLoadingScripts] = useState(true);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [runPhase, setRunPhase] = useState<RunPhase>('idle');
  const [currentRun, setCurrentRun] = useState<CurrentRunView | null>(null);
  const [showPostRunActions, setShowPostRunActions] = useState(false);
  const [resultDownloadLoading, setResultDownloadLoading] = useState(false);
  const [resultDownloadError, setResultDownloadError] = useState('');
  const [refreshingRun, setRefreshingRun] = useState(false);
  const pollingRef = useRef<number | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  const selectedScript = testScripts.find((script) => script.id.toString() === selectedScriptId) ?? null;
  const selectedScriptName = selectedScript?.script_name || 'No script selected';
  const progressValue = phaseProgress[runPhase];

  const syncRunState = async (scriptId: string, runId: number, isBackgroundPoll = false) => {
    if (!scriptId || !runId) {
      return;
    }

    if (!isBackgroundPoll) {
      setRefreshingRun(true);
    }

    try {
      const response = await fetch(buildApiUrl(`/api/v1/k6/scripts/${scriptId}/history`), {
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        return;
      }

      const runs = (await response.json()) as TestRun[];
      const matchingRun = runs.find((run) => run.id === runId);

      if (!matchingRun) {
        return;
      }

      const nextPhase: RunPhase =
        matchingRun.status === 'queued' || matchingRun.status === 'running'
          ? matchingRun.status
          : matchingRun.status === 'completed'
            ? 'completed'
            : 'failed';

      const nextView: CurrentRunView = {
        runId: matchingRun.id,
        phase: nextPhase,
        startTime: new Date(matchingRun.start_time).toLocaleString(),
        endTime:
          matchingRun.end_time && nextPhase !== 'queued' && nextPhase !== 'running'
            ? new Date(matchingRun.end_time).toLocaleString()
            : nextPhase === 'running' || nextPhase === 'queued'
              ? 'In progress'
              : 'N/A',
        resultFileName:
          matchingRun.result_file_path?.split('/').pop() ||
          (nextPhase === 'completed' ? 'result.json' : 'Not generated yet'),
        resultFilePath: matchingRun.result_file_path || '',
      };

      setCurrentRun(nextView);
      setRunPhase(nextPhase);

      if (nextPhase === 'completed' || nextPhase === 'failed') {
        setShowPostRunActions(true);
      }
    } finally {
      if (!isBackgroundPoll) {
        setRefreshingRun(false);
      }
    }
  };

  useEffect(() => {
    const fetchScripts = async () => {
      try {
        const response = await fetch(buildApiUrl(`/api/v1/k6/applications/${appId}/scripts`), {
          headers: {
            ...getAuthHeaders(),
          },
        });

        if (response.ok) {
          const scripts = (await response.json()) as TestScript[];
          setTestScripts(scripts);
        }
      } catch (error) {
        console.error('Failed to load test scripts:', error);
      } finally {
        setLoadingScripts(false);
      }
    };

    fetchScripts();
  }, [appId]);

  useEffect(() => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (!selectedScriptId || !currentRun?.runId) {
      return;
    }

    if (runPhase !== 'queued' && runPhase !== 'running') {
      return;
    }

    pollingRef.current = window.setInterval(() => {
      void syncRunState(selectedScriptId, currentRun.runId, true);
    }, 4000);

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [selectedScriptId, currentRun?.runId, runPhase]);

  const handleSelectScript = (scriptId: string) => {
    if (runPhase === 'queued' || runPhase === 'running' || showPostRunActions) {
      return;
    }

    setSelectedScriptId(scriptId);
    setCurrentRun(null);
    setRunPhase('idle');
    setResultDownloadError('');
  };

  const handleTriggerTest = async () => {
    const scriptId = selectedScriptId || testScripts[0]?.id.toString() || '';

    if (!scriptId) {
      alert('No test scripts are available. Upload a k6 script first.');
      return;
    }

    try {
      setResultDownloadError('');
      setShowPostRunActions(false);
      setRunPhase('queued');

      const now = new Date();

      setSelectedScriptId(scriptId);
      setCurrentRun({
        runId: 0,
        phase: 'queued',
        startTime: now.toLocaleString(),
        endTime: 'In progress',
        resultFileName: 'Waiting for result file',
        resultFilePath: '',
      });

      const response = await fetch(buildApiUrl(`/api/v1/k6/scripts/${scriptId}/run`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to trigger test');
      }

      const createdRun = (await response.json()) as TestRun;
      const nextPhase: RunPhase =
        createdRun.status === 'queued' || createdRun.status === 'running'
          ? createdRun.status
          : createdRun.status === 'completed'
            ? 'completed'
            : 'failed';

      setRunPhase(nextPhase);
      setCurrentRun({
        runId: createdRun.id,
        phase: nextPhase,
        startTime: new Date(createdRun.start_time).toLocaleString(),
        endTime:
          createdRun.end_time && nextPhase !== 'queued' && nextPhase !== 'running'
            ? new Date(createdRun.end_time).toLocaleString()
            : nextPhase === 'running' || nextPhase === 'queued'
              ? 'In progress'
              : 'N/A',
        resultFileName:
          createdRun.result_file_path?.split('/').pop() ||
          (nextPhase === 'completed' ? 'result.json' : 'Waiting for result file'),
        resultFilePath: createdRun.result_file_path || '',
      });

      if (nextPhase === 'completed' || nextPhase === 'failed') {
        setShowPostRunActions(true);
      } else {
        await syncRunState(scriptId, createdRun.id);
      }
    } catch (error) {
      console.error('Error triggering test:', error);
      setRunPhase('failed');
      setShowPostRunActions(true);
      setCurrentRun((previous) =>
        previous
          ? {
              ...previous,
              phase: 'failed',
              endTime: new Date().toLocaleString(),
            }
          : null,
      );
      alert('Failed to trigger test. Please try again.');
    }
  };

  const handleStopTest = () => {
    alert('Stopping a live k6 run is not wired to the backend yet. This button only stops the local view for now.');
  };

  const handleReset = () => {
    setRunPhase('idle');
    setSelectedScriptId('');
    setCurrentRun(null);
    setShowPostRunActions(false);
    setResultDownloadError('');

    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleDownloadResult = async () => {
    if (!selectedScriptId) {
      return;
    }

    try {
      setResultDownloadError('');
      setResultDownloadLoading(true);

      const response = await fetch(buildApiUrl(`/api/v1/k6/scripts/${selectedScriptId}/result/download`), {
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.detail || 'Failed to download the result file.');
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = currentRun?.resultFileName || 'k6-result.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download the result file.';
      setResultDownloadError(message);
    } finally {
      setResultDownloadLoading(false);
    }
  };

  const progressBarClass =
    runPhase === 'running'
      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse'
      : runPhase === 'completed'
        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
        : runPhase === 'failed'
          ? 'bg-gradient-to-r from-red-500 to-orange-500'
          : 'bg-gradient-to-r from-slate-400 to-slate-500';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              to="/dashboard"
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 transition-all hover:bg-slate-200"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                <Play className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                  Automated k6 Testing
                </h1>
                <p className="text-xs text-slate-600">{appName}</p>
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2 ${
            runPhase === 'idle'
              ? 'border-slate-200 bg-slate-50'
              : runPhase === 'running' || runPhase === 'queued'
                ? 'border-blue-200 bg-blue-50'
                : runPhase === 'completed'
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-red-200 bg-red-50'
          }`}>
            {runPhase === 'queued' || runPhase === 'running' ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            ) : runPhase === 'completed' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : runPhase === 'failed' ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : null}
            <span className={`font-medium ${
              runPhase === 'idle'
                ? 'text-slate-700'
                : runPhase === 'running' || runPhase === 'queued'
                  ? 'text-blue-700'
                  : runPhase === 'completed'
                    ? 'text-emerald-700'
                    : 'text-red-700'
            }`}>
              {phaseLabel[runPhase]}
            </span>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl p-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-2">
                <FileCode className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-700">Select Test Script</h2>
              </div>

              {loadingScripts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
                  <p className="text-slate-600">Loading test scripts...</p>
                </div>
              ) : testScripts.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-slate-500">No test scripts found. Upload one in onboarding.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {testScripts.map((script) => (
                    <button
                      key={script.id}
                      onClick={() => handleSelectScript(script.id.toString())}
                      disabled={runPhase === 'queued' || runPhase === 'running' || showPostRunActions}
                      className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                        selectedScriptId === script.id.toString()
                          ? 'border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
                      } ${
                        runPhase === 'queued' || runPhase === 'running' || showPostRunActions
                          ? 'cursor-not-allowed opacity-50'
                          : 'cursor-pointer'
                      }`}
                    >
                      <p className="mb-1 font-semibold text-slate-800">{script.script_name}</p>
                      <p className="text-xs text-slate-500">{script.storage_path}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-700">Test Control</h2>

              {!showPostRunActions && runPhase !== 'queued' && runPhase !== 'running' && (
                <button
                  onClick={handleTriggerTest}
                  disabled={!selectedScriptId && testScripts.length === 0}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-4 font-semibold text-white shadow-md transition-all hover:shadow-lg ${
                    testScripts.length === 0 || loadingScripts
                      ? 'cursor-not-allowed bg-slate-400'
                      : 'bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700'
                  }`}
                >
                  <Play className="h-5 w-5" />
                  Trigger Test
                </button>
              )}

              {(runPhase === 'queued' || runPhase === 'running') && (
                <button
                  onClick={handleStopTest}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 px-6 py-4 font-semibold text-white shadow-md transition-all hover:from-red-600 hover:to-orange-700 hover:shadow-lg"
                >
                  <Square className="h-5 w-5" />
                  Stop / Cancel Run
                </button>
              )}

              {showPostRunActions && (runPhase === 'completed' || runPhase === 'failed') && (
                <div className="space-y-3">
                  <button
                    onClick={handleReset}
                    className="w-full rounded-lg bg-slate-100 px-6 py-3 font-medium text-slate-700 transition-all hover:bg-slate-200"
                  >
                    Run Another Test
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-2 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-slate-700">Test Progress</h2>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedScriptId && currentRun?.runId) {
                      void syncRunState(selectedScriptId, currentRun.runId);
                    }
                  }}
                  disabled={!selectedScriptId || !currentRun?.runId || refreshingRun}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshingRun ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">{phaseLabel[runPhase]}</span>
                  <span className="text-slate-500">{progressValue}%</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressBarClass}`}
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {runPhase === 'idle'
                    ? 'Select a stored script and start a live k6 run.'
                    : runPhase === 'queued'
                      ? 'The run has been queued and is waiting for the worker.'
                      : runPhase === 'running'
                        ? 'The worker is executing the selected k6 script.'
                        : runPhase === 'completed'
                          ? 'The run finished successfully.'
                          : 'The run finished with a failure.'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-700">Current Test Run</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-1 text-xs text-slate-500">Test Script</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedScriptName}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-1 text-xs text-slate-500">Status</p>
                  <p className={`text-sm font-semibold ${
                    runPhase === 'idle'
                      ? 'text-slate-700'
                      : runPhase === 'running' || runPhase === 'queued'
                        ? 'text-blue-700'
                        : runPhase === 'completed'
                          ? 'text-emerald-700'
                          : 'text-red-700'
                  }`}>
                    {phaseLabel[runPhase]}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-1 text-xs text-slate-500">Start Time</p>
                  <p className="text-sm font-semibold text-slate-800">{currentRun?.startTime || 'N/A'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-1 text-xs text-slate-500">End Time</p>
                  <p className="text-sm font-semibold text-slate-800">{currentRun?.endTime || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-700">Result File</h2>
              </div>

              {showPostRunActions && currentRun ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-1 text-xs text-slate-500">Result File Name</p>
                  <p className="break-all text-sm font-semibold text-slate-800">{currentRun.resultFileName}</p>

                  <p className="mb-1 mt-4 text-xs text-slate-500">File Path</p>
                  <p className="break-all text-sm text-slate-700">
                    {currentRun.resultFilePath || 'No result file available for this run.'}
                  </p>

                  {currentRun.resultFilePath ? (
                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        onClick={() => void handleDownloadResult()}
                        disabled={resultDownloadLoading}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        {resultDownloadLoading ? 'Downloading...' : 'Download Result File'}
                      </button>

                      {resultDownloadError && (
                        <p className="text-sm text-red-600">{resultDownloadError}</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      A result file was not produced for this run.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  The result file section appears after the run completes.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}