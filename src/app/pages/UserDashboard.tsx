import { Activity, LogOut, Plus, Server, TestTube, FolderOpen, TrendingUp, Clock, Play, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../api';

interface UserApplication {
  id: number;
  name: string;
  description: string | null;
  github_repo?: string | null;
  grafana_url?: string | null;
  victoria_metrics_url?: string | null;
  endpoints?: Array<{
    id: number;
    application_id: number;
    target_name: string;
    container_name: string;
  }>;
}

export function UserDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [applications, setApplications] = useState<UserApplication[]>([]);
  const [appHealthStatuses, setAppHealthStatuses] = useState<Record<number, 'active' | 'inactive' | 'loading'>>({});
  const [appMonitoringStatuses, setAppMonitoringStatuses] = useState<Record<number, { status: 'connected' | 'failed' | 'pending' | 'loading'; message: string }>>({});
  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [appsError, setAppsError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');

    if (!userData || !token) {
      navigate('/login');
      return;
    }

    setUser(JSON.parse(userData));

    const fetchApplications = async () => {
      setAppsError('');
      setIsLoadingApps(true);
      try {
        const response = await fetch(buildApiUrl('/api/v1/application/me'), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          const detail = typeof error.detail === 'string' ? error.detail : 'Failed to load applications';
          throw new Error(detail);
        }

        const data = (await response.json()) as UserApplication[];
        setApplications(data);

        // Initialize health and monitoring statuses as loading
        const initialHealth: Record<number, 'active' | 'inactive' | 'loading'> = {};
        const initialMonitoring: Record<number, { status: 'connected' | 'failed' | 'pending' | 'loading'; message: string }> = {};
        data.forEach(app => {
          initialHealth[app.id] = 'loading';
          initialMonitoring[app.id] = { status: 'loading', message: 'Checking monitoring...' };
        });
        setAppHealthStatuses(initialHealth);
        setAppMonitoringStatuses(initialMonitoring);

        // Fetch health and monitoring status for each application
        data.forEach(async (app) => {
          // Health check
          try {
            const healthRes = await fetch(buildApiUrl(`/api/v1/application/${app.id}/health-check`), {
              headers: { Authorization: `Bearer ${token}` }
            });
            const healthData = await healthRes.json();
            setAppHealthStatuses(prev => ({ ...prev, [app.id]: healthData.status }));
          } catch (error) {
            setAppHealthStatuses(prev => ({ ...prev, [app.id]: 'inactive' }));
          }

          // Monitoring status check
          try {
            const monitoringRes = await fetch(buildApiUrl(`/api/v1/application/${app.id}/monitoring-status`), {
              headers: { Authorization: `Bearer ${token}` }
            });
            const monitoringData = await monitoringRes.json();
            setAppMonitoringStatuses(prev => ({ ...prev, [app.id]: monitoringData }));
          } catch (error) {
            setAppMonitoringStatuses(prev => ({
              ...prev,
              [app.id]: { status: 'failed', message: 'Monitoring Failed' }
            }));
          }
        });
      } catch (error) {
        setAppsError(error instanceof Error ? error.message : 'Failed to load applications');
      } finally {
        setIsLoadingApps(false);
      }
    };

    void fetchApplications();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Bar */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-400 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-blue-900">
                Chamora Dashboard
              </h1>
              <p className="text-xs text-slate-600">AI Performance Intelligence Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right mr-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5">
              <p className="text-[11px] font-medium text-slate-500">Logged in as</p>
              <p className="text-sm font-semibold text-blue-900 leading-tight">{user.name}</p>
              <p className="text-xs text-slate-600 leading-tight">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 border border-transparent rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-blue-900 mb-2">My Applications</h2>
              <p className="text-slate-600">Manage and monitor your registered applications</p>
            </div>
            <Link
              to="/onboarding"
              className="flex items-center gap-2 px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-slate-800 transition-all shadow-md hover:shadow-lg font-medium"
            >
              <Plus className="w-5 h-5" />
              Register New Application
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Total Applications</p>
                <Server className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-900">{applications.length}</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Active Apps</p>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-900">
                {applications.length}
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Total Test Cycles</p>
                <TestTube className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-900">0</p>
            </div>

          </div>
        </div>

        {/* Applications Grid */}
        {appsError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {appsError}
          </div>
        )}

        {isLoadingApps && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading your applications...</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-600 shadow-sm shadow-blue-200">
                      <Server className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-blue-900">{app.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        {appHealthStatuses[app.id] === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            active
                          </span>
                        ) : appHealthStatuses[app.id] === 'loading' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                            loading
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            inactive
                          </span>
                        )}
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          synced now
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-600 mb-4 ml-15">{app.description || 'No description provided'}</p>

                  <div className="flex items-center gap-6 text-sm text-slate-600 ml-15">
                    <div className="flex items-center gap-2">
                      <TestTube className="w-4 h-4 text-blue-600" />
                      <span>{app.endpoints?.length ?? 0} Endpoints</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {appMonitoringStatuses[app.id]?.status === 'loading' ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      ) : (
                        <Server className={`w-4 h-4 ${
                          appMonitoringStatuses[app.id]?.status === 'connected'
                            ? 'text-emerald-600'
                            : appMonitoringStatuses[app.id]?.status === 'failed'
                            ? 'text-red-500'
                            : 'text-slate-400'
                        }`} />
                      )}
                      <span className={
                        appMonitoringStatuses[app.id]?.status === 'connected'
                          ? 'text-emerald-700 font-medium'
                          : appMonitoringStatuses[app.id]?.status === 'failed'
                          ? 'text-red-600 font-medium'
                          : 'text-slate-600'
                      }>
                        {appMonitoringStatuses[app.id]?.message || 'Monitoring Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Link
                    to={`/application/${app.id}`}
                    className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md hover:shadow-lg font-medium text-center whitespace-nowrap"
                  >
                    Open Dashboard
                  </Link>
                  
                  <div className="flex gap-2">
                    <Link
                      to={`/onboarding/${app.id}/2`}
                      className="flex items-center gap-1 px-4 py-2 bg-blue-100 text-sky-700 border border-sky-200 rounded-lg hover:bg-blue-200 transition-all text-sm font-medium"
                    >
                      <TestTube className="w-4 h-4" />
                      Add Tests
                    </Link>
                    <Link
                      to={`/onboarding/${app.id}/3`}
                      className="flex items-center gap-1 px-4 py-2 bg-blue-100 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all text-sm font-medium"
                    >
                      <FolderOpen className="w-4 h-4" />
                      Add Docs
                    </Link>
                  </div>

                  <Link
                    to={`/automated-testing/${app.id}`}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all text-sm font-semibold shadow-sm"
                  >
                    <Play className="w-4 h-4" />
                    Run Automated Tests
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State (when no applications) */}
        {applications.length === 0 && (
          <div className="bg-white/80 backdrop-blur-sm border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Server className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-blue-900 mb-2">No Applications Yet</h3>
            <p className="text-slate-600 mb-6">Get started by registering your first application</p>
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-slate-800 transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Register New Application
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}