import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Student } from '../types';
import { Plus, Trash2, Edit2, X, Search, TrendingUp, AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { GRADES, CLASSES } from '../constants';

interface AdminParticipantsListProps {
  type: 'student' | 'collaborator' | 'responsible' | 'other';
  title: string;
  description: string;
  labelSingular: string;
}

export const AdminParticipantsList: React.FC<AdminParticipantsListProps> = ({ type, title, description, labelSingular }) => {
  const [participants, setParticipants] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    surname: '',
    class: '',
    grade: '',
    type: type
  });

  useEffect(() => {
    fetchParticipants();

    const subscription = supabase
      .channel(`public:students:${type}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'students',
        filter: `type=eq.${type}`
      }, () => {
        fetchParticipants();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [type]);

  const fetchParticipants = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('type', type)
        .order('name', { ascending: true });

      if (error) {
        console.error(`Erro ao carregar ${title}:`, error);
        setFeedback({ type: 'error', message: 'Erro ao carregar dados do banco.' });
      } else {
        setParticipants(data || []);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const exportToCSV = () => {
    if (participants.length === 0) return;
    
    const headers = type === 'student' 
      ? ['Nome', 'Sobrenome', 'Série', 'Turma'] 
      : ['Nome', 'Sobrenome'];
    
    const rows = participants.map(p => {
      return type === 'student'
        ? [p.name, p.surname, p.grade, p.class]
        : [p.name, p.surname];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `lista_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenModal = (participant?: Student) => {
    if (participant) {
      setEditingParticipant(participant);
      setFormData(participant);
    } else {
      setEditingParticipant(null);
      setFormData({ name: '', surname: '', class: '', grade: '', type: type });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingParticipant) {
        const { error } = await supabase
          .from('students')
          .update(formData)
          .eq('id', editingParticipant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('students')
          .insert([{ ...formData, type }]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setFeedback({ type: 'success', message: `${labelSingular} salvo com sucesso!` });
      fetchParticipants();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: `Erro ao salvar ${labelSingular.toLowerCase()}.` });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', deleteId);
      if (error) throw error;
      
      // Update local state immediately
      setParticipants(prev => prev.filter(p => p.id !== deleteId));
      setDeleteId(null);
      setFeedback({ type: 'success', message: `${labelSingular} removido com sucesso!` });
    } catch (error) {
      console.error("Erro ao excluir:", error);
      setFeedback({ type: 'error', message: 'Erro ao excluir registro.' });
    }
  };

  const filteredParticipants = participants.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.surname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-12 text-center text-slate-500 font-bold animate-pulse">Sincronizando dados...</div>;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">{title}</h1>
          <p className="text-slate-500 font-bold">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => fetchParticipants(true)}
            disabled={isRefreshing}
            className="p-4 bg-white/5 text-slate-400 hover:text-yellow-500 hover:bg-white/10 rounded-2xl transition-all border border-white/5"
            title="Atualizar"
          >
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={exportToCSV}
            className="bg-white/5 text-white border border-white/10 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all shadow-xl flex items-center gap-3"
          >
            <Download size={20} className="text-blue-500" /> Exportar
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-yellow-500 text-black px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] flex items-center gap-3"
          >
            <Plus size={20} /> Novo {labelSingular}
          </button>
        </div>
      </div>

      <div className="bg-[#0A0A0A] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row gap-6">
          <div className="relative flex-grow">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-yellow-500" size={24} />
            <input
              type="text"
              placeholder={`Buscar ${labelSingular.toLowerCase()} por nome...`}
              className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-white font-bold placeholder:text-slate-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Identificação</th>
                {type === 'student' && (
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Série/Turma</th>
                )}
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredParticipants.map(participant => (
                <tr key={participant.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-yellow-500/5 text-yellow-500 rounded-2xl flex items-center justify-center font-black text-lg border border-yellow-500/10 group-hover:scale-110 transition-transform">
                        {participant.name[0]}{participant.surname[0]}
                      </div>
                      <span className="font-black text-white text-lg tracking-tight">{participant.name} {participant.surname}</span>
                    </div>
                  </td>
                  {type === 'student' && (
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-base font-black text-white">{participant.grade}</span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{participant.class}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleOpenModal(participant)}
                        className="w-10 h-10 bg-white/5 text-slate-400 hover:text-blue-400 rounded-xl flex items-center justify-center transition-all border border-white/5"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteId(participant.id)}
                        className="w-10 h-10 bg-red-500/5 text-slate-400 hover:text-red-500 rounded-xl flex items-center justify-center transition-all border border-red-500/10"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredParticipants.length === 0 && (
            <div className="p-20 text-center text-slate-600 font-bold text-lg">
              Nenhum registro encontrado para esta pesquisa.
            </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0A0A0A] w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <h2 className="text-3xl font-black text-white tracking-tight">
                {editingParticipant ? `Editar ${labelSingular}` : `Novo ${labelSingular}`}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white/5 text-slate-500 hover:text-white rounded-xl flex items-center justify-center transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nome</label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-white font-bold"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Sobrenome</label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-white font-bold"
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  />
                </div>
              </div>

              {type === 'student' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Série</label>
                    <select
                      required
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-white font-bold appearance-none"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    >
                      <option value="" className="bg-black">Selecione...</option>
                      {GRADES.map(grade => (
                        <option key={grade} value={grade} className="bg-black">{grade}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Turma</label>
                    <select
                      required
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-white font-bold appearance-none"
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    >
                      <option value="" className="bg-black">Selecione...</option>
                      {CLASSES.map(cls => (
                        <option key={cls} value={cls} className="bg-black">{cls}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-8 flex justify-end gap-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-4 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-12 py-4 bg-yellow-500 text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                >
                  Confirmar e Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedback && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center border border-white/10">
            <div className={`w-20 h-20 ${feedback.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} rounded-[1.5rem] flex items-center justify-center mb-8 mx-auto shadow-lg`}>
              {feedback.type === 'success' ? <TrendingUp size={40} /> : <AlertTriangle size={40} />}
            </div>
            <h2 className="text-3xl font-black text-white mb-3">
              {feedback.type === 'success' ? 'Sucesso!' : 'Erro'}
            </h2>
            <p className="text-slate-400 mb-10 font-bold text-lg">
              {feedback.message}
            </p>
            <button
              onClick={() => setFeedback(null)}
              className="w-full py-4 bg-white/5 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-white/10 transition-all border border-white/10"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0A0A0A] w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border border-white/10">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Trash2 size={32} />
            </div>
            <h3 className="text-3xl font-black text-white text-center mb-4 tracking-tight">Confirmar Exclusão</h3>
            <p className="text-slate-400 text-center mb-10 font-bold text-lg leading-relaxed">
              Tem certeza que deseja excluir este {labelSingular.toLowerCase()}? Esta operação <span className="text-red-500">não pode ser revertida</span>.
            </p>
            <div className="flex gap-5">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-grow py-4 bg-white/5 text-slate-400 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-white/10 transition-all"
              >
                Voltar
              </button>
              <button
                onClick={handleDelete}
                className="flex-grow py-4 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
