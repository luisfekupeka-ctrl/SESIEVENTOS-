import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Calendar, Users, Tags, LogIn, GraduationCap, School, Shield } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, logout, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isAdminPath = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-black flex flex-col font-sans transition-colors duration-300">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md border-b border-yellow-500/10 sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center text-black font-black text-2xl group-hover:rotate-6 transition-transform shadow-[0_0_20px_rgba(234,179,8,0.3)]">S</div>
            <span className="text-2xl font-black text-white transition-colors">SESI <span className="text-yellow-500">Eventos</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className={`text-sm font-bold transition-all hover:scale-105 ${location.pathname === '/' ? 'text-yellow-500' : 'text-slate-400 hover:text-white'}`}>
              Início
            </Link>
            {isAdmin && (
              <Link to="/admin" className={`text-sm font-bold transition-all hover:scale-105 ${isAdminPath ? 'text-yellow-500' : 'text-slate-400 hover:text-white'}`}>
                Painel Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            {isAdmin ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-400 hidden sm:inline font-bold">
                  Administrador
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
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-black bg-yellow-500 hover:bg-yellow-400 rounded-xl transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]"
              >
                <LogIn size={18} />
                <span>Admin</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {isAdminPath && isAdmin ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row gap-10">
            {/* Admin Sidebar */}
            <aside className="w-full md:w-64 flex-shrink-0">
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
            <div className="flex-grow">
              {children}
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-yellow-500/5 py-10 mt-auto transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold text-slate-500">
            © {new Date().getFullYear()} SESI Eventos. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

const AdminNavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active: boolean }> = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
      active
        ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]'
        : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    {icon}
    {label}
  </Link>
);
