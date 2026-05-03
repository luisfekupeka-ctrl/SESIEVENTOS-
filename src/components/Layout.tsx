import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  FileSpreadsheet
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ThemeToggle } from './ThemeToggle';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, logout, profile } = useAuth();
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
    <div className="min-h-screen bg-black flex flex-col font-sans transition-colors duration-300">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md border-b border-sky-500/10 sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-sky-400 rounded-xl flex items-center justify-center text-black font-black text-2xl group-hover:rotate-6 transition-transform shadow-[0_0_20px_rgba(56,189,248,0.4)]">S</div>
            <span className="text-xl md:text-2xl font-black text-white transition-colors">SESI <span className="text-sky-400">Eventos</span></span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className={`text-sm font-black uppercase tracking-widest transition-all hover:scale-105 ${location.pathname === '/' ? 'text-sky-400' : 'text-slate-400 hover:text-white'}`}>
              Início
            </Link>
            {isAdmin && (
              <Link to="/admin" className={`text-sm font-black uppercase tracking-widest transition-all hover:scale-105 ${isAdminPath ? 'text-sky-400' : 'text-slate-400 hover:text-white'}`}>
                Painel Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <ThemeToggle />
            
            {isAdmin ? (
              <div className="flex items-center gap-2 md:gap-4">
                <span className="text-xs text-slate-400 hidden sm:inline font-bold uppercase tracking-widest">
                  Admin
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  title="Sair"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold text-black bg-sky-500 hover:bg-sky-400 rounded-xl transition-all shadow-[0_0_15px_rgba(14,165,233,0.2)]"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            {isAdmin && (
              <button 
                onClick={toggleMobileMenu}
                className="md:hidden p-3 bg-black text-sky-400 rounded-xl transition-all border border-sky-400/20 active:scale-90"
              >
                <Menu size={24} />
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && isAdmin && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={toggleMobileMenu}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] md:hidden"
              />
              
              {/* Sidebar */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-[280px] bg-[#0A0A0A] z-[101] shadow-2xl border-r border-white/5 md:hidden flex flex-col"
              >
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                      <LayoutDashboard size={20} />
                    </div>
                    <span className="text-lg font-black text-white tracking-tighter uppercase italic">SESI <span className="text-yellow-500">Eventos</span></span>
                  </div>
                  <button onClick={toggleMobileMenu} className="w-10 h-10 bg-black text-slate-500 rounded-xl flex items-center justify-center">
                    <X size={20} />
                  </button>
                </div>
                
                <nav className="p-4 space-y-2 flex-grow overflow-y-auto custom-scrollbar">
                  <div className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Painel Principal</div>
                  <AdminNavItem to="/admin" icon={<LayoutDashboard size={18} />} label="Dashboard" active={location.pathname === '/admin'} onClick={toggleMobileMenu} />
                  <AdminNavItem to="/admin/calendar" icon={<Calendar size={18} />} label="Calendário" active={location.pathname === '/admin/calendar'} onClick={toggleMobileMenu} />
                  <AdminNavItem to="/admin/events" icon={<Plus size={18} />} label="Meus Eventos" active={location.pathname === '/admin/events'} onClick={toggleMobileMenu} />
                  <AdminNavItem to="/admin/categories" icon={<Tags size={18} />} label="Categorias" active={location.pathname === '/admin/categories'} onClick={toggleMobileMenu} />
                  
                  <div className="pt-6 pb-2 px-4 text-[10px] font-black text-yellow-500/50 uppercase tracking-[0.2em]">Participantes</div>
                  <AdminNavItem to="/admin/students" icon={<GraduationCap size={18} />} label="Alunos" active={location.pathname === '/admin/students'} onClick={toggleMobileMenu} />
                  <AdminNavItem to="/admin/collaborators" icon={<Users size={18} />} label="Colaboradores" active={location.pathname === '/admin/collaborators'} onClick={toggleMobileMenu} />
                  <AdminNavItem to="/admin/responsible" icon={<School size={18} />} label="Responsáveis" active={location.pathname === '/admin/responsible'} onClick={toggleMobileMenu} />
                  
                  <div className="pt-6 pb-2 px-4 text-[10px] font-black text-yellow-500/50 uppercase tracking-[0.2em]">Segurança</div>
                  <AdminNavItem to="/admin/management" icon={<Shield size={18} />} label="Administradores" active={location.pathname === '/admin/management'} onClick={toggleMobileMenu} />
                </nav>

                <div className="p-6 border-t border-white/5 bg-black/40">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-red-500/10 text-red-500 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                  >
                    <LogOut size={18} /> Sair do Sistema
                  </button>
                </div>
              </motion.div>
            </>
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
                <AdminNavItem to="/admin" icon={<LayoutDashboard size={18} />} label="Dashboard" active={location.pathname === '/admin'} />
                <AdminNavItem to="/admin/calendar" icon={<Calendar size={18} />} label="Calendário" active={location.pathname === '/admin/calendar'} />
                <AdminNavItem to="/admin/events" icon={<Calendar size={18} />} label="Eventos" active={location.pathname === '/admin/events'} />
                <AdminNavItem to="/admin/categories" icon={<Tags size={18} />} label="Categorias" active={location.pathname === '/admin/categories'} />
                <div className="pt-6 pb-2 px-4 text-[10px] font-black text-yellow-500/50 uppercase tracking-[0.2em]">Participantes</div>
                <AdminNavItem to="/admin/students" icon={<GraduationCap size={18} />} label="Alunos" active={location.pathname === '/admin/students'} />
                <AdminNavItem to="/admin/collaborators" icon={<Users size={18} />} label="Colaboradores" active={location.pathname === '/admin/collaborators'} />
                <AdminNavItem to="/admin/responsible" icon={<School size={18} />} label="Responsáveis" active={location.pathname === '/admin/responsible'} />
                
                <div className="pt-6 pb-2 px-4 text-[10px] font-black text-yellow-500/50 uppercase tracking-[0.2em]">Segurança</div>
                <AdminNavItem to="/admin/management" icon={<Shield size={18} />} label="Administradores" active={location.pathname === '/admin/management'} />
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
      <footer className="bg-black border-t border-yellow-500/10 py-10 mt-auto transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold text-slate-500">
            © {new Date().getFullYear()} SESI Eventos. Todos os direitos reservados.
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
        ? 'bg-sky-400 text-black shadow-[0_0_20px_rgba(56,189,248,0.4)]'
        : 'text-slate-500 hover:text-white hover:bg-white/5'
    }`}
  >
    {icon}
    {label}
  </Link>
);
