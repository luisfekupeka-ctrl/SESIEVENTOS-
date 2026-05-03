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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 text-center">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Ops! Algo deu errado.</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">
              Ocorreu um erro inesperado ao carregar esta página.
            </p>
            <div className="text-left bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-6 overflow-auto max-h-32 text-xs font-mono text-red-600 dark:text-red-400">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#0054A6] dark:bg-blue-600 text-white font-bold rounded-2xl hover:bg-[#004080] transition-all shadow-lg shadow-blue-500/20"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.children;
  }
}
