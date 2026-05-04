import { Activity, ArrowLeft, BarChart3, TrendingUp, TrendingDown, CheckCircle2, XCircle } from 'lucide-react';
import { Link, useParams } from 'react-router';

export function TestCycleComparisonPage() {
  const { appId } = useParams();
  const appName = appId === 'hms-001' ? 'Hospital Management System' : 'Application';

  // Mock test cycle data
  const testCycles = [
    {
      id: 1,
      name: 'Test Cycle #1',
      date: 'Apr 5, 2026',
      status: 'passed',
      avgResponseTime: '245ms',
      throughput: '1,250 req/s',
      errorRate: '0.5%',
      successRate: '99.5%'
    },
    {
      id: 2,
      name: 'Test Cycle #2',
      date: 'Apr 6, 2026',
      status: 'passed',
      avgResponseTime: '268ms',
      throughput: '1,180 req/s',
      errorRate: '0.8%',
      successRate: '99.2%'
    },
    {
      id: 3,
      name: 'Test Cycle #3',
      date: 'Apr 7, 2026',
      status: 'failed',
      avgResponseTime: '425ms',
      throughput: '950 req/s',
      errorRate: '5.2%',
      successRate: '94.8%'
    },
    {
      id: 4,
      name: 'Test Cycle #4',
      date: 'Apr 8, 2026',
      status: 'passed',
      avgResponseTime: '235ms',
      throughput: '1,320 req/s',
      errorRate: '0.3%',
      successRate: '99.7%'
    },
    {
      id: 5,
      name: 'Test Cycle #5',
      date: 'Apr 9, 2026',
      status: 'passed',
      avgResponseTime: '252ms',
      throughput: '1,285 req/s',
      errorRate: '0.4%',
      successRate: '99.6%'
    }
  ];

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
            <span className="text-indigo-700 font-medium">{testCycles.length} Test Cycles</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Total Cycles</p>
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-slate-800">{testCycles.length}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Passed</p>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-emerald-600">
              {testCycles.filter(c => c.status === 'passed').length}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Failed</p>
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600">
              {testCycles.filter(c => c.status === 'failed').length}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Success Rate</p>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-slate-800">
              {Math.round((testCycles.filter(c => c.status === 'passed').length / testCycles.length) * 100)}%
            </p>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-700">Test Cycle Results Comparison</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-br from-indigo-50 to-purple-50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Test Cycle</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Avg Response Time</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Throughput</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Error Rate</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {testCycles.map((cycle, index) => (
                  <tr
                    key={cycle.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      cycle.status === 'failed' ? 'bg-red-50/50' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          cycle.status === 'passed'
                            ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                            : 'bg-gradient-to-br from-red-500 to-orange-600'
                        }`}>
                          {cycle.status === 'passed' ? (
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          ) : (
                            <XCircle className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <span className="font-semibold text-slate-800">{cycle.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{cycle.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        cycle.status === 'passed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {cycle.status === 'passed' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {cycle.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${
                        parseInt(cycle.avgResponseTime) > 300 ? 'text-red-600' : 'text-emerald-600'
                      }`}>
                        {cycle.avgResponseTime}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{cycle.throughput}</span>
                        {index > 0 && (
                          parseInt(cycle.throughput) > parseInt(testCycles[index - 1].throughput) ? (
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${
                        parseFloat(cycle.errorRate) > 1 ? 'text-red-600' : 'text-emerald-600'
                      }`}>
                        {cycle.errorRate}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              parseFloat(cycle.successRate) >= 99 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: cycle.successRate }}
                          />
                        </div>
                        <span className="font-semibold text-slate-800 text-sm">{cycle.successRate}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
