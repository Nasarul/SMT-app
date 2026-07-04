import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { Eye, EyeOff, Plane, Lock, Mail, AlertCircle, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function LoginPage() {
  const { signIn } = useAuth();
  const { company } = useSettings();
  const [logoError, setLogoError] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSuccessMessage('');
    setLoading(true);
    
    try {
      if (isForgotPassword) {
        if (!validateEmail(email)) {
          setAuthError('Please enter a valid email address.');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });

        if (error) {
          if (error.message.includes('not found') || error.status === 422) {
            setAuthError('No user found with this email address.');
          } else {
            setAuthError(error.message);
          }
        } else {
          setSuccessMessage('A password reset link has been sent to your email address. Please check your inbox and follow the instructions to reset your password.');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) setAuthError(error);
      }
    } catch (err) {
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-900 via-secondary-800 to-primary-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M40 0L50 14H30L40 0zM40 80L30 66H50L40 80zM0 40L14 30V50L0 40zM80 40L66 50V30L80 40z'/%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <div className="w-full max-w-lg relative animate-fade-in">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary-400 to-secondary-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden p-3 ring-1 ring-white/50">
                {company.logo_url && !logoError ? (
                  <img 
                    src={`${company.logo_url}?v=${Date.now()}`} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center rounded-xl">
                    <Plane size={40} className="text-white rotate-45" />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4">
              <h1 className="text-3xl font-heading font-bold text-white tracking-tight drop-shadow-md">
                {company.name || 'Sonar Madina Travels'}
              </h1>
              <p className="text-primary-200 text-sm font-medium mt-2 uppercase tracking-[0.3em] opacity-80">
                Management Portal
              </p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-modal p-10 border border-white/20">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              {isForgotPassword && (
                <button 
                  onClick={() => { setIsForgotPassword(false); setAuthError(''); setSuccessMessage(''); }}
                  className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <h2 className="text-2xl font-heading font-semibold text-neutral-800">
                {isForgotPassword ? 'Reset Password' : 'Sign In'}
              </h2>
            </div>
            <p className="text-neutral-500 mt-1">
              {isForgotPassword 
                ? 'Enter your email to receive a password reset link' 
                : 'Enter your credentials to access the secure dashboard'}
            </p>
          </div>

          {authError && (
            <div className="flex items-center gap-3 p-4 bg-error-50 border border-error-100 rounded-xl mb-6 animate-shake">
              <AlertCircle size={20} className="text-error-500 shrink-0" />
              <p className="text-sm text-error-700 font-medium">{authError}</p>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-3 p-4 bg-success-50 border border-success-100 rounded-xl mb-6 animate-in slide-in-from-top-2">
              <CheckCircle2 size={20} className="text-success-500 shrink-0 mt-0.5" />
              <p className="text-sm text-success-700 font-medium leading-relaxed">{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-neutral-700 ml-1">Email Address</label>
              <div className="relative group">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl pl-12 pr-4 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  placeholder="admin@smtravels.com.bd"
                  required
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-sm font-semibold text-neutral-700">Password</label>
                  <button 
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setAuthError(''); setSuccessMessage(''); }}
                    className="text-[11px] font-bold text-primary-500 hover:text-primary-600 transition-colors uppercase tracking-wider"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary-500 transition-colors" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl pl-12 pr-12 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary-600 transition-colors p-1"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ShieldCheck size={20} />
              )}
              {loading 
                ? (isForgotPassword ? 'Sending Link...' : 'Authenticating...') 
                : (isForgotPassword ? 'Send Reset Link' : 'Sign In to Dashboard')}
            </button>
            
            {isForgotPassword && (
              <button 
                type="button"
                onClick={() => { setIsForgotPassword(false); setAuthError(''); setSuccessMessage(''); }}
                className="w-full text-center text-xs font-bold text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                Back to Login
              </button>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-primary-200 text-xs font-medium opacity-60">
            © 2025 {company.name || 'Sonar Madina Travels'}. All rights reserved.
          </p>
          <p className="text-primary-300 text-[10px] uppercase tracking-widest opacity-40">
            Secure Management System v2.1.0
          </p>
        </div>
      </div>
    </div>
  );
}

