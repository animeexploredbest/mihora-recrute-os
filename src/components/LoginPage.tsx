import React, { useState } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  Loader2,
  AlertTriangle,
  Mail,
  Eye,
  EyeOff,
  User,
  CheckCircle2,
} from 'lucide-react';
import appLogoImg from '../assets/images/app_logo_1789732302179.jpg';
import { postgresLogin, googleSignIn, AUTHORIZED_GOOGLE_EMAILS } from '../lib/auth';
import { AppUser } from '../types';

interface LoginPageProps {
  onSuccess?: (user: AppUser) => void;
  onGoogleLogin?: () => Promise<void>;
  isLoggingIn?: boolean;
  authErrorMessage?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onGoogleLogin,
  isLoggingIn = false,
  authErrorMessage,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      setFormError('Please enter your username/email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await postgresLogin({ identifier: cleanId, password });
      if (onSuccess) onSuccess(res.user);
    } catch (err: any) {
      setFormError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setIsLoading(true);
    try {
      if (onGoogleLogin) {
        await onGoogleLogin();
      } else {
        const res = await googleSignIn();
        if (res?.user && onSuccess) {
          onSuccess(res.user);
        }
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setFormError(err.message || 'Google Sign-In was cancelled or failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-blue-500 selection:text-white">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10">
        {/* Left Side: Brand & Overview */}
        <div className="md:w-5/12 p-8 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/60">
          <div>
            <div className="flex items-center gap-3.5 mb-8">
              <img
                src={appLogoImg}
                alt="RecruitSync Logo"
                className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shadow-lg"
              />
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  RecruitSync
                </h1>
                <p className="text-xs text-slate-400">
                  Global PKT Interview Workspace
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold">Conflict-Free PKT Scheduler</strong>
                  Automatic international timezone conversion aligned to Pakistan Standard Time (UTC+5).
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold">Google Meet &amp; Calendar Sync</strong>
                  Instant video meeting links and live attendee calendar invites.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold">Role-Based Staff Access</strong>
                  New team members are registered exclusively by administrators from inside the portal.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 mt-8 text-[11px] text-slate-400">
            <span>Enterprise Edition · Authorized Staff Only</span>
          </div>
        </div>

        {/* Right Side: Sign In Form */}
        <div className="md:w-7/12 p-8 sm:p-10 flex flex-col justify-center bg-slate-900/90 relative">
          <div className="max-w-md mx-auto w-full space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-500/10 text-blue-400 border border-blue-500/25 mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                Staff Sign In
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Sign In to Workspace
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your staff username or email to access your interview pipeline.
              </p>
            </div>

            {/* Error Message if any */}
            {(formError || authErrorMessage) && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-semibold text-rose-200 block">Notice</strong>
                  {formError || authErrorMessage}
                </div>
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your username or email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all placeholder:text-slate-600 font-mono"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || isLoggingIn}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 text-xs sm:text-sm mt-2"
              >
                {isLoading || isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800" />
                <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase tracking-wider font-medium">
                  or administrative access
                </span>
                <div className="flex-grow border-t border-slate-800" />
              </div>

              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isLoggingIn}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white font-medium rounded-xl shadow-xs transition-all cursor-pointer text-xs sm:text-sm disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Authorized Emails Clarification */}
              <div className="pt-2 text-[11px] text-slate-400 leading-relaxed text-center space-y-1">
                <p className="text-slate-400">
                  Google login is reserved for primary administrators:
                </p>
                <div className="flex flex-wrap justify-center gap-1 text-[10px] font-mono text-blue-300">
                  {AUTHORIZED_GOOGLE_EMAILS.map((email) => (
                    <span key={email} className="bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60">
                      {email}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 pt-1">
                  New staff accounts are registered inside the portal by an administrator.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
