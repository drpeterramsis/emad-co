
import React, { useState } from 'react';
import { loginUser } from '../utils/auth';
import { Loader2, Lock, ArrowRight, ShieldCheck, AlertCircle, Mail, Pill } from 'lucide-react';
import { UserProfile } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      const result = await loginUser(email.trim(), password);
      
      if (result.success && result.user) {
        onLogin(result.user);
      } else {
        setError(result.error || t('unauthorized'));
      }
    } catch (err) {
      setError(t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-white/5 pointer-events-none" />
          <div className="bg-white/20 w-16 h-16 rounded-2xl rotate-45 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm shadow-lg">
             <div className="-rotate-45">
               <Pill className="text-white" size={32} />
             </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Emad Co. Sales Portal</h1>
          <p className="text-teal-100 text-sm font-medium">{t('authorizedPersonnel')}</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                {t('emailAddress')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                  placeholder="name@emadco.com"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label htmlFor="pass" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input
                  id="pass"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> {t('verifying')}
                </>
              ) : (
                <>
                  {t('loginToPortal')} <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              {t('restrictedAccess')} v2.0.038
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Developer Dr. Peter Ramsis all rights reserved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
