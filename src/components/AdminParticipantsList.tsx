import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Student } from '../types';
import { Plus, Trash2, Edit2, X, Search, TrendingUp, AlertTriangle, Download, RefreshCw, FileSpreadsheet, Loader2, User } from 'lucide-react';
import * as XLSX from 'xlsx';
import { GRADES, CLASSES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

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

  const labelPlural = type === 'student' ? 'Alunos' : type === 'collaborator' ? 'Colaboradores' : type === 'responsible' ? 'Responsáveis' : 'Participantes';

  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    surname: '',
    class: '',
    grade: '',
    type: type
  });

  const fetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    fetchParticipants();

    const debouncedFetch = () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        fetchParticipants(true);
      }, 1500); // 1.5s debounce
    };

    const subscription = supabase
      .channel(`public:students:${type}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'students',
        filter: `type=eq.${type}`
      }, debouncedFetch)
      .subscribe();

    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      supabase.removeChannel(subscription);
    };
  }, [type]);

  const exportToExcel = () => {
    if (participants.length === 0) return;
    try {
      const data = participants.map(p => {
        const row: any = {
          'Nome': p.name,
          'Sobrenome': p.surname
        };
        if (type === 'student') {
          row['Série'] = p.grade;
          row['Turma'] = p.class;
        }
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, labelPlural);
      XLSX.writeFile(wb, `Lista_${labelPlural.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error("Erro ao exportar Excel:", err);
    }
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
      const { data: regs } = await supabase
        .from('registrations')
        .select('event_id')
        .eq('student_id', deleteId);

      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', deleteId);
      if (error) throw error;

      if (regs && regs.length > 0) {
        const eventIds = [...new Set(regs.map(r => r.event_id))];
        for (const eid of eventIds) {
          const { count } = await supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eid);
          
          await supabase
            .from('events')
            .update({ registration_count: count || 0 })
            .eq('id', eid);
        }
      }
      
      setParticipants(prev => prev.filter(p => p.id !== deleteId));
      setDeleteId(null);
      setFeedback({ type: 'success', message: `${labelSingular} removido com sucesso!` });
    } catch (error) {
      console.error("Erro ao excluir:", error);
      setFeedback({ type: 'error', message: 'Erro ao excluir registro.' });
    }
  };

  const filteredParticipants = participants.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.surname || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mb-4" />
        <p className="text-slate-300 font-black uppercase tracking-widest text-sm">Sincronizando participantes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 bg-[#020617]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">{title}</h1>
          <p className="text-sm md:text-base text-slate-300 font-bold">{description}</p>
        </div>        
        <div className="grid grid-cols-2 sm:flex items-center gap-2 md:gap-4">
          <button
            onClick={() => fetchParticipants(true)}
            disabled={isRefreshing}
            className="w-full sm:w-12 h-12 bg-slate-900 text-slate-400 hover:text-yellow-400 rounded-xl flex items-center justify-center transition-all border border-slate-800 disabled:opacity-50 shadow-lg"
            title="Atualizar Lista"
          >
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={exportToExcel}
            className="w-full sm:flex-grow flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-slate-300 border border-slate-800 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-lg"
          >
            <FileSpreadsheet size={18} className="text-yellow-400" /> Exportar
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="col-span-2 sm:flex-grow flex items-center justify-center gap-3 px-8 py-4 bg-yellow-400 text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20"
          >
            <Plus size={20} /> Novo {labelSingular}
          </button>
        </div>
      </div>

      <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-8 border-b border-slate-800 bg-slate-950/30 flex flex-col md:flex-row gap-6">
          <div className="relative flex-grow">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-yellow-400" size={24} />
            <input
              type="text"
              placeholder={`Buscar por nome ou sobrenome...`}
              className="w-full pl-14 pr-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all text-white font-bold placeholder:text-slate-500 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800">
                <th className="px-6 md:px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identificação</th>
                {type === 'student' && (
                  <th className="px-6 md:px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Série/Turma</th>
                )}
                <th className="px-6 md:px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredParticipants.map(participant => (
                <tr key={participant.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 md:px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-yellow-400/10 text-yellow-400 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg border border-yellow-400/10 group-hover:scale-105 transition-transform">
                        {(participant.name?.[0] || '')}{(participant.surname?.[0] || '')}
                      </div>
                      <span className="font-black text-white text-lg tracking-tight">{participant.name || ''} {participant.surname || ''}</span>
                    </div>
                  </td>
                  {type === 'student' && (
                    <td className="px-6 md:px-10 py-6">
                      <div className="flex flex-col">
                        <span className="text-base font-black text-white">{participant.grade}</span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{participant.class}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-6 md:px-10 py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleOpenModal(participant)}
                        className="w-11 h-11 bg-slate-800 text-slate-400 hover:text-yellow-400 rounded-xl flex items-center justify-center transition-all border border-slate-700 shadow-sm"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteId(participant.id)}
                        className="w-11 h-11 bg-red-500/5 text-slate-400 hover:text-red-500 rounded-xl flex items-center justify-center transition-all border border-transparent hover:border-red-500/20"
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
            <div className="p-20 text-center text-slate-400 font-bold text-lg">
              Nenhum registro encontrado para esta pesquisa.
            </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-800">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <h2 className="text-3xl font-black text-white tracking-tight">
                {editingParticipant ? `Editar ${labelSingular}` : `Novo ${labelSingular}`}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-slate-800 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome</label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all text-white font-bold shadow-inner"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sobrenome</label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all text-white font-bold shadow-inner"
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  />
                </div>
              </div>

              {type === 'student' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Série</label>
                    <select
                      required
                      className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all text-white font-bold appearance-none shadow-inner"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    >
                      <option value="" className="bg-slate-900">Selecione...</option>
                      {GRADES.map(grade => (
                        <option key={grade} value={grade} className="bg-slate-900">{grade}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Turma</label>
                    <select
                      required
                      className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all text-white font-bold appearance-none shadow-inner"
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    >
                      <option value="" className="bg-slate-900">Selecione...</option>
                      {CLASSES.map(cls => (
                        <option key={cls} value={cls} className="bg-slate-900">{cls}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-8 flex flex-col md:flex-row justify-end gap-4 md:gap-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-4 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-12 py-4 bg-yellow-400 text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20"
                >
                  Confirmar e Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border border-slate-800 text-center">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-8 mx-auto border border-red-500/10">
              <Trash2 size={40} />
            </div>
            <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Confirmar Exclusão</h3>
            <p className="text-slate-400 mb-10 font-bold text-lg leading-relaxed">
              Deseja remover este registro? Esta ação é irreversível.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDeleteId(null)}
                className="py-4 bg-slate-800 text-slate-300 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-700 transition-all"
              >
                Voltar
              </button>
              <button
                onClick={handleDelete}
                className="py-4 bg-red-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
