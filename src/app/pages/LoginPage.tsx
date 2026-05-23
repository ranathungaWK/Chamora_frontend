import { Activity, Mail, Lock, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { buildApiUrl } from '../api';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
      {/* Back to Home Link */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <span className="font-semibold">Chamora</span>
      </Link>

      {/* Login/Signup Card */}
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
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

          {/* Toggle Tabs */}
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
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-semibold"
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
  );
}
