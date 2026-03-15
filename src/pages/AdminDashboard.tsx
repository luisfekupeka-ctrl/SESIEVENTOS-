import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Event, Registration, Student } from '../types';
import { Calendar, Users, TrendingUp, Clock, ChevronRight, Trash2, AlertTriangle, GraduationCap, School } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GRADES, CLASSES } from '../constants';

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [recentRegistrations, setRecentRegistrations] = useState<Registration[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
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
      console.error("Erro ao carregar dados:", err);
      setError("Não foi possível carregar os dados do painel. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  const [error, setError] = useState<string | null>(null);

  if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium animate-pulse">Carregando...</div>;

  const totalRegistrations = events.reduce((sum, event) => sum + (event.registration_count || 0), 0);

  const stats = [
    { label: 'Total de Eventos', value: events.length, icon: <Calendar size={24} />, color: 'bg-blue-500 shadow-blue-500/20' },
    { label: 'Inscrições Realizadas', value: totalRegistrations, icon: <TrendingUp size={24} />, color: 'bg-green-500 shadow-green-500/20' },
    { label: 'Alunos', value: students.filter(s => s.type === 'student').length, icon: <GraduationCap size={24} />, color: 'bg-purple-500 shadow-purple-500/20' },
    { label: 'Colaboradores', value: students.filter(s => s.type === 'collaborator').length, icon: <Users size={24} />, color: 'bg-indigo-500 shadow-indigo-500/20' },
    { label: 'Responsáveis', value: students.filter(s => s.type === 'responsible').length, icon: <School size={24} />, color: 'bg-amber-500 shadow-amber-500/20' },
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Painel de Controle</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Visão geral do sistema de eventos SESI.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-50"
          >
            <Clock size={18} />
            Atualizar
          </button>
          <button
            onClick={seedData}
            disabled={isResetting || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors border border-blue-100 dark:border-blue-500/20 disabled:opacity-50"
          >
            <TrendingUp size={18} />
            Gerar Dados de Teste
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors border border-red-100 dark:border-red-500/20"
          >
            <Trash2 size={18} />
            Resetar Sistema
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertTriangle size={20} />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2">Atenção!</h2>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-8">
              Esta ação irá apagar <strong>TODOS</strong> os eventos, alunos e inscrições permanentemente. Deseja continuar?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="py-3 px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="py-3 px-6 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
              >
                {isResetting ? 'Limpando...' : 'Sim, Resetar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedback && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300 text-center border border-slate-200 dark:border-slate-800">
            <div className={`w-16 h-16 ${feedback.type === 'success' ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400'} rounded-2xl flex items-center justify-center mb-6 mx-auto`}>
              {feedback.type === 'success' ? <TrendingUp size={32} /> : <AlertTriangle size={32} />}
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
              {feedback.type === 'success' ? 'Sucesso!' : 'Erro'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">
              {feedback.message}
            </p>
            <button
              onClick={() => setFeedback(null)}
              className="w-full py-3 bg-slate-900 dark:bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-700 transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
            <div className={`w-12 h-12 ${stat.color} text-white rounded-xl flex items-center justify-center shadow-lg`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Events */}
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Eventos Recentes</h3>
            <Link to="/admin/events" className="text-sm font-bold text-[#0054A6] dark:text-blue-400 hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {events.slice(0, 5).map(event => (
              <div key={event.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img src={event.image_url || undefined} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{event.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{format(new Date(event.start_date), "dd/MM/yyyy")}</p>
                      <span className="text-[10px] font-black px-1.5 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md">
                        {event.registration_count || 0} inscritos
                      </span>
                    </div>
                  </div>
                </div>
                <Link to={`/admin/events`} className="text-slate-400 dark:text-slate-500 hover:text-[#0054A6] dark:hover:text-blue-400 transition-colors">
                  <ChevronRight size={20} />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Registrations */}
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Últimas Inscrições</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentRegistrations.map(reg => {
              const student = (reg as any).students;
              return (
                <div key={reg.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#0054A6]/10 dark:bg-blue-500/10 flex items-center justify-center text-[#0054A6] dark:text-blue-400">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{student?.name} {student?.surname}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Inscrito em: {events.find(e => e.id === reg.event_id)?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {format(new Date(reg.timestamp), "HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {format(new Date(reg.timestamp), "dd/MM", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
