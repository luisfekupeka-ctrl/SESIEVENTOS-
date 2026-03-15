import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Calendar, Users, Tags, LogIn, GraduationCap, School } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isAdminPath = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0054A6] rounded-lg flex items-center justify-center text-white font-bold text-xl">S</div>
            <span className="text-xl font-bold text-[#0054A6]">SESI <span className="text-[#FFD700]">Eventos</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className={`text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-[#0054A6]' : 'text-slate-600 hover:text-[#0054A6]'}`}>
              Início
            </Link>
            {isAdmin && (
              <Link to="/admin" className={`text-sm font-medium transition-colors ${isAdminPath ? 'text-[#0054A6]' : 'text-slate-600 hover:text-[#0054A6]'}`}>
                Painel Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {isAdmin ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600 hidden sm:inline">
                  Administrador
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-600 hover:text-red-600 transition-colors"
                  title="Sair"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0054A6] hover:bg-[#0054A6]/5 rounded-lg transition-colors"
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
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-slate-500">
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
        : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    {icon}
    {label}
  </Link>
);
