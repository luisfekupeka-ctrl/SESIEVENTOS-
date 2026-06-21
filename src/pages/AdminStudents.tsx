import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Student } from '../types';
import { Plus, Trash2, X, Search, Download, RefreshCw, FileSpreadsheet, Loader2, User, ClipboardList, AlertTriangle } from 'lucide-react';
import { GRADES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');
  
  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Form states
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState(GRADES[0]);
  const [bulkGrade, setBulkGrade] = useState(GRADES[0]);
  const [bulkText, setBulkText] = useState('');

  const fetchStudents = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const response = await fetch('/api/students');
      if (!response.ok) throw new Error('Erro ao buscar alunos');
      const data = await response.json();
      setStudents(data || []);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Falha ao carregar a lista de alunos.' });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentGrade) return;

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStudentName.trim(), grade: newStudentGrade })
      });
      if (!response.ok) throw new Error('Erro ao cadastrar aluno');
      
      setNewStudentName('');
      setIsNewModalOpen(false);
      setFeedback({ type: 'success', message: 'Aluno cadastrado com sucesso!' });
      fetchStudents(true);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao cadastrar aluno.' });
    }
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim() || !bulkGrade) return;

    try {
      const names = bulkText
        .split('\n')
        .map(n => n.trim())
        .filter(n => n.length > 0);

      if (names.length === 0) {
        setFeedback({ type: 'error', message: 'Insira pelo menos um nome válido.' });
        return;
      }

      const response = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade: bulkGrade, names })
      });
      if (!response.ok) throw new Error('Erro na importação em lote');

      setBulkText('');
      setIsBulkModalOpen(false);
      setFeedback({ type: 'success', message: `${names.length} alunos importados com sucesso!` });
      fetchStudents(true);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao importar alunos em lote.' });
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/students/${deleteId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erro ao excluir aluno');

      setStudents(prev => prev.filter(s => String(s.id) !== String(deleteId)));
      setDeleteId(null);
      setFeedback({ type: 'success', message: 'Aluno removido com sucesso!' });
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao remover aluno.' });
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = selectedGrade === 'all' || s.grade === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  const exportToCSV = () => {
    if (filteredStudents.length === 0) {
      setFeedback({ type: 'error', message: 'Não há alunos filtrados para exportar.' });
      return;
    }

    try {
      // Create CSV content (handling BOM for excel encoding)
      const csvHeader = 'ID,Nome Completo,Ano Escolar\n';
      const csvRows = filteredStudents.map(s => `"${s.id}","${s.name.replace(/"/g, '""')}","${s.grade}"`).join('\n');
      const csvContent = '\uFEFF' + csvHeader + csvRows;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Alunos_SESI_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setFeedback({ type: 'success', message: 'Lista exportada com sucesso!' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Falha ao exportar CSV.' });
    }
  };

  // Automatically clear feedback after 3 seconds
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  return (
    <div className="space-y-10 bg-[#020617] text-white">
      {/* Toast Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-6 right-6 z-[200] p-5 rounded-2xl flex items-center gap-4 text-sm font-black border-2 shadow-2xl ${
              feedback.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {feedback.type === 'error' && <AlertTriangle size={20} />}
            <p>{feedback.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Main Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Gestão de Alunos</h1>
          <p className="text-sm text-slate-400 font-bold">Cadastre e gerencie a base de dados de alunos para auto-preenchimento.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchStudents(true)}
            disabled={isRefreshing}
            className="w-12 h-12 bg-slate-900 text-slate-400 hover:text-yellow-400 rounded-xl flex items-center justify-center transition-all border border-slate-800 disabled:opacity-50 shadow-lg"
            title="Atualizar Tabela"
          >
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-slate-300 border border-slate-800 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-lg"
          >
            <FileSpreadsheet size={18} className="text-yellow-400" /> Exportar CSV
          </button>
          
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-slate-300 border border-slate-800 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-lg"
          >
            <ClipboardList size={18} className="text-yellow-400" /> Colar Lista
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-3 px-8 py-4 bg-yellow-400 text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20"
          >
            <Plus size={20} /> Novo Aluno
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center shadow-xl">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-yellow-400" size={24} />
          <input
            type="text"
            placeholder="Pesquisar por nome do aluno..."
            className="w-full pl-14 pr-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all text-white font-bold placeholder:text-slate-500 shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="relative w-full md:w-72 flex-shrink-0">
          <select
            className="w-full px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all appearance-none cursor-pointer text-white font-bold"
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
          >
            <option value="all">Todos os Anos</option>
            {GRADES.map(grade => (
              <option key={grade} value={grade} className="bg-slate-950">{grade}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Carregando Alunos...</p>
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-850">
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">ID</th>
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Nome Completo</th>
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Ano Escolar</th>
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-800/25 transition-colors group">
                    <td className="px-8 py-5 text-sm font-bold text-slate-500">#{student.id}</td>
                    <td className="px-8 py-5 flex items-center gap-4">
                      <div className="w-10 h-10 bg-yellow-400/10 text-yellow-400 rounded-xl flex items-center justify-center font-bold">
                        <User size={18} />
                      </div>
                      <span className="text-base font-black text-white group-hover:text-yellow-400 transition-colors">
                        {student.name}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-black text-slate-300">
                        {student.grade}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => setDeleteId(String(student.id))}
                        className="w-10 h-10 bg-red-500/5 hover:bg-red-500 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all border border-transparent hover:border-red-500/20 inline-flex"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-24 text-center">
            <div className="w-20 h-20 bg-slate-950 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-slate-800">
              <Search className="text-slate-700" size={32} />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Nenhum aluno encontrado</h3>
            <p className="text-slate-500 font-bold max-w-sm mx-auto text-sm">
              Não encontramos registros correspondentes à pesquisa ou filtro.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Novo Aluno */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 shadow-2xl p-10"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-white tracking-tight">Novo Aluno</h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="w-10 h-10 bg-slate-850 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do aluno..."
                  className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all text-white font-bold shadow-inner"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ano Escolar</label>
                <select
                  required
                  className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all text-white font-bold"
                  value={newStudentGrade}
                  onChange={(e) => setNewStudentGrade(e.target.value)}
                >
                  {GRADES.map(grade => (
                    <option key={grade} value={grade} className="bg-slate-900">{grade}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="py-4 bg-slate-850 text-slate-300 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-800 transition-all"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="py-4 bg-yellow-400 text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: Colar Lista (Bulk) */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-slate-800 shadow-2xl p-10"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-white tracking-tight">Importar Lista de Alunos</h3>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="w-10 h-10 bg-slate-850 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ano Escolar (para todos desta lista)</label>
                <select
                  required
                  className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all text-white font-bold"
                  value={bulkGrade}
                  onChange={(e) => setBulkGrade(e.target.value)}
                >
                  {GRADES.map(grade => (
                    <option key={grade} value={grade} className="bg-slate-900">{grade}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lista de Nomes</label>
                  <span className="text-[9px] font-black text-slate-500 uppercase">1 por linha</span>
                </div>
                <textarea
                  rows={8}
                  placeholder={`João Silva Sauro\nMaria Oliveira\nPedro Santos...`}
                  className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all text-white font-bold shadow-inner placeholder:text-slate-700 custom-scrollbar"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="py-4 bg-slate-850 text-slate-300 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-800 transition-all"
                >
                  Voltar
                </button>
                <button
                  onClick={handleBulkImport}
                  className="py-4 bg-yellow-400 text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20"
                >
                  Adicionar Lista
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal: Exclusão */}
      {deleteId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 w-full max-w-sm rounded-[2.5rem] border border-slate-800 shadow-2xl p-10 text-center"
          >
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-6 mx-auto border border-red-500/10">
              <Trash2 size={36} />
            </div>
            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Excluir Aluno</h3>
            <p className="text-slate-400 font-bold text-base leading-relaxed mb-8">
              Tem certeza que deseja remover este aluno? Ele não aparecerá mais no preenchimento de inscrições.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDeleteId(null)}
                className="py-4 bg-slate-850 text-slate-300 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-800 transition-all"
              >
                Voltar
              </button>
              <button
                onClick={handleDeleteStudent}
                className="py-4 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
              >
                Sim, Excluir
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
