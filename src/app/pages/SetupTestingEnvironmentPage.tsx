import { ArrowLeft, BarChart3, CheckCircle2, Github, Shield, TestTube, Server } from 'lucide-react';
import { Link } from 'react-router-dom';

const TESTING_REPO_URL = 'https://github.com/ranathungaWK/Testing-Environment-';

export function SetupTestingEnvironmentPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <div className="flex items-center justify-between gap-4 mb-10">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to get started
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
            <TestTube className="w-4 h-4" />
            Setup testing environment
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-start">
          <section className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/60 p-8 lg:p-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-slate-50 text-slate-700 text-sm font-medium mb-6">
              <Github className="w-4 h-4" />
              Repository: Testing-Environment-
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-4">
              How to set up the testing environment
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl">
              Follow these steps after you clone the repository so your environment is ready for the
              Chamora flow.
            </p>

            <div className="space-y-4">
              {[
                'Clone the shared repository into your project workspace.',
                'Update the Grafana and Victoria Metrics endpoints in the onboarding step.',
                'Add your blackbox targets and container names where needed.',
                'Save the application and continue with your testing flow.',
              ].map((step, index) => (
                <div key={step} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Step {index + 1}</p>
                    <p className="text-slate-600">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-6 lg:sticky lg:top-8">
            <div className="bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-100">
              <h2 className="text-2xl font-semibold mb-3">What you need ready</h2>
              <div className="space-y-4 text-white/90">
                {[
                  'A cloned testing environment repository',
                  'Grafana endpoint for the test environment',
                  'Victoria Metrics endpoint for the test environment',
                  'Any blackbox target details you want to monitor',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 w-5 h-5" />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/60">
              <div className="flex items-center gap-3 mb-4">
                <Server className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-semibold text-slate-900">Quick reminder</h2>
              </div>
              <p className="text-slate-600 mb-4">
                Once the repo is cloned, the setup flow in Chamora should receive the endpoints and
                application details before you move ahead.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-white font-semibold hover:bg-slate-800 transition-colors"
              >
                <Shield className="w-4 h-4" />
                Go back to get started
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}