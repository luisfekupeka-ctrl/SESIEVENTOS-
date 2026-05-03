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
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Gestão de Administradores</h1>
        <p className="text-slate-500 font-bold">Aprovar, bloquear ou remover acessos ao painel administrativo.</p>
      </div>

      {error && (
        <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-[2rem] flex items-center gap-4 text-red-500 font-bold">
          <AlertCircle size={24} />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-[#0A0A0A] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black border-b border-white/5">
                <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Usuário</th>
                <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Função</th>
                <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Solicitação</th>
                <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-black transition-colors group">
                  <td className="px-4 md:px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-sky-500 text-black flex items-center justify-center font-black text-lg shadow-[0_0_20px_rgba(14,165,233,0.2)]">
                        {profile.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-black text-white tracking-tight">{profile.full_name}</p>
                        <p className="text-[10px] text-slate-600 font-bold flex items-center gap-1 uppercase tracking-widest">
                          <Mail size={12} className="text-sky-500" />
                          {profile.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border ${
                      profile.role === 'super_admin' 
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        : 'bg-black border-white/5 text-slate-500'
                    }`}>
                      {profile.role === 'super_admin' ? 'Master' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-4 md:px-8 py-5">
                    <div className="flex items-center gap-3">
                       <span className={`w-2 h-2 rounded-full ${
                         profile.status === 'approved' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
                         profile.status === 'pending' ? 'bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]' :
                         'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                       }`} />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         {profile.status === 'approved' ? 'Ativo' :
                          profile.status === 'pending' ? 'Pendente' :
                          'Bloqueado'}
                       </span>
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-5 text-xs text-slate-500 font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-700" />
                      {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {profile.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(profile.id, 'approved')}
                          className="w-10 h-10 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-green-500/10"
                          title="Aprovar Acesso"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      
                      {profile.status === 'approved' && profile.id !== currentUserProfile?.id && (
                        <button
                          onClick={() => updateStatus(profile.id, 'blocked')}
                          className="w-10 h-10 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-amber-500/10"
                          title="Bloquear Acesso"
                        >
                          <XCircle size={18} />
                        </button>
                      )}

                      {profile.status === 'blocked' && (
                        <button
                          onClick={() => updateStatus(profile.id, 'approved')}
                          className="w-10 h-10 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-blue-500/10"
                          title="Desbloquear Acesso"
                        >
                          <Shield size={18} />
                        </button>
                      )}

                      {profile.id !== currentUserProfile?.id && (
                        <button
                          onClick={() => deleteAdmin(profile.id)}
                          className="w-10 h-10 bg-red-500/5 text-slate-600 hover:text-red-500 rounded-xl flex items-center justify-center transition-all"
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
