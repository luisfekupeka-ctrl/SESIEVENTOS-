import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import Home from './pages/Home';
import EventDetails from './pages/EventDetails';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminEvents from './pages/AdminEvents';
import AdminCategories from './pages/AdminCategories';
import AdminStudents from './pages/AdminStudents';
import AdminCollaborators from './pages/AdminCollaborators';
import AdminResponsible from './pages/AdminResponsible';
import AdminEventRegistrations from './pages/AdminEventRegistrations';
import AdminCalendar from './pages/AdminCalendar';
import AdminManagement from './pages/AdminManagement';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isAdmin } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(234,179,8,0.3)]"></div>
    </div>
  );
  
  if (!isAdmin) return <Navigate to="/login" />;

  return <>{children}</>;
};

const SuperProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isAdmin, profile } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(234,179,8,0.3)]"></div>
    </div>
  );
  
  if (!isAdmin || profile?.role !== 'super_admin') return <Navigate to="/admin" />;

  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ErrorBoundary>
          <AuthProvider>
            <Router>
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/event/:id" element={<EventDetails />} />
                  <Route path="/login" element={<AdminLogin />} />
                  
                  {/* Admin Routes */}
                  <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/calendar" element={<ProtectedRoute><AdminCalendar /></ProtectedRoute>} />
                  <Route path="/admin/events" element={<ProtectedRoute><AdminEvents /></ProtectedRoute>} />
                  <Route path="/admin/events/:id/registrations" element={<ProtectedRoute><AdminEventRegistrations /></ProtectedRoute>} />
                  <Route path="/admin/categories" element={<ProtectedRoute><AdminCategories /></ProtectedRoute>} />
                  <Route path="/admin/students" element={<ProtectedRoute><AdminStudents /></ProtectedRoute>} />
                  <Route path="/admin/collaborators" element={<ProtectedRoute><AdminCollaborators /></ProtectedRoute>} />
                  <Route path="/admin/responsible" element={<ProtectedRoute><AdminResponsible /></ProtectedRoute>} />
                  <Route path="/admin/management" element={<SuperProtectedRoute><AdminManagement /></SuperProtectedRoute>} />
                  
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Layout>
            </Router>
          </AuthProvider>
        </ErrorBoundary>
      </LanguageProvider>
    </ThemeProvider>
  );
}
