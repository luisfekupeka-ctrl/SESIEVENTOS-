import React from 'react';
import { Eye, Clock, Lock, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useDisplayMode } from '../hooks/useDisplayMode';

export const DisplayModeBanner: React.FC = () => {
  const { isDisplayModeActive, isCountdownActive, secondsLeft, isUnlocked } = useDisplayMode();

  if (isUnlocked) return null;

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full relative z-40">
      {isDisplayModeActive && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20 border-b border-yellow-400/30 backdrop-blur-md py-3 px-4 text-center"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-xs md:text-sm font-black text-yellow-300 uppercase tracking-wider">
            <span className="p-1.5 rounded-lg bg-yellow-400/20 border border-yellow-400/40 animate-pulse">
              <Eye size={18} className="text-yellow-400" />
            </span>
            <span>
              Modo de Exibição Ativo — Você pode navegar por todos os Afters! As inscrições serão liberadas pelo administrador.
            </span>
          </div>
        </motion.div>
      )}

      {isCountdownActive && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 border-b border-yellow-300 py-3.5 px-4 text-center shadow-[0_0_30px_rgba(234,179,8,0.4)]"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-xs md:text-base font-black text-slate-950 uppercase tracking-widest">
            <span className="p-2 rounded-xl bg-slate-950/20 border border-slate-950/30 animate-bounce">
              <Clock size={22} className="text-slate-950" />
            </span>
            <span>
              Inscrições Serão Liberadas em:
            </span>
            <span className="px-3.5 py-1 bg-slate-950 text-yellow-400 rounded-xl font-mono text-lg md:text-xl font-black shadow-inner border border-yellow-400/30 tracking-widest">
              {formatSeconds(secondsLeft)}
            </span>
            <Sparkles size={20} className="text-slate-950 animate-pulse hidden sm:inline" />
          </div>
        </motion.div>
      )}
    </div>
  );
};
