import { Activity, ArrowLeft, Play, Square, CheckCircle2, Loader2, AlertCircle, FileCode } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';

type TestStatus = 'idle' | 'running' | 'completed' | 'failed';

interface TestLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export function AutomatedTestingPage() {
  const { appId } = useParams();
  const appName = appId === 'hms-001' ? 'Hospital Management System' : 'Application';

  // Mock test scripts
  const testScripts = [
    { id: '1', name: 'Load Test - 100 Users', file: 'load_test_100.jmx', duration: '5 min' },
    { id: '2', name: 'Stress Test - Peak Load', file: 'stress_test_peak.jmx', duration: '10 min' },
    { id: '3', name: 'API Performance Test', file: 'api_perf_test.jmx', duration: '3 min' },
    { id: '4', name: 'Endurance Test - 1 Hour', file: 'endurance_1hr.jmx', duration: '60 min' },
  ];

  const [selectedScript, setSelectedScript] = useState<string>('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [testLogs, setTestLogs] = useState<TestLog[]>([]);

  const handleTriggerTest = () => {
    if (!selectedScript) {
      alert('Please select a test script first');
      return;
    }

    setTestStatus('running');
    setProgress(0);
    setTestLogs([
      { timestamp: new Date().toLocaleTimeString(), message: 'Test initiated...', type: 'info' },
      { timestamp: new Date().toLocaleTimeString(), message: `Loading script: ${testScripts.find(s => s.id === selectedScript)?.file}`, type: 'info' },
    ]);

    // Simulate test progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 5;
        
        // Add random logs
        if (newProgress % 20 === 0) {
          const logTypes: Array<'info' | 'success' | 'warning'> = ['info', 'success', 'warning'];
          const messages = [
            'Sending HTTP requests...',
            'Processing responses...',
            'Collecting metrics...',
            'Analyzing performance data...',
            'Thread group started',
            'Sampler executing...',
          ];
          setTestLogs(prev => [...prev, {
            timestamp: new Date().toLocaleTimeString(),
            message: messages[Math.floor(Math.random() * messages.length)],
            type: logTypes[Math.floor(Math.random() * logTypes.length)]
          }]);
        }

        if (newProgress >= 100) {
          clearInterval(interval);
          setTestStatus('completed');
          setTestLogs(prev => [...prev, {
            timestamp: new Date().toLocaleTimeString(),
            message: 'Test completed successfully!',
            type: 'success'
          }]);
          return 100;
        }
        return newProgress;
      });
    }, 300);
  };

  const handleStopTest = () => {
    setTestStatus('failed');
    setTestLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      message: 'Test stopped by user',
      type: 'error'
    }]);
  };

  const handleReset = () => {
    setTestStatus('idle');
    setProgress(0);
    setTestLogs([]);
    setSelectedScript('');
  };

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
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                  Automated JMeter Testing
                </h1>
                <p className="text-xs text-slate-600">{appName}</p>
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${
            testStatus === 'idle' ? 'bg-slate-50 border-slate-200' :
            testStatus === 'running' ? 'bg-blue-50 border-blue-200' :
            testStatus === 'completed' ? 'bg-emerald-50 border-emerald-200' :
            'bg-red-50 border-red-200'
          }`}>
            {testStatus === 'running' && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
            {testStatus === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {testStatus === 'failed' && <AlertCircle className="w-4 h-4 text-red-600" />}
            <span className={`font-medium ${
              testStatus === 'idle' ? 'text-slate-700' :
              testStatus === 'running' ? 'text-blue-700' :
              testStatus === 'completed' ? 'text-emerald-700' :
              'text-red-700'
            }`}>
              {testStatus === 'idle' ? 'Ready' :
               testStatus === 'running' ? 'Test Running' :
               testStatus === 'completed' ? 'Test Completed' :
               'Test Stopped'}
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Test Configuration */}
          <div className="col-span-1 space-y-6">
            {/* Test Script Selection */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileCode className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-700">Select Test Script</h2>
              </div>
              
              <div className="space-y-3">
                {testScripts.map((script) => (
                  <button
                    key={script.id}
                    onClick={() => setSelectedScript(script.id)}
                    disabled={testStatus === 'running'}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedScript === script.id
                        ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300 shadow-md'
                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                    } ${testStatus === 'running' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <p className="font-semibold text-slate-800 mb-1">{script.name}</p>
                    <p className="text-xs text-slate-500 mb-2">{script.file}</p>
                    <p className="text-xs text-indigo-600 font-medium">Duration: {script.duration}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Trigger Button */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">Test Control</h2>
              
              {testStatus === 'idle' && (
                <button
                  onClick={handleTriggerTest}
                  disabled={!selectedScript}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-5 h-5" />
                  Trigger Test
                </button>
              )}

              {testStatus === 'running' && (
                <button
                  onClick={handleStopTest}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-br from-red-500 to-orange-600 text-white rounded-lg hover:from-red-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg font-semibold"
                >
                  <Square className="w-5 h-5" />
                  Stop Test
                </button>
              )}

              {(testStatus === 'completed' || testStatus === 'failed') && (
                <div className="space-y-3">
                  <Link
                    to={`/application/${appId}`}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-semibold"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    View Results in Dashboard
                  </Link>
                  <button
                    onClick={handleReset}
                    className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-medium"
                  >
                    Run Another Test
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Test Status & Logs */}
          <div className="col-span-2 space-y-6">
            {/* Progress Section */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">Test Progress</h2>
              
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600 font-medium">
                      {testStatus === 'idle' ? 'Waiting to start...' :
                       testStatus === 'running' ? 'Test in progress...' :
                       testStatus === 'completed' ? 'Test completed!' :
                       'Test stopped'}
                    </span>
                    <span className="text-sm font-bold text-slate-800">{progress}%</span>
                  </div>
                  <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        testStatus === 'completed' ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
                        testStatus === 'failed' ? 'bg-gradient-to-r from-red-500 to-orange-600' :
                        'bg-gradient-to-r from-blue-500 to-cyan-600'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                {testStatus !== 'idle' && (
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Requests Sent</p>
                      <p className="text-2xl font-bold text-slate-800">
                        {Math.floor((progress / 100) * 1250)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Avg Response Time</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {Math.floor(200 + Math.random() * 100)}ms
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Error Rate</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {(Math.random() * 0.5).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Test Logs */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">Test Logs</h2>
              
              <div className="bg-slate-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
                {testLogs.length === 0 ? (
                  <p className="text-slate-500">No logs yet. Start a test to see logs...</p>
                ) : (
                  <div className="space-y-2">
                    {testLogs.map((log, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <span className="text-slate-500 text-xs whitespace-nowrap">[{log.timestamp}]</span>
                        <span className={`${
                          log.type === 'success' ? 'text-emerald-400' :
                          log.type === 'error' ? 'text-red-400' :
                          log.type === 'warning' ? 'text-amber-400' :
                          'text-slate-300'
                        }`}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
