import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Users, CheckCircle, XCircle, Trash2, Shield, Mail, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

import { Key } from 'lucide-react';

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
  const [passwordModal, setPasswordModal] = useState<{show: boolean, userId: string, userName: string, newPassword: string}>({ show: false, userId: '', userName: '', newPassword: '' });

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

  const updateRole = async (id: string, role: 'super_admin' | 'admin') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', id);

      if (error) throw error;
      fetchProfiles();
    } catch (err: any) {
      console.error(err);
      alert("Erro ao atualizar função.");
    }
  };

  const deleteAdmin = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este administrador PERMANENTEMENTE? Esta ação não pode ser desfeita e removerá o login do usuário.")) return;
    try {
      if (import.meta.env.VITE_USE_SQLITE === 'true') {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminId: currentUserProfile?.id })
        });
        if (!res.ok) throw new Error('Erro ao remover (Local)');
      } else {
        const { error: rpcError } = await supabase.rpc('admin_delete_user', { p_user_id: id });
        if (rpcError) {
          console.warn("RPC failed, falling back to profile delete", rpcError);
          const { error } = await supabase.from('profiles').delete().eq('id', id);
          if (error) throw error;
        }
      }
      fetchProfiles();
    } catch (err: any) {
      console.error(err);
      alert("Erro ao remover administrador.");
    }
  };

  const changePassword = async () => {
    if (!passwordModal.newPassword || passwordModal.newPassword.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    try {
      if (import.meta.env.VITE_USE_SQLITE === 'true') {
        alert("Modo Local (SQLite): Todas as senhas são 'admin123' por padrão.");
      } else {
        const { error } = await supabase.rpc('admin_update_password', {
          p_user_id: passwordModal.userId,
          p_new_password: passwordModal.newPassword
        });
        if (error) throw error;
        alert("Senha atualizada com sucesso!");
      }
      setPasswordModal({ show: false, userId: '', userName: '', newPassword: '' });
    } catch (err: any) {
      console.error(err);
      alert("Erro ao atualizar senha. Verifique suas permissões.");
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

                      {currentUserProfile?.role === 'super_admin' && profile.id !== currentUserProfile?.id && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newRole = profile.role === 'super_admin' ? 'admin' : 'super_admin';
                              if (confirm(`Deseja alterar a função de ${profile.full_name} para ${newRole === 'super_admin' ? 'Master' : 'Admin'}?`)) {
                                updateRole(profile.id, newRole);
                              }
                            }}
                            className="w-11 h-11 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-indigo-500/10"
                            title="Alternar Função"
                          >
                            <Users size={20} />
                          </button>
                          <button
                            onClick={() => setPasswordModal({ show: true, userId: profile.id, userName: profile.full_name, newPassword: '' })}
                            className="w-11 h-11 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-emerald-500/10"
                            title="Trocar Senha"
                          >
                            <Key size={20} />
                          </button>
                          <button
                            onClick={() => deleteAdmin(profile.id)}
                            className="w-11 h-11 bg-red-500/5 text-slate-400 hover:text-red-500 rounded-xl flex items-center justify-center transition-all border border-transparent hover:border-red-500/20"
                            title="Remover permanentemente"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Modal */}
      {passwordModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
          >
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Trocar Senha</h2>
            <p className="text-slate-400 mb-6 font-bold">Defina uma nova senha para {passwordModal.userName}.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nova Senha</label>
                <input
                  type="text"
                  value={passwordModal.newPassword}
                  onChange={(e) => setPasswordModal({ ...passwordModal, newPassword: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all font-bold"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setPasswordModal({ show: false, userId: '', userName: '', newPassword: '' })}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={changePassword}
                  className="flex-1 py-3 px-4 bg-yellow-400 hover:bg-yellow-500 text-black rounded-xl font-black transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
