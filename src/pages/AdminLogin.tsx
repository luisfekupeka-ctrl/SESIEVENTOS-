import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogIn, Mail, Lock, Users, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminLogin() {
  const { isAdmin, loading, login, register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  if (loading) return null;
  if (isAdmin) return <Navigate to="/admin" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);
    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          throw new Error("As senhas não coincidem.");
        }
        await register(email, password, fullName);
        setIsRegistering(false);
        setError("Solicitação enviada! Aguarde a aprovação do administrador para acessar o painel.");
      } else {
        await login(email, password);
        navigate('/admin');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message === 'Invalid login credentials' 
        ? "Email ou senha incorretos." 
        : (err.message || "Ocorreu um erro."));
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 md:p-12 transition-all"
      >
        <div className="text-center mb-10">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-20 h-20 bg-[#0054A6] rounded-2xl flex items-center justify-center text-white font-bold text-4xl mx-auto mb-6 shadow-xl"
          >
            S
          </motion.div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            {isRegistering ? 'Solicitar Acesso' : 'Painel Administrativo'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {isRegistering 
              ? 'Preencha os dados abaixo para solicitar sua conta.' 
              : 'Entre com suas credenciais para gerenciar o sistema.'}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-8 p-4 rounded-xl flex items-start gap-3 text-sm animate-shake ${
              error.includes("Solicitação enviada") 
                ? "bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-700 dark:text-red-400"
            }`}
          >
            <ShieldAlert className="flex-shrink-0 mt-0.5" size={18} />
            <p className="font-medium">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegistering && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 ml-1">
                <Users size={16} />
                Nome Completo
              </label>
              <input
                type="text"
                required
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] dark:focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium"
                placeholder="Seu nome"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 ml-1">
              <Mail size={16} />
              Email
            </label>
            <input
              type="email"
              required
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] dark:focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 ml-1">
              <Lock size={16} />
              Senha
            </label>
            <input
              type="password"
              required
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] dark:focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isRegistering && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 ml-1">
                <Lock size={16} />
                Confirmar Senha
              </label>
              <input
                type="password"
                required
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] dark:focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-[#0054A6] hover:bg-[#004488] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-[#0054A6]/20 dark:shadow-blue-900/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {isLoggingIn ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn size={20} />
                <span>{isRegistering ? 'Solicitar Cadastro' : 'Entrar no Painel'}</span>
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-8 text-center text-sm font-medium flex flex-col gap-4">
          <button 
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            className="text-[#0054A6] dark:text-blue-400 hover:underline"
          >
            {isRegistering 
              ? 'Já tem uma conta? Faça login' 
              : 'Não tem acesso? Solicitar cadastro'}
          </button>

          <button
            type="button"
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center gap-2 transition-colors mx-auto text-xs"
            title="Limpar dados salvos no navegador em caso de erros"
          >
            <RefreshCw size={14} />
            Limpar Cache e Recarregar
          </button>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em]">
            Acesso Restrito SESI
          </p>
        </div>
      </motion.div>
    </div>
  );
}
