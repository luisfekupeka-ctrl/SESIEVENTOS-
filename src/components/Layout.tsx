import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  LogOut, 
  Tags, 
  GraduationCap, 
  School, 
  Shield, 
  Menu, 
  X,
  Plus,
  FileSpreadsheet,
  LogIn,
  Languages
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { DisplayModeBanner } from './DisplayModeBanner';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, logout, profile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const isAdminPath = location.pathname.startsWith('/admin');

  React.useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col font-sans transition-colors duration-300 text-white">
      <DisplayModeBanner />
      {/* Header */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-black font-black text-2xl group-hover:rotate-6 transition-transform shadow-lg shadow-yellow-400/20">S</div>
            <span className="text-xl md:text-2xl font-black text-white transition-colors tracking-tight">SESI <span className="text-yellow-400">Eventos</span></span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className={`text-sm font-black uppercase tracking-widest transition-all hover:scale-105 ${location.pathname === '/' ? 'text-yellow-400' : 'text-slate-400 hover:text-white'}`}>
              {t('Início')}
            </Link>
            {isAdmin && (
              <Link to="/admin" className={`text-sm font-black uppercase tracking-widest transition-all hover:scale-105 ${isAdminPath ? 'text-yellow-400' : 'text-slate-400 hover:text-white'}`}>
                {t('Painel Admin')}
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
              className="p-2.5 text-slate-400 hover:text-yellow-400 hover:bg-slate-800/50 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs uppercase border border-slate-800"
              title={language === 'pt' ? 'Translate to English' : 'Traduzir para Português'}
            >
              <Languages size={18} />
              <span>{language}</span>
            </button>

            {isAdmin ? (
              <div className="flex items-center gap-2 md:gap-4">
                <span className="text-xs text-slate-500 hidden sm:inline font-bold uppercase tracking-widest">
                  {t('Admin')}
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  title={t('Sair')}
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-black text-black bg-yellow-400 hover:bg-yellow-300 rounded-xl transition-all shadow-lg shadow-yellow-400/20 uppercase tracking-widest"
              >
                <LogIn size={18} />
                <span className="hidden sm:inline">{t('Acessar Panel') || t('Acessar Painel')}</span>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            {isAdmin && (
              <button 
                onClick={toggleMobileMenu}
                className="md:hidden p-3 bg-slate-900 text-yellow-400 rounded-xl transition-all border border-slate-800 active:scale-90"
              >
                <Menu size={24} />
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && isAdmin && (
            <motion.div
              key="mobile-menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMobileMenu}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] md:hidden"
            />
          )}
          
          {isMobileMenuOpen && isAdmin && (
            <motion.div
              key="mobile-menu-sidebar"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 h-[100dvh] w-[280px] bg-[#020617] z-[101] shadow-2xl border-r border-slate-800 md:hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-[#020617]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-black shadow-lg shadow-yellow-400/20 font-black">
                    S
                  </div>
                  <span className="text-lg font-black text-white tracking-tighter uppercase italic">SESI <span className="text-yellow-400">Eventos</span></span>
                </div>
                <button onClick={toggleMobileMenu} className="w-10 h-10 bg-slate-900 text-slate-400 rounded-xl flex items-center justify-center border border-slate-800">
                  <X size={20} />
                </button>
              </div>
              
              <nav className="p-4 space-y-2 flex-grow overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar pb-6">
                <div className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('Painel Principal')}</div>
                <AdminNavItem to="/admin" icon={<LayoutDashboard size={18} />} label={t('Dashboard')} active={location.pathname === '/admin'} onClick={toggleMobileMenu} />
                <AdminNavItem to="/admin/calendar" icon={<Calendar size={18} />} label={t('Calendário')} active={location.pathname === '/admin/calendar'} onClick={toggleMobileMenu} />
                <AdminNavItem to="/admin/events" icon={<Plus size={18} />} label={t('Meus Eventos')} active={location.pathname === '/admin/events'} onClick={toggleMobileMenu} />
                <AdminNavItem to="/admin/all-registrations" icon={<FileSpreadsheet size={18} />} label={t('Todas Inscrições')} active={location.pathname === '/admin/all-registrations'} onClick={toggleMobileMenu} />
                <AdminNavItem to="/admin/categories" icon={<Tags size={18} />} label={t('Categorias')} active={location.pathname === '/admin/categories'} onClick={toggleMobileMenu} />
                
                <div className="pt-6 pb-2 px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{t('Participantes')}</div>
                <AdminNavItem to="/admin/students" icon={<GraduationCap size={18} />} label={t('Alunos')} active={location.pathname === '/admin/students'} onClick={toggleMobileMenu} />
                <AdminNavItem to="/admin/collaborators" icon={<Users size={18} />} label={t('Colaboradores')} active={location.pathname === '/admin/collaborators'} onClick={toggleMobileMenu} />
                <AdminNavItem to="/admin/responsible" icon={<School size={18} />} label={t('Responsáveis')} active={location.pathname === '/admin/responsible'} onClick={toggleMobileMenu} />
                
                <div className="pt-6 pb-2 px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{t('Segurança')}</div>
                <AdminNavItem to="/admin/management" icon={<Shield size={18} />} label={t('Administradores')} active={location.pathname === '/admin/management'} onClick={toggleMobileMenu} />
              </nav>

              <div className="p-6 border-t border-slate-800 bg-slate-950">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-red-500/10 text-red-500 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-500/20"
                >
                  <LogOut size={18} /> {t('Sair do Sistema')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {isAdminPath && isAdmin ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 flex flex-col md:flex-row gap-6 md:gap-10">
            {/* Desktop Admin Sidebar */}
            <aside className="hidden md:block w-full md:w-64 flex-shrink-0">
              <nav className="space-y-2 sticky top-28">
                <AdminNavItem to="/admin" icon={<LayoutDashboard size={18} />} label={t('Dashboard')} active={location.pathname === '/admin'} />
                <AdminNavItem to="/admin/calendar" icon={<Calendar size={18} />} label={t('Calendário')} active={location.pathname === '/admin/calendar'} />
                <AdminNavItem to="/admin/events" icon={<Plus size={18} />} label={t('Eventos')} active={location.pathname === '/admin/events'} />
                <AdminNavItem to="/admin/all-registrations" icon={<FileSpreadsheet size={18} />} label={t('Todas Inscrições')} active={location.pathname === '/admin/all-registrations'} />
                <AdminNavItem to="/admin/categories" icon={<Tags size={18} />} label={t('Categorias')} active={location.pathname === '/admin/categories'} />
                <div className="pt-6 pb-2 px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{t('Participantes')}</div>
                <AdminNavItem to="/admin/students" icon={<GraduationCap size={18} />} label={t('Alunos')} active={location.pathname === '/admin/students'} />
                <AdminNavItem to="/admin/collaborators" icon={<Users size={18} />} label={t('Colaboradores')} active={location.pathname === '/admin/collaborators'} />
                <AdminNavItem to="/admin/responsible" icon={<School size={18} />} label={t('Responsáveis')} active={location.pathname === '/admin/responsible'} />
                
                <div className="pt-6 pb-2 px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{t('Segurança')}</div>
                <AdminNavItem to="/admin/management" icon={<Shield size={18} />} label={t('Administradores')} active={location.pathname === '/admin/management'} />
              </nav>
            </aside>
            <div className="flex-grow min-w-0">
              {children}
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950/50 border-t border-slate-800 py-10 mt-auto transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest italic">
            © {new Date().getFullYear()} <span className="text-white">SESI</span> <span className="text-yellow-400">Eventos</span>. {t('Todos os direitos reservados.')}
          </p>
        </div>
      </footer>
    </div>
  );
};

const AdminNavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active: boolean; onClick?: () => void }> = ({ to, icon, label, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-4 text-sm font-black uppercase tracking-widest rounded-xl transition-all ${
      active
        ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
        : 'text-slate-400 hover:text-white hover:bg-slate-900'
    }`}
  >
    {icon}
    {label}
  </Link>
);
