import { Activity, Mail, Lock, ArrowRight, Copy, Github, CheckCircle2, Shield, Server, TestTube } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { buildApiUrl } from '../api';

const TESTING_REPO_URL = 'https://github.com/ranathungaWK/Testing-Environment-';

function getErrorMessage(detail: unknown, fallback: string) {
  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg?: unknown }).msg ?? 'Validation error');
        }

        return JSON.stringify(item);
      })
      .join(', ');
  }

  if (detail && typeof detail === 'object') {
    return JSON.stringify(detail);
  }

  return fallback;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');

  const handleCopyRepo = async () => {
    await navigator.clipboard.writeText(TESTING_REPO_URL);
    setCopyFeedback('Repository URL copied');
    window.setTimeout(() => setCopyFeedback(''), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
      if (isLogin) {
        const response = await fetch(buildApiUrl('/api/v1/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, timezone }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(getErrorMessage(error.detail, 'Login failed'));
        }

        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('timezone', timezone);
        localStorage.setItem('user', JSON.stringify({ email, name: name || 'User' }));
      } else {
        const response = await fetch(buildApiUrl('/api/v1/auth/signup'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: name, email, password, timezone }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(getErrorMessage(error.detail, 'Signup failed'));
        }

        const tokenData = await response.json();
        localStorage.setItem('access_token', tokenData.access_token);
        localStorage.setItem('timezone', timezone);
        localStorage.setItem(
          'user',
          JSON.stringify({
            email,
            name: name || 'User',
          }),
        );
      }

      navigate('/dashboard');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_0.95fr] gap-10 items-start">
        <div className="pt-2 lg:pt-6 lg:pr-4">
          {/* Back to Home Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors mb-8"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="font-semibold">Chamora</span>
          </Link>

          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-4">
            Clone the environment, then continue setup.
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-xl">
            Use the shared repository to clone the testing environment into your project.
            After that, configure the necessary endpoints and finish the onboarding flow.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {[
              { title: 'Clone first', text: 'Start with the shared testing environment repository.' },
              { title: 'Configure next', text: 'Set the endpoints mentioned in the project flow.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="inline-flex items-center gap-2 text-indigo-700 font-semibold mb-2">
                  <Shield className="w-4 h-4" />
                  {item.title}
                </div>
                <p className="text-sm text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Clone access</h2>
            <div className="flex flex-wrap gap-3 items-center">
              <button
                type="button"
                onClick={handleCopyRepo}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy testing repo URL
              </button>
              <Link
                to="/setup-testing-environment"
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 font-medium text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100 transition-colors"
              >
                <TestTube className="w-4 h-4" />
                How to setup testing environment
              </Link>
              {copyFeedback ? <span className="text-sm text-emerald-600">{copyFeedback}</span> : null}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 p-6 text-white shadow-xl shadow-indigo-100">
            <div className="grid gap-3 text-white/95">
              {[
                'Start by clicking Get Started.',
                'Clone the testing environment into your project.',
                'Set the required endpoints mentioned in the guide.',
                'You are ready to continue with us.',
              ].map((item, index) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
                    {index + 1}
                  </div>
                  <p className="leading-6">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Login/Signup Card */}
        <div className="w-full max-w-md lg:max-w-none lg:pt-6">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-2xl p-8 lg:sticky lg:top-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-slate-600">
                {isLogin
                  ? 'Login to access your dashboard'
                  : 'Sign up to start managing your applications'}
              </p>
            </div>

            <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2.5 rounded-md font-medium transition-all ${
                  isLogin
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2.5 rounded-md font-medium transition-all ${
                  !isLogin
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name field (only for signup) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required={!isLogin}
                    className="w-full bg-white border-2 border-slate-300 focus:border-indigo-400 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full bg-white border-2 border-slate-300 focus:border-indigo-400 rounded-lg pl-11 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full bg-white border-2 border-slate-300 focus:border-indigo-400 rounded-lg pl-11 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                  />
                </div>
              </div>

              {/* Forgot Password (only for login) */}
              {isLogin && (
                <div className="text-right">
                  <button
                    type="button"
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-br from-indigo-500 to-cyan-500 text-white rounded-lg hover:from-indigo-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg font-semibold"
              >
                {isSubmitting
                  ? 'Please wait...'
                  : isLogin
                  ? 'Login to Dashboard'
                  : 'Create Account'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>


            
          </div>
        </div>
      </div>
    </div>
  );
}
