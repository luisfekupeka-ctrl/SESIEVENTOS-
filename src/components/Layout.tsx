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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] flex flex-col font-sans transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-[#0054A6] rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:scale-110 transition-transform">S</div>
            <span className="text-xl font-bold text-[#0054A6] dark:text-blue-400 transition-colors">SESI <span className="text-[#FFD700]">Eventos</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className={`text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-[#0054A6] dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:text-[#0054A6] dark:hover:text-blue-400'}`}>
              Início
            </Link>
            {isAdmin && (
              <Link to="/admin" className={`text-sm font-medium transition-colors ${isAdminPath ? 'text-[#0054A6] dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:text-[#0054A6] dark:hover:text-blue-400'}`}>
                Painel Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            {isAdmin ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">
                  Administrador
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Sair"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0054A6] dark:text-blue-400 hover:bg-[#0054A6]/5 dark:hover:bg-blue-400/10 rounded-lg transition-colors"
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
            {/* Admin Sidebar */}
            <aside className="w-full md:w-64 flex-shrink-0">
              <nav className="space-y-1">
                <AdminNavItem to="/admin" icon={<LayoutDashboard size={18} />} label="Dashboard" active={location.pathname === '/admin'} />
                <AdminNavItem to="/admin/calendar" icon={<Calendar size={18} />} label="Calendário" active={location.pathname === '/admin/calendar'} />
                <AdminNavItem to="/admin/events" icon={<Calendar size={18} />} label="Eventos" active={location.pathname === '/admin/events'} />
                <AdminNavItem to="/admin/categories" icon={<Tags size={18} />} label="Categorias" active={location.pathname === '/admin/categories'} />
                <div className="pt-4 pb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Participantes</div>
                <AdminNavItem to="/admin/students" icon={<GraduationCap size={18} />} label="Alunos" active={location.pathname === '/admin/students'} />
                <AdminNavItem to="/admin/collaborators" icon={<Users size={18} />} label="Colaboradores" active={location.pathname === '/admin/collaborators'} />
                <AdminNavItem to="/admin/responsible" icon={<School size={18} />} label="Responsáveis" active={location.pathname === '/admin/responsible'} />
                
                {profile?.role === 'super_admin' && (
                  <>
                    <div className="pt-4 pb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Segurança</div>
                    <AdminNavItem to="/admin/management" icon={<Shield size={18} />} label="Administradores" active={location.pathname === '/admin/management'} />
                  </>
                )}
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
      <footer className="bg-white dark:bg-[#0F172A] border-t border-slate-200 dark:border-slate-800 py-8 mt-auto transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
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
    className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
      active
        ? 'bg-[#0054A6] text-white shadow-sm'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
  >
    {icon}
    {label}
  </Link>
);
