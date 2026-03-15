import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Users, CheckCircle, XCircle, Trash2, Shield, Mail, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  status: 'pending' | 'approved' | 'blocked';
  role: 'super_admin' | 'admin';
  created_at: string;
}

export default function AdminManagement() {
  const { profile: currentUserProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data as Profile[]);
    } catch (err: any) {
      console.error(err);
      setError("Erro ao carregar administradores.");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: 'approved' | 'blocked' | 'pending') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      fetchProfiles();
    } catch (err: any) {
      console.error(err);
      alert("Erro ao atualizar status.");
    }
  };

  const deleteAdmin = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este administrador? Esta ação não pode ser desfeita.")) return;
    try {
      // In a real app, you might want to call an Edge Function to delete from auth.users too
      // For now, removing the profile and relying on manual auth cleanup or just blocking
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchProfiles();
    } catch (err: any) {
      console.error(err);
      alert("Erro ao remover administrador.");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium animate-pulse">Carregando gerenciamento...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Gestão de Administradores</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Aprovar, bloquear ou remover acessos ao painel administrativo.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle size={20} />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Função</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Data de Solicitação</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-500/20">
                        {profile.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{profile.full_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Mail size={12} />
                          {profile.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      profile.role === 'super_admin' 
                        ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {profile.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${
                         profile.status === 'approved' ? 'bg-green-500' :
                         profile.status === 'pending' ? 'bg-amber-500 animate-pulse' :
                         'bg-red-500'
                       }`} />
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                         {profile.status === 'approved' ? 'Aprovado' :
                          profile.status === 'pending' ? 'Pendente' :
                          'Bloqueado'}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {profile.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(profile.id, 'approved')}
                          className="p-2 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-lg transition-colors border border-green-100 dark:border-green-500/20"
                          title="Aprovar Acesso"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      
                      {profile.status === 'approved' && profile.role !== 'super_admin' && (
                        <button
                          onClick={() => updateStatus(profile.id, 'blocked')}
                          className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-lg transition-colors border border-amber-100 dark:border-amber-500/20"
                          title="Bloquear Acesso"
                        >
                          <XCircle size={18} />
                        </button>
                      )}

                      {profile.status === 'blocked' && (
                        <button
                          onClick={() => updateStatus(profile.id, 'approved')}
                          className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-100 dark:border-blue-500/20"
                          title="Desbloquear Acesso"
                        >
                          <Shield size={18} />
                        </button>
                      )}

                      {profile.role !== 'super_admin' && (
                        <button
                          onClick={() => deleteAdmin(profile.id)}
                          className="p-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors border border-red-100 dark:border-red-500/20"
                          title="Remover"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
