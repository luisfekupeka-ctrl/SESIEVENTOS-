import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Users, CheckCircle, XCircle, Trash2, Shield, Mail, Clock, AlertCircle, Loader2 } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mb-4" />
        <p className="text-slate-300 font-bold">Carregando gerenciamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 bg-[#020617]">
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">Gestão de Administradores</h1>
        <p className="text-sm md:text-base text-slate-300 font-bold">Aprovar, bloquear ou remover acessos ao painel administrativo.</p>
      </div>

      {error && (
        <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-[2rem] flex items-center gap-4 text-red-500 font-bold">
          <AlertCircle size={24} />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800">
                <th className="px-6 md:px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Usuário</th>
                <th className="px-6 md:px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Função</th>
                <th className="px-6 md:px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 md:px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Solicitação</th>
                <th className="px-6 md:px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 md:px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-black flex items-center justify-center font-black text-lg shadow-lg shadow-yellow-400/10">
                        {profile.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-black text-white tracking-tight text-lg">{profile.full_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold flex items-center gap-2 uppercase tracking-widest mt-1">
                          <Mail size={12} className="text-yellow-400/60" />
                          {profile.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 md:px-10 py-6">
                    <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border ${
                      profile.role === 'super_admin' 
                        ? 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}>
                      {profile.role === 'super_admin' ? 'Master' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-6 md:px-10 py-6">
                    <div className="flex items-center gap-3">
                       <span className={`w-2.5 h-2.5 rounded-full ${
                         profile.status === 'approved' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' :
                         profile.status === 'pending' ? 'bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.4)]' :
                         'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                       }`} />
                       <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                         {profile.status === 'approved' ? 'Ativo' :
                          profile.status === 'pending' ? 'Pendente' :
                          'Bloqueado'}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 md:px-10 py-6 text-xs text-slate-300 font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-yellow-400/60" />
                      {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-6 md:px-10 py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {profile.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(profile.id, 'approved')}
                          className="w-11 h-11 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-green-500/10 shadow-lg shadow-green-500/5"
                          title="Aprovar Acesso"
                        >
                          <CheckCircle size={20} />
                        </button>
                      )}
                      
                      {profile.status === 'approved' && profile.id !== currentUserProfile?.id && (
                        <button
                          onClick={() => updateStatus(profile.id, 'blocked')}
                          className="w-11 h-11 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-amber-500/10 shadow-lg shadow-amber-500/5"
                          title="Bloquear Acesso"
                        >
                          <XCircle size={20} />
                        </button>
                      )}

                      {profile.status === 'blocked' && (
                        <button
                          onClick={() => updateStatus(profile.id, 'approved')}
                          className="w-11 h-11 bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400 hover:text-black rounded-xl flex items-center justify-center transition-all border border-yellow-400/10 shadow-lg shadow-yellow-400/5"
                          title="Desbloquear Acesso"
                        >
                          <Shield size={20} />
                        </button>
                      )}

                      {profile.id !== currentUserProfile?.id && (
                        <button
                          onClick={() => deleteAdmin(profile.id)}
                          className="w-11 h-11 bg-red-500/5 text-slate-400 hover:text-red-500 rounded-xl flex items-center justify-center transition-all border border-transparent hover:border-red-500/20"
                          title="Remover"
                        >
                          <Trash2 size={20} />
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
