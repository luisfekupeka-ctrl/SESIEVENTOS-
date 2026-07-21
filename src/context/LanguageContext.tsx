import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'pt' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  pt: {
    // Navigation / Layout
    'Início': 'Início',
    'Painel Admin': 'Painel Admin',
    'Acessar Painel': 'Acessar Painel',
    'Sair': 'Sair',
    'Dashboard': 'Dashboard',
    'Calendário': 'Calendário',
    'Meus Eventos': 'Meus Eventos',
    'Eventos': 'Eventos',
    'Categorias': 'Categorias',
    'Participantes': 'Participantes',
    'Alunos': 'Alunos',
    'Colaboradores': 'Colaboradores',
    'Responsáveis': 'Responsáveis',
    'Segurança': 'Segurança',
    'Administradores': 'Administradores',
    'Sair do Sistema': 'Sair do Sistema',
    'Painel Principal': 'Painel Principal',
    'Todos os direitos reservados.': 'Todos os direitos reservados.',
    'Admin': 'Admin',

    // Dashboard General
    'Carregando...': 'Carregando...',
    'Total de Inscrições': 'Total de Inscrições',
    'Eventos Ativos': 'Eventos Ativos',
    'Total de Alunos': 'Total de Alunos',
    'Vagas Preenchidas': 'Vagas Preenchidas',
    'Últimas Inscrições': 'Últimas Inscrições',
    'Inscrição Realizada': 'Inscrição Realizada',
    'Nenhuma inscrição recente.': 'Nenhuma inscrição recente.',
    'Alunos Ativos': 'Alunos Ativos',
    'Visualizar inscrições': 'Visualizar inscrições',
    'Painel de Controle': 'Painel de Controle',
    'Gestão inteligente e visão geral do sistema SESI.': 'Gestão inteligente e visão geral do sistema SESI.',
    'Atualizar': 'Atualizar',
    'Gerar Dados': 'Gerar Dados',
    'Resetar': 'Resetar',
    'Sincronizar Contagens': 'Sincronizar Contagens',
    'Eventos Recentes': 'Eventos Recentes',
    'Ver todos': 'Ver todos',
  },
  en: {
    // Navigation / Layout
    'Início': 'Home',
    'Painel Admin': 'Admin Panel',
    'Acessar Painel': 'Access Panel',
    'Sair': 'Logout',
    'Dashboard': 'Dashboard',
    'Calendário': 'Calendar',
    'Meus Eventos': 'My Events',
    'Eventos': 'Events',
    'Categorias': 'Categories',
    'Participantes': 'Participants',
    'Alunos': 'Students',
    'Colaboradores': 'Collaborators',
    'Responsáveis': 'Responsible',
    'Segurança': 'Security',
    'Administradores': 'Administrators',
    'Sair do Sistema': 'Log out of the system',
    'Painel Principal': 'Main Panel',
    'Todos os direitos reservados.': 'All rights reserved.',
    'Admin': 'Admin',

    // Dashboard General
    'Carregando...': 'Loading...',
    'Total de Inscrições': 'Total Registrations',
    'Eventos Ativos': 'Active Events',
    'Total de Alunos': 'Total Students',
    'Vagas Preenchidas': 'Filled Spots',
    'Últimas Inscrições': 'Latest Registrations',
    'Inscrição Realizada': 'Registration Successful',
    'Nenhuma inscrição recente.': 'No recent registrations.',
    'Alunos Ativos': 'Active Students',
    'Visualizar inscrições': 'View registrations',
    'Painel de Controle': 'Control Panel',
    'Gestão inteligente e visão geral do sistema SESI.': 'Smart management and overview of the SESI system.',
    'Atualizar': 'Refresh',
    'Gerar Dados': 'Generate Data',
    'Resetar': 'Reset',
    'Sincronizar Contagens': 'Sync Counts',
    'Eventos Recentes': 'Recent Events',
    'Ver todos': 'View all',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'pt';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
