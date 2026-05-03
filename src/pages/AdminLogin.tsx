import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogIn, Mail, Lock, Users, RefreshCw, Loader2 } from 'lucide-react';
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
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className="max-w-md w-full bg-[#0A0A0A] rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5 p-12 md:p-16 relative overflow-hidden group"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="text-center mb-12">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-24 h-24 bg-yellow-500 rounded-3xl flex items-center justify-center text-black font-black text-5xl mx-auto mb-8 shadow-[0_0_30px_rgba(234,179,8,0.3)]"
          >
            S
          </motion.div>
          <h2 className="text-4xl font-black text-white mb-3 tracking-tight">
            {isRegistering ? 'Solicitar Acesso' : 'Restrito'}
          </h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
            {isRegistering 
              ? 'Área de Credenciamento SESI' 
              : 'Painel de Controle Administrativo'}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-10 p-5 rounded-2xl flex items-start gap-4 text-sm font-bold border-2 ${
              error.includes("Solicitação enviada") 
                ? "bg-green-500/5 border-green-500/20 text-green-500"
                : "bg-red-500/5 border-red-500/20 text-red-500"
            }`}
          >
            <ShieldAlert className="flex-shrink-0 mt-0.5" size={20} />
            <p>{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {isRegistering && (
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
              <div className="relative">
                <Users className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700" size={20} />
                <input
                  type="text"
                  required
                  className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-white font-bold"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Endereço de Email</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700" size={20} />
              <input
                type="email"
                required
                className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-white font-bold"
                placeholder="exemplo@sesi.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha Secreta</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700" size={20} />
              <input
                type="password"
                required
                className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-white font-bold"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {isRegistering && (
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Validar Senha</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700" size={20} />
                <input
                  type="password"
                  required
                  className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-white font-bold"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest text-xs py-5 px-8 rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all flex items-center justify-center gap-4 disabled:opacity-50 mt-4"
          >
            {isLoggingIn ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <LogIn size={20} />
                <span>{isRegistering ? 'Solicitar Registro' : 'Autenticar'}</span>
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-12 text-center flex flex-col gap-5">
          <button 
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            className="text-white/40 hover:text-yellow-500 font-black uppercase tracking-widest text-[10px] transition-colors"
          >
            {isRegistering 
              ? 'Já sou administrador? Logar' 
              : 'Não possui acesso? Solicitar'}
          </button>

          <button
            type="button"
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="text-slate-800 hover:text-slate-600 flex items-center justify-center gap-2 transition-colors mx-auto font-black uppercase tracking-widest text-[8px]"
          >
            <RefreshCw size={12} />
            Reinicializar Sistema
          </button>
        </div>
      </motion.div>
    </div>
  );
}
