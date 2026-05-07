import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Event, Registration, Student } from '../types';
import { Calendar, Users, TrendingUp, Clock, ChevronRight, Trash2, AlertTriangle, GraduationCap, School, Loader2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GRADES, CLASSES } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [recentRegistrations, setRecentRegistrations] = useState<Registration[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchData = async (isBackground = false) => {
    try {
      if (isBackground) {
        setBackgroundLoading(true);
      } else {
        setLoading(true);
      }
      
      setError(null);
      const [eventsRes, regsRes, studentsRes] = await Promise.all([
        supabase.from('events').select('*'),
        supabase.from('registrations').select('*, students(*)').order('timestamp', { ascending: false }).limit(5),
        supabase.from('students').select('*')
      ]);

      if (eventsRes.error) throw eventsRes.error;
      if (regsRes.error) throw regsRes.error;
      if (studentsRes.error) throw studentsRes.error;

      if (eventsRes.data) setEvents(eventsRes.data as Event[]);
      if (regsRes.data) setRecentRegistrations(regsRes.data as any);
      if (studentsRes.data) setStudents(studentsRes.data as Student[]);
    } catch (err: any) {
      console.error("Erro detalhado ao carregar dados do dashboard:", err);
      setError(`Erro no servidor (${err.message || '500'}). Verifique se o projeto no Supabase está ativo.`);
    } finally {
      setLoading(false);
      setBackgroundLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const debouncedFetch = () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        fetchData(true);
      }, 1000); // 1 second debounce
    };

    const channel = supabase
      .channel('dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, debouncedFetch)
      .subscribe();

    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mb-4 shadow-[0_0_15px_rgba(234,179,8,0.3)]" />
        <p className="text-slate-300 font-black uppercase tracking-widest text-sm">Sincronizando Dashboard...</p>
      </div>
    );
  }

  const totalRegistrations = events.reduce((sum, event) => sum + (event.registration_count || 0), 0);

  const stats = [
    { label: 'Eventos', value: events.length, icon: <Calendar size={24} />, color: 'bg-yellow-400 shadow-yellow-400/20' },
    { label: 'Inscrições', value: totalRegistrations, icon: <TrendingUp size={24} />, color: 'bg-yellow-400 shadow-yellow-400/20' },
    { label: 'Alunos', value: students.filter(s => s.type === 'student').length, icon: <GraduationCap size={24} />, color: 'bg-yellow-400 shadow-yellow-400/20' },
    { label: 'Colaboradores', value: students.filter(s => s.type === 'collaborator').length, icon: <Users size={24} />, color: 'bg-yellow-400 shadow-yellow-400/20' },
    { label: 'Responsáveis', value: students.filter(s => s.type === 'responsible').length, icon: <School size={24} />, color: 'bg-yellow-400 shadow-yellow-400/20' },
  ];

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const tables = ['registrations', 'events', 'students', 'categories', 'event_templates'];
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
      }
      setShowResetConfirm(false);
      setFeedback({ type: 'success', message: 'Sistema resetado com sucesso!' });
      fetchData();
    } catch (error) {
      console.error("Erro ao resetar:", error);
      setFeedback({ type: 'error', message: 'Erro ao resetar o sistema.' });
    } finally {
      setIsResetting(false);
    }
  };

  const recountAllRegistrations = async () => {
    setLoading(true);
    try {
      // 1. Get all events
      const { data: allEvents, error: eventsError } = await supabase
        .from('events')
        .select('id');
      
      if (eventsError) throw eventsError;

      if (allEvents) {
        for (const ev of allEvents) {
          // 2. Count registrations for each event
          const { count, error: countError } = await supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', ev.id);
          
          if (countError) throw countError;

          // 3. Update the event with the correct count
          await supabase
            .from('events')
            .update({ registration_count: count || 0 })
            .eq('id', ev.id);
        }
      }
      
      setFeedback({ type: 'success', message: 'Contagens sincronizadas com sucesso!' });
      fetchData();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Erro ao sincronizar contagens.' });
    } finally {
      setLoading(false);
    }
  };

  const seedData = async () => {
    setIsResetting(true);
    try {
      // 1. Create Categories (or fetch if they exist)
      const defaultCategories = ['Esporte', 'Cultura', 'Oficina'];
      let catIds: string[] = [];

      for (const catName of defaultCategories) {
        // Try finding existing first
        const { data: existingCat } = await supabase
          .from('categories')
          .select('id')
          .eq('name', catName)
          .limit(1)
          .single();

        if (existingCat) {
          catIds.push(existingCat.id);
        } else {
          const { data: newCat, error: catError } = await supabase
            .from('categories')
            .insert([{ name: catName }])
            .select()
            .single();
            
          if (catError) {
            console.error("Erro Seed Categoria:", catError);
            throw catError;
          }
          if (newCat) catIds.push(newCat.id);
        }
      }

      if (catIds.length < 3) throw new Error("Não foi possível carregar as categorias.");

      // 2. Create Events
      const eventsToInsert = [
        {
          name: 'Campeonato de Futsal SESI',
          category_id: catIds[0],
          description: 'Grande torneio interclasses de futsal. Venha torcer pela sua turma!',
          image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80',
          start_date: new Date().toISOString().split('T')[0],
          start_time: '08:00',
          end_date: new Date().toISOString().split('T')[0],
          end_time: '12:00',
          duration: '4 horas',
          restrictions: { type: 'all', values: [] },
          password_protected: false,
          form_fields: [
            { id: '1', label: 'Nome', type: 'text', required: true },
            { id: '2', label: 'Sobrenome', type: 'text', required: true },
            { id: '3', label: 'Série', type: 'select', required: true, options: GRADES },
            { id: '4', label: 'Turma', type: 'select', required: true, options: CLASSES }
          ],
          max_capacity: 50
        },
        {
          name: 'Oficina de Robótica',
          category_id: catIds[2],
          description: 'Aprenda a montar e programar seu primeiro robô usando kits LEGO.',
          image_url: 'https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?auto=format&fit=crop&q=80',
          start_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          start_time: '14:00',
          end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          end_time: '17:00',
          duration: '3 horas',
          restrictions: { type: 'years', values: ['6º Ano EF', '7º Ano EF'] },
          password_protected: false,
          form_fields: [
            { id: '1', label: 'Nome', type: 'text', required: true },
            { id: '2', label: 'Sobrenome', type: 'text', required: true },
            { id: '3', label: 'Série', type: 'select', required: true, options: GRADES },
            { id: '4', label: 'Turma', type: 'select', required: true, options: CLASSES },
            { id: '5', label: 'Já teve contato com robótica?', type: 'select', required: true, options: ['Sim', 'Não'] }
          ],
          max_capacity: 20
        }
      ];

      const { data: createdEvents, error: eventError } = await supabase
        .from('events')
        .insert(eventsToInsert)
        .select();

      if (eventError) throw eventError;

      // 3. Create Students and Registrations
      const studentsToInsert = [
        { name: 'Lucas', surname: 'Oliveira', type: 'student' },
        { name: 'Mariana', surname: 'Santos', type: 'student' },
        { name: 'Pedro', surname: 'Souza', type: 'student' }
      ];

      const { data: createdStudents, error: studentError } = await supabase
        .from('students')
        .insert(studentsToInsert)
        .select();

      if (studentError) {
        console.error("Student Seed Error:", studentError);
        throw studentError;
      }

      // Create Registrations
      const regsToInsert = [
        {
          event_id: createdEvents[0].id,
          student_id: createdStudents[0].id,
          form_data: { nome: 'Lucas', sobrenome: 'Oliveira', série: '9º Ano EF', turma: 'A' },
          timestamp: new Date().toISOString()
        },
        {
          event_id: createdEvents[0].id,
          student_id: createdStudents[1].id,
          form_data: { nome: 'Mariana', sobrenome: 'Santos', série: '6º Ano EF', turma: 'B' },
          timestamp: new Date().toISOString()
        },
        {
          event_id: createdEvents[1].id,
          student_id: createdStudents[1].id,
          form_data: { nome: 'Mariana', sobrenome: 'Santos', série: '6º Ano EF', turma: 'B', 'já teve contato com robótica?': 'Não' },
          timestamp: new Date().toISOString()
        }
      ];

      const { error: regError } = await supabase.from('registrations').insert(regsToInsert);
      if (regError) {
        console.error("Registration Seed Error:", regError);
        throw regError;
      }

      // Update registration totals
      await supabase.rpc('increment_registration_count', { row_id: createdEvents[0].id, increment_by: 2 });
      await supabase.rpc('increment_registration_count', { row_id: createdEvents[1].id, increment_by: 1 });

      setFeedback({ type: 'success', message: 'Dados de exemplo gerados com sucesso!' });
      fetchData();
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: 'Erro ao gerar dados.' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">Painel de Controle</h1>
          <p className="text-sm md:text-base text-slate-300 font-bold">Gestão inteligente e visão geral do sistema SESI.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-slate-900 text-slate-400 font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl md:rounded-2xl hover:bg-slate-800 transition-all border border-slate-800 disabled:opacity-50 shadow-sm"
          >
            <Clock size={16} className="text-yellow-400" />
            Atualizar
          </button>
          <button
            onClick={seedData}
            disabled={isResetting || loading}
            className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-yellow-400 text-black font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl md:rounded-2xl hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 disabled:opacity-50"
          >
            <TrendingUp size={16} />
            Gerar Dados
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-red-500/10 text-red-500 font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl md:rounded-2xl hover:bg-red-500/20 transition-all border border-red-500/20 shadow-sm"
          >
            <Trash2 size={16} />
            Resetar
          </button>
          <button
            onClick={recountAllRegistrations}
            disabled={loading}
            className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-amber-500/10 text-amber-400 font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl md:rounded-2xl hover:bg-amber-500 hover:text-black transition-all border border-amber-500/20 disabled:opacity-50 shadow-sm"
          >
            <Users size={16} />
            Sincronizar Contagens
          </button>
        </div>
      </div>

      {profile?.status !== 'approved' && (
        <div className="p-8 bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 text-amber-400 shadow-xl shadow-amber-500/5">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/10">
            <ShieldCheck size={32} />
          </div>
          <div className="flex-grow text-center md:text-left">
            <h3 className="text-xl font-black text-white mb-1">Acesso Restrito (Pendente de Aprovação)</h3>
            <p className="font-bold text-slate-300 leading-relaxed">
              Sua conta foi autenticada como <span className="text-amber-400 uppercase">{profile?.role}</span>, mas ainda aguarda a ativação oficial por um Super Admin. 
              Você pode navegar pelo painel, mas as ações de criação e exclusão estão temporariamente bloqueadas.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-[2rem] flex items-center gap-4 text-red-400">
          <AlertTriangle size={24} />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-[3rem] p-10 max-w-md w-full shadow-2xl border border-slate-800">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-[2rem] flex items-center justify-center mb-8 mx-auto">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-3xl font-black text-white text-center mb-4">Atenção Crítica!</h2>
            <p className="text-slate-400 text-center mb-10 font-bold leading-relaxed text-lg">
              Esta ação irá apagar <span className="text-red-500 underline uppercase">todos</span> os dados permanentemente. Tem certeza absoluta?
            </p>
            <div className="grid grid-cols-2 gap-6">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="py-4 px-6 bg-slate-800 text-slate-400 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="py-4 px-6 bg-red-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {isResetting ? 'Limpando...' : 'Sim, Resetar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800 shadow-2xl flex flex-col gap-6 transition-all hover:border-yellow-400/30 group backdrop-blur-sm">
            <div className={`w-14 h-14 ${stat.color} text-black rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
              <p className="text-4xl font-black text-white tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Recent Events */}
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden transition-all hover:border-yellow-400/20 backdrop-blur-sm">
          <div className="p-8 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xl font-black text-white">Eventos Recentes</h3>
            <Link to="/admin/events" className="text-xs font-black uppercase tracking-widest text-yellow-400 hover:text-yellow-300 transition-colors">Ver todos</Link>
          </div>
          <div className="divide-y divide-slate-800">
            {events.slice(0, 5).map(event => (
              <div key={event.id} className="p-6 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-800">
                    <img src={event.image_url || undefined} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-white mb-1">{event.name}</p>
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-bold text-slate-300">
                        {(() => {
                          try {
                            return format(new Date(event.start_date + 'T00:00:00'), "dd/MM/yyyy");
                          } catch (e) {
                            return '-';
                          }
                        })()}
                      </p>
                      <span className="text-[10px] font-black px-2.5 py-1 bg-yellow-400/10 text-yellow-400 rounded-lg uppercase tracking-widest border border-yellow-400/10">
                        {event.registration_count || 0} inscritos
                      </span>
                    </div>
                  </div>
                </div>
                <Link to={`/admin/events`} className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:text-yellow-400 transition-colors border border-slate-700">
                  <ChevronRight size={20} />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Registrations */}
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden transition-all hover:border-yellow-400/20 backdrop-blur-sm">
          <div className="p-8 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xl font-black text-white">Últimas Inscrições</h3>
          </div>
          <div className="divide-y divide-slate-800">
            {recentRegistrations.length > 0 ? recentRegistrations.map(reg => {
              const student = (reg as any).students;
              return (
                <div key={reg.id} className="p-6 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-full bg-yellow-400/5 flex items-center justify-center text-yellow-400 border border-yellow-400/10">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-white mb-1">{student?.name} {student?.surname}</p>
                      <p className="text-xs font-bold text-slate-300">Inscrito em: <span className="text-yellow-400">{events.find(e => e.id === reg.event_id)?.name}</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-white uppercase tracking-widest">
                      {(() => {
                        try {
                          return format(new Date(reg.timestamp), "HH:mm", { locale: ptBR });
                        } catch (e) {
                          return '-';
                        }
                      })()}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      {(() => {
                        try {
                          return format(new Date(reg.timestamp), "dd/MM", { locale: ptBR });
                        } catch (e) {
                          return '-';
                        }
                      })()}
                    </p>
                  </div>
                </div>
              );
            }) : (
              <div className="p-20 text-center text-slate-500 font-bold">Nenhuma inscrição recente.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
