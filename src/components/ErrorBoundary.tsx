import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
          <div className="max-w-2xl w-full bg-[#0A0A0A] rounded-[3rem] p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
            
            <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-[2rem] flex items-center justify-center mb-10 mx-auto border border-red-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            
            <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Sistema em Manutenção</h1>
            <p className="text-slate-400 mb-10 font-bold text-xl leading-relaxed">
              Detectamos um problema técnico inesperado. <br/>
              Nossa equipe já foi notificada.
            </p>
            
            <div className="text-left bg-black p-8 rounded-3xl mb-10 overflow-auto max-h-48 border border-white/5">
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3">Detalhes do Erro:</p>
              <code className="text-xs font-mono text-slate-500 break-words leading-relaxed">
                {this.state.error?.toString()}
                <br/>
                {this.state.error?.stack?.split('\n').slice(0, 3).join('\n')}
              </code>
            </div>
            
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
              }}
              className="w-full py-5 bg-sky-500 text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-sky-400 transition-all shadow-[0_0_30px_rgba(14,165,233,0.3)]"
            >
              Reinicializar e Voltar ao Início
            </button>
            
            <p className="mt-8 text-[10px] font-black text-slate-800 uppercase tracking-[0.3em]">
              SESI EVENTOS • Módulo de Segurança
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
