import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Search, Download, RefreshCw, Loader2, ClipboardList, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';

interface Registration {
  id: string;
  event_id: string;
  student_id: string;
  timestamp: string;
  form_data?: any;
  students?: {
    id: string;
    name: string;
    surname: string;
    grade: string;
    class: string;
    type: string;
  };
  events?: {
    id: string;
    name: string;
    dias_semana?: string[];
  };
}

const PAGE_SIZE = 50;

export default function AdminAllRegistrations() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      // Fetch events list for filter dropdown
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, name')
        .order('name', { ascending: true });
      if (eventsData) setEvents(eventsData);

      // Paginated fetch of ALL registrations
      let allRegs: Registration[] = [];
      let from = 0;
      const step = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('registrations')
          .select('*, students(*), events(id, name, dias_semana)')
          .order('timestamp', { ascending: false })
          .range(from, from + step - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allRegs.push(...(data as Registration[]));
        if (data.length < step) break;
        from += step;
      }

      setRegistrations(allRegs);
    } catch (err: any) {
      console.error('Erro ao carregar inscrições:', err);
      setFeedback({ type: 'error', message: 'Erro ao carregar inscrições. Tente novamente.' });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    // Subscribe to realtime updates so the list auto-refreshes
    const channel = supabase
      .channel('all_registrations_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, () => {
        fetchAll(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  // Filtered data
  const filtered = registrations.filter(reg => {
    const studentName = `${reg.students?.name || ''} ${reg.students?.surname || ''}`.toLowerCase();
    const formName = (reg.form_data?.nome || reg.form_data?.['nome completo'] || '').toString().toLowerCase();
    const eventName = (reg.events?.name || '').toLowerCase();
    const grade = (reg.students?.grade || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = !searchTerm ||
      studentName.includes(search) ||
      formName.includes(search) ||
      eventName.includes(search) ||
      grade.includes(search);

    const matchesEvent = eventFilter === 'all' || reg.event_id === eventFilter;

    return matchesSearch && matchesEvent;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, eventFilter]);

  const handleExport = () => {
    const rows = filtered.map((reg, idx) => ({
      '#': idx + 1,
      'Aluno': `${reg.students?.name || ''} ${reg.students?.surname || ''}`.trim() || (reg.form_data?.nome || reg.form_data?.['nome completo'] || '—'),
      'Ano/Série': reg.students?.grade || '—',
      'Turma': reg.students?.class || '—',
      'After': reg.events?.name || '—',
      'Dia(s)': Array.isArray(reg.events?.dias_semana) ? reg.events!.dias_semana!.join(', ') : '—',
      'Data/Hora Inscrição': reg.timestamp ? new Date(reg.timestamp).toLocaleString('pt-BR') : '—',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Todas as Inscrições');
    XLSX.writeFile(wb, `todas_inscricoes_after_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
    setFeedback({ type: 'success', message: `${filtered.length} inscrições exportadas com sucesso!` });
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <span className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-400/20">
              <ClipboardList size={20} className="text-black" />
            </span>
            Todas as Inscrições
          </h1>
          <p className="text-slate-400 text-sm font-bold mt-1 ml-13">
            {loading ? 'Carregando...' : `${filtered.length} de ${registrations.length} inscrições`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAll(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <button
            onClick={handleExport}
            disabled={loading || filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-yellow-400/20 disabled:opacity-50"
          >
            <Download size={14} />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`px-4 py-3 rounded-xl text-sm font-black ${feedback.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por aluno, série ou after..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition-all"
          />
        </div>
        <div className="relative sm:w-64">
          <select
            value={eventFilter}
            onChange={e => setEventFilter(e.target.value)}
            className="w-full appearance-none bg-slate-900 border border-slate-700 text-white rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition-all cursor-pointer"
          >
            <option value="all">Todos os Afters</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats cards */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Geral', value: registrations.length, color: 'text-yellow-400' },
            { label: 'Filtradas', value: filtered.length, color: 'text-blue-400' },
            { label: 'Página Atual', value: `${page}/${totalPages || 1}`, color: 'text-green-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center">
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-12 h-12 text-yellow-400 animate-spin shadow-[0_0_15px_rgba(234,179,8,0.3)]" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Carregando todas as inscrições...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center">
            <Users size={28} className="text-slate-600" />
          </div>
          <p className="text-slate-500 font-black uppercase tracking-widest text-sm">Nenhuma inscrição encontrada</p>
        </div>
      ) : (
        <>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50">
                    <th className="text-left py-4 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">#</th>
                    <th className="text-left py-4 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">Aluno</th>
                    <th className="text-left py-4 px-4 text-xs font-black text-slate-500 uppercase tracking-widest hidden sm:table-cell">Série/Turma</th>
                    <th className="text-left py-4 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">After</th>
                    <th className="text-left py-4 px-4 text-xs font-black text-slate-500 uppercase tracking-widest hidden md:table-cell">Dia(s)</th>
                    <th className="text-left py-4 px-4 text-xs font-black text-slate-500 uppercase tracking-widest hidden lg:table-cell">Inscrito em</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((reg, idx) => {
                    const studentName = `${reg.students?.name || ''} ${reg.students?.surname || ''}`.trim()
                      || reg.form_data?.nome
                      || reg.form_data?.['nome completo']
                      || '—';
                    const grade = reg.students?.grade || '—';
                    const klass = reg.students?.class || '';
                    const afterName = reg.events?.name || '—';
                    const dias = Array.isArray(reg.events?.dias_semana)
                      ? reg.events!.dias_semana!.join(', ')
                      : '—';
                    const dateStr = reg.timestamp
                      ? new Date(reg.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : '—';
                    const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;

                    return (
                      <motion.tr
                        key={reg.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.01 }}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-4 text-xs font-bold text-slate-600">{globalIdx}</td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-bold text-white">{studentName}</span>
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          <span className="text-xs font-bold text-slate-400">{grade}{klass ? ` · ${klass}` : ''}</span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => navigate(`/admin/events/${reg.event_id}/registrations`)}
                            className="inline-block bg-yellow-400/10 text-yellow-400 text-xs font-black px-2.5 py-1 rounded-lg border border-yellow-400/20 hover:bg-yellow-400/25 hover:border-yellow-400/50 transition-all cursor-pointer"
                            title="Ver inscrições deste after"
                          >
                            {afterName}
                          </button>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <span className="text-xs font-bold text-slate-400">{dias}</span>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <span className="text-xs font-bold text-slate-500">{dateStr}</span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                {/* Page numbers */}
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pg: number;
                  if (totalPages <= 7) {
                    pg = i + 1;
                  } else if (page <= 4) {
                    pg = i + 1;
                  } else if (page >= totalPages - 3) {
                    pg = totalPages - 6 + i;
                  } else {
                    pg = page - 3 + i;
                  }
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`w-9 h-9 text-xs font-black rounded-xl transition-all border ${
                        pg === page
                          ? 'bg-yellow-400 text-black border-yellow-400 shadow-lg shadow-yellow-400/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
