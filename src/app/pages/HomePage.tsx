import { Activity, ArrowRight, CheckCircle2, Shield, Zap, BarChart3 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-600">
              Chamora
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="px-6 py-2.5 text-slate-700 hover:text-indigo-600 font-medium transition-colors"
            >
              Login
            </Link>
            <Link
              to="/login"
              className="px-6 py-2.5 bg-gradient-to-br from-indigo-500 to-cyan-500 text-white rounded-lg hover:from-indigo-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg font-medium"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-start mb-14 lg:mb-20">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              A simple start for every new user
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6">
              Start fast, configure once, and
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-cyan-500 to-sky-500">
                move into testing with us.
              </span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl">
              Chamora helps you launch a ready-made testing environment, connect the right endpoints,
              and get your project into a working state without extra setup noise.
            </p>
            <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl p-5 shadow-xl shadow-slate-200/60">
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-indigo-200 transition-all"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  First click Get Started, then clone the shared repo from the next page.
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-transparent to-cyan-100 blur-3xl" />
            <div className="relative bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl shadow-slate-200/60">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-sm text-slate-500">How it works</p>
                  <h2 className="text-2xl font-semibold text-slate-900">Three quick steps</h2>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-indigo-500" />
                </div>
              </div>
              <div className="space-y-4">
                {[
                  'First click Get Started.',
                  'Clone the testing environment to your project.',
                  'Configure the necessary endpoints mentioned, then you are with us.',
                ].map((item, index) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                      {index + 1}
                    </div>
                    <p className="text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 lg:mt-12">
          {/* Feature 1 */}
          <div className="bg-white border border-slate-200 rounded-xl p-8 hover:border-indigo-300 hover:shadow-lg transition-all">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg flex items-center justify-center mb-6 shadow-lg shadow-indigo-200/60">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Intelligent Automation</h3>
            <p className="text-slate-600">
              Automate your testing workflows with AI-powered insights and recommendations for optimal performance.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white border border-slate-200 rounded-xl p-8 hover:border-indigo-300 hover:shadow-lg transition-all">
            <div className="w-14 h-14 bg-gradient-to-br from-fuchsia-500 to-indigo-500 rounded-lg flex items-center justify-center mb-6 shadow-lg shadow-fuchsia-200/60">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Performance Analytics</h3>
            <p className="text-slate-600">
              Deep insights into application performance with real-time monitoring and comprehensive reporting.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white border border-slate-200 rounded-xl p-8 hover:border-indigo-300 hover:shadow-lg transition-all">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center mb-6 shadow-lg shadow-emerald-200/60">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Anomaly Detection</h3>
            <p className="text-slate-600">
              Automatically detect and alert on performance anomalies before they impact your users.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 lg:mt-20 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl p-12 text-center text-white shadow-2xl shadow-indigo-100">
          <h2 className="text-3xl font-bold mb-4">A cleaner path into testing.</h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Get a focused start screen, then move into the get-started page to clone the environment and continue setup.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-indigo-700 rounded-xl hover:bg-slate-50 transition-all shadow-lg hover:shadow-xl text-lg font-semibold"
          >
            Get Started Now
            <CheckCircle2 className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
