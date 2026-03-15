import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogIn, Lock } from 'lucide-react';

export default function AdminLogin() {
  const { isAdmin, loading, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [pin, setPin] = useState('');
  const navigate = useNavigate();

  const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || "1234";

  if (loading) return null;
  if (isAdmin) return <Navigate to="/admin" />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);
    try {
      await login(pin);
      navigate('/admin');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocorreu um erro ao tentar fazer login.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 md:p-12">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#0054A6] rounded-2xl flex items-center justify-center text-white font-bold text-4xl mx-auto mb-6 shadow-lg">
            S
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">Painel Administrativo</h2>
          <p className="text-slate-500 font-medium">
            Faça login para gerenciar eventos e inscrições.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm animate-shake">
            <ShieldAlert className="flex-shrink-0 mt-0.5" size={18} />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2 text-center">
            <label className="text-sm font-bold text-slate-700 flex items-center justify-center gap-2">
              <Lock size={16} />
              Digite o PIN de Acesso
            </label>
            <input
              type="password"
              required
              maxLength={6}
              className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] transition-all text-center text-3xl tracking-[1em] font-black"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-[#0054A6] text-white font-bold py-4 px-6 rounded-2xl hover:bg-[#004488] shadow-lg shadow-[#0054A6]/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn size={20} />
                <span>Entrar no Painel</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
            Acesso Restrito SESI
          </p>
        </div>
      </div>
    </div>
  );
}
