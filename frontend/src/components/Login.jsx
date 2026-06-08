import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import logo from '../logo.jpeg';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection to server failed. Please ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
      <div className="w-full max-w-md px-6 py-10">
        <div className="bg-white shadow-lg rounded-3xl border border-slate-200 overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-white shadow-md">
                <img src={logo} alt="PISCS Logo" className="w-10 h-10 object-contain" />
              </div>
              <div className="text-center">
                <h1 className="text-lg font-bold">Preacher Invitation & Service Coordination System</h1>
                <p className="text-xs text-slate-500">(PISCS) — streamlining preacher invitations and scheduling across The Rwanda Union Mission (RUM) of Seventh-day Adventists</p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm">
                  {error}
                </div>
              )}

              <label className="block text-sm font-semibold text-black">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@church.org"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent text-sm"
              />

              <label className="block text-sm font-semibold text-black">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent text-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60"
              >
                {loading ? 'Logging in…' : 'Log in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
