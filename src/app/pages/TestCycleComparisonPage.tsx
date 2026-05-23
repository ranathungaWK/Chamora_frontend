import { ArrowLeft, BarChart3, CheckCircle2, ChevronRight, Clock3, Cpu, Gauge, HardDrive, LineChart, MessageCircle, Play, Rocket, Server, ShieldAlert, TrendingDown, TrendingUp, Wifi, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';

type TestRunStatus = 'passed' | 'failed';

interface TestRun {
  id: number;
  name: string;
  date: string;
  status: TestRunStatus;
  duration: string;
  avgResponseTime: string;
  throughput: string;
  errorRate: string;
  successRate: string;
  metricValues: Record<string, number>;
}

interface ComparisonMetric {
  key: string;
  label: string;
  description: string;
  icon: typeof LineChart;
}

interface ComparisonChatState {
  applicationName: string;
  selectedCycles: Array<Pick<TestRun, 'id' | 'name' | 'date' | 'status'>>;
  selectedMetrics: Array<Pick<ComparisonMetric, 'key' | 'label' | 'description'>>;
  mode: 'test_comparison';
}

export function TestCycleComparisonPage() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const appName = appId === 'hms-001' ? 'Hospital Management System' : 'Application';
  const [selectedCycleIds, setSelectedCycleIds] = useState<number[]>([]);
  const [selectedMetricKeys, setSelectedMetricKeys] = useState<string[]>([]);
  const [selectionError, setSelectionError] = useState('');
  const [thresholdValues, setThresholdValues] = useState<Record<string, string>>({});
  const [thresholdCheckRequested, setThresholdCheckRequested] = useState(false);
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [scopeSelections, setScopeSelections] = useState<Record<number, { endpointId: string; containerName: string }>>({});
  const [lastScopePromptSignature, setLastScopePromptSignature] = useState('');

  const testRuns: TestRun[] = [
    {
      id: 1,
      name: 'Smoke Regression Run',
      date: 'Apr 5, 2026',
      status: 'passed',
      duration: '16m 24s',
      avgResponseTime: '245ms',
      throughput: '1,250 req/s',
      errorRate: '0.5%',
      successRate: '99.5%'
      ,metricValues: {
        avgResponseTime: 245,
        p95Latency: 320,
        p99Latency: 410,
        throughput: 1250,
        errorRate: 0.5,
        successRate: 99.5,
        cpuUsage: 62,
        memoryUsage: 71,
        activeThreads: 18,
        networkWait: 34,
        requestQueue: 6,
        failureCount: 2,
      }
    },
    {
      id: 2,
      name: 'Peak Load Validation',
      date: 'Apr 6, 2026',
      status: 'passed',
      duration: '23m 11s',
      avgResponseTime: '268ms',
      throughput: '1,180 req/s',
      errorRate: '0.8%',
      successRate: '99.2%'
      ,metricValues: {
        avgResponseTime: 268,
        p95Latency: 345,
        p99Latency: 435,
        throughput: 1180,
        errorRate: 0.8,
        successRate: 99.2,
        cpuUsage: 68,
        memoryUsage: 74,
        activeThreads: 20,
        networkWait: 39,
        requestQueue: 8,
        failureCount: 3,
      }
    },
    {
      id: 3,
      name: 'Database Stress Run',
      date: 'Apr 7, 2026',
      status: 'failed',
      duration: '19m 02s',
      avgResponseTime: '425ms',
      throughput: '950 req/s',
      errorRate: '5.2%',
      successRate: '94.8%'
      ,metricValues: {
        avgResponseTime: 425,
        p95Latency: 540,
        p99Latency: 680,
        throughput: 950,
        errorRate: 5.2,
        successRate: 94.8,
        cpuUsage: 88,
        memoryUsage: 91,
        activeThreads: 28,
        networkWait: 76,
        requestQueue: 21,
        failureCount: 11,
      }
    },
    {
      id: 4,
      name: 'API Stability Sweep',
      date: 'Apr 8, 2026',
      status: 'passed',
      duration: '14m 46s',
      avgResponseTime: '235ms',
      throughput: '1,320 req/s',
      errorRate: '0.3%',
      successRate: '99.7%'
      ,metricValues: {
        avgResponseTime: 235,
        p95Latency: 302,
        p99Latency: 390,
        throughput: 1320,
        errorRate: 0.3,
        successRate: 99.7,
        cpuUsage: 58,
        memoryUsage: 69,
        activeThreads: 16,
        networkWait: 29,
        requestQueue: 5,
        failureCount: 1,
      }
    },
    {
      id: 5,
      name: 'Soak Test Overnight',
      date: 'Apr 9, 2026',
      status: 'passed',
      duration: '6h 02m',
      avgResponseTime: '252ms',
      throughput: '1,285 req/s',
      errorRate: '0.4%',
      successRate: '99.6%'
      ,metricValues: {
        avgResponseTime: 252,
        p95Latency: 325,
        p99Latency: 405,
        throughput: 1285,
        errorRate: 0.4,
        successRate: 99.6,
        cpuUsage: 64,
        memoryUsage: 73,
        activeThreads: 19,
        networkWait: 33,
        requestQueue: 7,
        failureCount: 2,
      }
    },
    {
      id: 6,
      name: 'Release Candidate Check',
      date: 'Apr 10, 2026',
      status: 'passed',
      duration: '18m 37s',
      avgResponseTime: '241ms',
      throughput: '1,301 req/s',
      errorRate: '0.6%',
      successRate: '99.4%'
      ,metricValues: {
        avgResponseTime: 241,
        p95Latency: 311,
        p99Latency: 398,
        throughput: 1301,
        errorRate: 0.6,
        successRate: 99.4,
        cpuUsage: 60,
        memoryUsage: 70,
        activeThreads: 17,
        networkWait: 31,
        requestQueue: 6,
        failureCount: 2,
      }
    }
  ];

  const comparisonMetrics: ComparisonMetric[] = [
    { key: 'avgResponseTime', label: 'Avg Response Time', description: 'Median end-user response time', icon: Clock3 },
    { key: 'p95Latency', label: 'P95 Latency', description: 'Tail latency under pressure', icon: LineChart },
    { key: 'p99Latency', label: 'P99 Latency', description: 'Worst-case latency behavior', icon: ShieldAlert },
    { key: 'throughput', label: 'Throughput', description: 'Requests served per second', icon: Rocket },
    { key: 'errorRate', label: 'Error Rate', description: 'Failed requests percentage', icon: XCircle },
    { key: 'successRate', label: 'Success Rate', description: 'Successful requests percentage', icon: CheckCircle2 },
    { key: 'cpuUsage', label: 'CPU Usage', description: 'Peak compute utilization', icon: Cpu },
    { key: 'memoryUsage', label: 'Memory Usage', description: 'Heap and resident memory pressure', icon: HardDrive },
    { key: 'activeThreads', label: 'Active Threads', description: 'Concurrent worker load', icon: Server },
    { key: 'networkWait', label: 'Network Wait', description: 'Time spent waiting on downstream services', icon: Wifi },
    { key: 'requestQueue', label: 'Request Queue', description: 'Queued work during spikes', icon: Gauge },
    { key: 'failureCount', label: 'Failure Count', description: 'Absolute failed request volume', icon: TrendingDown },
  ];

  // Group metrics by exporter category
  const metricsByCategory: Record<string, ComparisonMetric[]> = {
    'Blackbox Exporter': [
      { key: 'avgResponseTime', label: 'Avg Response Time', description: 'Median end-user response time', icon: Clock3 },
      { key: 'p95Latency', label: 'P95 Latency', description: 'Tail latency under pressure', icon: LineChart },
      { key: 'p99Latency', label: 'P99 Latency', description: 'Worst-case latency behavior', icon: ShieldAlert },
      { key: 'errorRate', label: 'Error Rate', description: 'Failed requests percentage', icon: XCircle },
      { key: 'successRate', label: 'Success Rate', description: 'Successful requests percentage', icon: CheckCircle2 },
    ],
    'cAdvisor (container)': [
      { key: 'cpuUsage', label: 'CPU Usage', description: 'Peak compute utilization', icon: Cpu },
      { key: 'memoryUsage', label: 'Memory Usage', description: 'Heap and resident memory pressure', icon: HardDrive },
      { key: 'activeThreads', label: 'Active Threads', description: 'Concurrent worker load', icon: Server },
      { key: 'networkWait', label: 'Network Wait', description: 'Time spent waiting on downstream services', icon: Wifi },
    ],
    'Node Exporter': [
      { key: 'throughput', label: 'Throughput', description: 'Requests served per second', icon: Rocket },
      { key: 'requestQueue', label: 'Request Queue', description: 'Queued work during spikes', icon: Gauge },
      { key: 'failureCount', label: 'Failure Count', description: 'Absolute failed request volume', icon: TrendingDown },
    ],
  };

  const blackboxMetricKeys = metricsByCategory['Blackbox Exporter'].map((metric) => metric.key);
  const cadvisorMetricKeys = metricsByCategory['cAdvisor (container)'].map((metric) => metric.key);

  const endpointsList = [
    { id: 'ep1', name: 'GET /health' },
    { id: 'ep2', name: 'POST /login' },
    { id: 'ep3', name: 'GET /api/v1/items' },
  ];

  const containersList = [
    { id: 'c1', name: 'service-api' },
    { id: 'c2', name: 'worker-processor' },
    { id: 'c3', name: 'redis' },
  ];

  const selectedRuns = useMemo(
    () => testRuns.filter((run) => selectedCycleIds.includes(run.id)),
    [selectedCycleIds],
  );

  const selectedMetrics = useMemo(
    () => comparisonMetrics.filter((metric) => selectedMetricKeys.includes(metric.key)),
    [selectedMetricKeys],
  );

  const selectedRun = selectedRuns[0];
  const isThresholdMode = selectedRuns.length === 1;
  const canOpenChat = selectedRuns.length >= 2 && selectedRuns.length <= 4 && selectedMetrics.length > 0 && selectedMetrics.length <= 5;
  const needsScopeConfiguration = selectedRuns.length > 0 && (
    selectedMetricKeys.some((key) => blackboxMetricKeys.includes(key)) ||
    selectedMetricKeys.some((key) => cadvisorMetricKeys.includes(key))
  );
  const scopeSignature = `${selectedCycleIds.slice().sort().join(',')}|${selectedMetricKeys.slice().sort().join(',')}`;
  const thresholdComparisonDirections: Record<string, 'lower' | 'higher'> = {
    throughput: 'higher',
    successRate: 'higher',
  };

  const scopeIsComplete = selectedRuns.every((run) => {
    const scope = scopeSelections[run.id];
    const endpointOk = !selectedMetricKeys.some((key) => blackboxMetricKeys.includes(key)) || Boolean(scope?.endpointId);
    const containerOk = !selectedMetricKeys.some((key) => cadvisorMetricKeys.includes(key)) || Boolean(scope?.containerName);
    return endpointOk && containerOk;
  });

  const thresholdResults = useMemo(() => {
    if (!isThresholdMode || !selectedRun) {
      return [] as Array<{
        key: string;
        label: string;
        actual: number;
        threshold: number;
        passed: boolean;
      }>;
    }

    return selectedMetrics
      .map((metric) => {
        const rawThreshold = thresholdValues[metric.key];
        const threshold = Number(rawThreshold);
        const actual = selectedRun.metricValues[metric.key];

        if (Number.isNaN(threshold) || actual === undefined) {
          return null;
        }

        const direction = thresholdComparisonDirections[metric.key] ?? 'lower';
        const passed = direction === 'higher' ? actual >= threshold : actual <= threshold;

        return {
          key: metric.key,
          label: metric.label,
          actual,
          threshold,
          passed,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [isThresholdMode, selectedMetrics, selectedRun, thresholdValues]);

  const canRunThresholdCheck = isThresholdMode && selectedMetrics.length > 0 && thresholdResults.length === selectedMetrics.length;

  useEffect(() => {
    if (selectedRuns.length <= 1) {
      setScopeModalOpen(false);
      return;
    }

    if (needsScopeConfiguration && scopeSignature !== lastScopePromptSignature) {
      setScopeModalOpen(true);
      setLastScopePromptSignature(scopeSignature);
    }
  }, [lastScopePromptSignature, needsScopeConfiguration, scopeSignature, selectedRuns.length]);

  const toggleCycle = (runId: number) => {
    setSelectionError('');
    setSelectedCycleIds((current) => {
      if (current.includes(runId)) {
        setScopeSelections((currentScopes) => {
          const next = { ...currentScopes };
          delete next[runId];
          return next;
        });
        return current.filter((id) => id !== runId);
      }

      if (current.length >= 4) {
        setSelectionError('You can compare up to 4 cycles at a time.');
        return current;
      }

      setScopeSelections((currentScopes) => ({
        ...currentScopes,
        [runId]: currentScopes[runId] ?? { endpointId: '', containerName: '' },
      }));
      return [...current, runId];
    });
  };

  const toggleMetric = (metricKey: string) => {
    setSelectionError('');
    setSelectedMetricKeys((current) => {
      if (current.includes(metricKey)) {
        return current.filter((key) => key !== metricKey);
      }

      if (current.length >= 5) {
        setSelectionError('You can compare up to 5 metrics at a time.');
        return current;
      }

      return [...current, metricKey];
    });
  };

  const handleCompare = () => {
    if (!canOpenChat || !scopeIsComplete || !appId) {
      setSelectionError('Select at least 2 cycles and 1 metric before opening the comparison chat.');
      return;
    }

    const chatState: ComparisonChatState = {
      applicationName: appName,
      selectedCycles: selectedRuns.map(({ id, name, date, status }) => ({ id, name, date, status })),
      selectedMetrics: selectedMetrics.map(({ key, label, description }) => ({ key, label, description })),
      mode: 'test_comparison',
    };

    navigate(`/chatbot/${appId}`, {
      state: chatState,
    });
  };

  const handleThresholdCheck = () => {
    if (!canRunThresholdCheck || !scopeIsComplete) {
      setSelectionError('Select exactly 1 cycle, at least 1 metric, configure the scope popup, and enter threshold values for the selected metrics.');
      return;
    }

    setThresholdCheckRequested(true);
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
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  Test Cycle Comparison
                </h1>
                <p className="text-xs text-slate-600">{appName}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span className="text-indigo-700 font-medium">{testRuns.length} Test Runs</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-sm font-semibold text-indigo-600 uppercase tracking-[0.24em]">Comparison workspace</p>
                <h2 className="text-2xl font-bold text-slate-800 mt-2">Select cycles and metrics for chat-based comparison</h2>
                <p className="text-sm text-slate-600 mt-2">Pick up to 4 test runs from this application, then choose up to 5 metrics to compare before opening the chat window.</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-indigo-700">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-semibold">Chat handoff ready</span>
              </div>
            </div>

            {selectionError && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {selectionError}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Test runs</p>
                <p className="mt-2 text-2xl font-bold text-slate-800">{testRuns.length}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-600">Selected cycles</p>
                <p className="mt-2 text-2xl font-bold text-indigo-700">{selectedRuns.length}/4</p>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-purple-600">Selected metrics</p>
                <p className="mt-2 text-2xl font-bold text-purple-700">{selectedMetrics.length}/5</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">Ready to compare</p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">{canOpenChat ? 'Yes' : 'No'}</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Available test runs</h3>
                  <p className="text-sm text-slate-600">Showing every run related to this application.</p>
                </div>
                <p className="text-sm text-slate-500">Select 2 to 4 runs</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {testRuns.map((run, index) => {
                  const isSelected = selectedCycleIds.includes(run.id);
                  const isNewest = index === testRuns.length - 1;

                  return (
                    <div
                      key={run.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleCycle(run.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleCycle(run.id);
                        }
                      }}
                      className={`cursor-pointer rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                        isSelected ? 'border-indigo-400 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                            run.status === 'passed'
                              ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                              : 'bg-gradient-to-br from-red-500 to-orange-600'
                          }`}>
                            {run.status === 'passed' ? (
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            ) : (
                              <XCircle className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-slate-800">{run.name}</h4>
                              {isNewest && (
                                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                                  Latest
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">Start: {run.date}</p>
                            <p className="mt-2 text-sm text-slate-600">End: {run.date} · {run.duration}</p>
                          </div>
                        </div>

                        <div onClick={(event) => event.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleCycle(run.id)}
                            aria-label={`Select ${run.name}`}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${
                          run.status === 'passed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {run.status === 'passed' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {run.status}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                          <Play className="w-3 h-3" />
                          Included in chat handoff
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Comparison metrics</h3>
                  <p className="text-sm text-slate-600">Choose up to 5 metrics for the chat analysis.</p>
                </div>
                <p className="text-sm text-slate-500">Select 1 to 5 metrics</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(metricsByCategory).map(([categoryName, metrics]) => {
                  return (
                    <div key={categoryName} className="rounded-2xl border p-4 transition-all bg-white">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h4 className="font-semibold text-slate-800">{categoryName}</h4>
                          <p className="mt-1 text-sm text-slate-600">Select metrics from {categoryName}.</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {metrics.map((metric) => {
                          const isSelected = selectedMetricKeys.includes(metric.key);
                          const MetricIcon = metric.icon;
                          return (
                            <div key={metric.key} className={`flex items-center justify-between p-2 rounded-lg ${isSelected ? 'bg-slate-50' : ''}`}>
                              <div className="flex items-center gap-3">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-md ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                  <MetricIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-medium text-slate-800">{metric.label}</div>
                                  <div className="text-xs text-slate-500">{metric.description}</div>
                                </div>
                              </div>
                              <div onClick={(e) => e.stopPropagation()}>
                                <Checkbox checked={isSelected} onCheckedChange={() => toggleMetric(metric.key)} aria-label={`Select ${metric.label}`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm sticky top-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{isThresholdMode ? 'Threshold comparison' : 'Chat preview'}</h3>
                  <p className="text-sm text-slate-600">
                    {isThresholdMode
                      ? 'Compare a single test cycle against the thresholds you define.'
                      : 'Your comparison context will open in chat.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Selected cycles</p>
                  <div className="mt-2 space-y-2">
                    {selectedRuns.length > 0 ? (
                      selectedRuns.map((run) => (
                        <div key={run.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{run.name}</div>
                            <div className="text-xs text-slate-500">{run.date}</div>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">Use this cycle for either chat comparison or single-cycle threshold validation.</p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        No cycles selected yet.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Selected metrics</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedMetrics.length > 0 ? (
                      selectedMetrics.map((metric) => (
                        <span key={metric.key} className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                          {metric.label}
                        </span>
                      ))
                    ) : (
                      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        No metrics selected yet.
                      </p>
                    )}
                  </div>
                </div>

                {needsScopeConfiguration && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-slate-800">Scope configuration required</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Blackbox metrics need an endpoint, and cAdvisor metrics need a container. Open the popup to configure each selected cycle.
                    </p>
                    <Button
                      type="button"
                      onClick={() => setScopeModalOpen(true)}
                      className="mt-3 inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-white hover:bg-amber-600"
                    >
                      Configure Scope
                    </Button>
                  </div>
                )}

                {isThresholdMode && selectedRun && (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Threshold inputs</p>
                      <p className="mt-1 text-sm text-slate-600">Enter the threshold for each selected metric. The selected cycle will be compared against these values.</p>
                    </div>

                    <div className="space-y-3">
                      {selectedMetrics.map((metric) => (
                        <div key={metric.key}>
                          <label className="text-xs text-slate-600 mb-1 block">{metric.label} threshold</label>
                          <input
                            type="number"
                            step="0.01"
                            value={thresholdValues[metric.key] ?? ''}
                            onChange={(e) => setThresholdValues((prev) => ({ ...prev, [metric.key]: e.target.value }))}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            placeholder={thresholdComparisonDirections[metric.key] === 'higher' ? 'Minimum allowed value' : 'Maximum allowed value'}
                          />
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      onClick={handleThresholdCheck}
                      disabled={!canRunThresholdCheck}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-6 py-3.5 text-white shadow-md transition-all hover:from-indigo-600 hover:to-purple-700 hover:shadow-lg disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-400"
                    >
                      Compare With Thresholds
                    </Button>

                    {thresholdCheckRequested && thresholdResults.length > 0 && (
                      <div className="space-y-2 rounded-xl border border-white/70 bg-white p-4 shadow-sm">
                        <p className="text-sm font-semibold text-slate-800">Comparison results for {selectedRun.name}</p>
                        {thresholdResults.map((result) => (
                          <div key={result.key} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                            <div>
                              <p className="font-medium text-slate-800">{result.label}</p>
                              <p className="text-xs text-slate-500">Actual: {result.actual} | Threshold: {result.threshold}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${result.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {result.passed ? 'Within threshold' : 'Out of threshold'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">Next step</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {isThresholdMode
                      ? 'Review the threshold results above and adjust the threshold values as needed.'
                      : 'Open the chat window to generate a comparison summary and ask follow-up questions.'}
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={isThresholdMode ? handleThresholdCheck : handleCompare}
                  disabled={isThresholdMode ? !canRunThresholdCheck : !canOpenChat}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-6 py-3.5 text-white shadow-md transition-all hover:from-indigo-600 hover:to-purple-700 hover:shadow-lg disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-400"
                >
                  {isThresholdMode ? 'Compare With Thresholds' : 'Open Comparison Chat'}
                  <ChevronRight className="w-5 h-5" />
                </Button>

                <p className="text-xs leading-relaxed text-slate-500">
                  {isThresholdMode
                    ? 'Select 1 cycle and at least 1 metric to compare against threshold values.'
                    : 'You need at least 2 cycles and 1 metric to continue. Maximums are 4 cycles and 5 metrics.'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Selection summary</h4>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p>Application: {appName}</p>
                <p>Cycles selected: {selectedRuns.length}</p>
                <p>Metrics selected: {selectedMetrics.length}</p>
                <p>Open chat to compare trends, regressions, and recommendations.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

        {scopeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
            <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Configure metric scope</h3>
                  <p className="text-sm text-slate-500">
                    {selectedRuns.length > 1
                      ? 'Set endpoint/container values for each selected test cycle.'
                      : 'Set endpoint/container values for the selected test cycle.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setScopeModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
                {selectedRuns.map((run) => {
                  const currentScope = scopeSelections[run.id] ?? { endpointId: '', containerName: '' };
                  return (
                    <div key={run.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                          <h4 className="font-semibold text-slate-800">{run.name}</h4>
                          <p className="text-xs text-slate-500">{run.date}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                          Cycle {run.id}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedMetricKeys.some((key) => blackboxMetricKeys.includes(key)) && (
                          <div>
                            <label className="text-sm text-slate-600 mb-2 block font-medium">Endpoint</label>
                            <select
                              value={currentScope.endpointId}
                              onChange={(e) => setScopeSelections((prev) => ({
                                ...prev,
                                [run.id]: { ...currentScope, endpointId: e.target.value },
                              }))}
                              className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="">Choose endpoint</option>
                              {endpointsList.map((endpoint) => (
                                <option key={endpoint.id} value={endpoint.id}>
                                  {endpoint.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {selectedMetricKeys.some((key) => cadvisorMetricKeys.includes(key)) && (
                          <div>
                            <label className="text-sm text-slate-600 mb-2 block font-medium">Container</label>
                            <select
                              value={currentScope.containerName}
                              onChange={(e) => setScopeSelections((prev) => ({
                                ...prev,
                                [run.id]: { ...currentScope, containerName: e.target.value },
                              }))}
                              className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="">Choose container</option>
                              {containersList.map((container) => (
                                <option key={container.id} value={container.name}>
                                  {container.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
                <p className="text-sm text-slate-500">
                  {scopeIsComplete ? 'All required scope fields are filled.' : 'Fill the required fields for the selected metrics.'}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setScopeModalOpen(false)}
                    className="rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
