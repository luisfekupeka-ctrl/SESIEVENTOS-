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
      const [eventsRes, regsRes, studentsRes] = await Promise.all([
        supabase.from('events').select('*'),
        supabase.from('registrations').select('*, students(*)').order('timestamp', { ascending: false }).limit(5),
        supabase.from('students').select('*')
      ]);

      if (eventsRes.data) setEvents(eventsRes.data as Event[]);
      if (regsRes.data) setRecentRegistrations(regsRes.data as any);
      if (studentsRes.data) setStudents(studentsRes.data as Student[]);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium animate-pulse">Carregando...</div>;

  const totalRegistrations = events.reduce((sum, event) => sum + (event.registration_count || 0), 0);

  const stats = [
    { label: 'Total de Eventos', value: events.length, icon: <Calendar size={24} />, color: 'bg-blue-500' },
    { label: 'Inscrições Realizadas', value: totalRegistrations, icon: <TrendingUp size={24} />, color: 'bg-green-500' },
    { label: 'Alunos', value: students.filter(s => s.type === 'student').length, icon: <GraduationCap size={24} />, color: 'bg-purple-500' },
    { label: 'Colaboradores', value: students.filter(s => s.type === 'collaborator').length, icon: <Users size={24} />, color: 'bg-indigo-500' },
    { label: 'Responsáveis', value: students.filter(s => s.type === 'responsible').length, icon: <School size={24} />, color: 'bg-amber-500' },
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
      // 1. Create Categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .insert([{ name: 'Esporte' }, { name: 'Cultura' }, { name: 'Oficina' }])
        .select();

      if (catError) throw catError;
      const catIds = catData.map(c => c.id);

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
        { name: 'Lucas', surname: 'Oliveira', grade: '9º Ano EF', class: 'A', type: 'student' },
        { name: 'Mariana', surname: 'Santos', grade: '6º Ano EF', class: 'B', type: 'student' },
        { name: 'Pedro', surname: 'Souza', grade: '1º Ano EM', class: 'C', type: 'student' }
      ];

      const { data: createdStudents, error: studentError } = await supabase
        .from('students')
        .insert(studentsToInsert)
        .select();

      if (studentError) throw studentError;

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
      if (regError) throw regError;

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
          <h1 className="text-3xl font-black text-slate-900 mb-2">Painel de Controle</h1>
          <p className="text-slate-500 font-medium">Visão geral do sistema de eventos SESI.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={seedData}
            disabled={isResetting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors border border-blue-100 disabled:opacity-50"
          >
            <TrendingUp size={18} />
            Gerar Dados de Teste
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors border border-red-100"
          >
            <Trash2 size={18} />
            Resetar Sistema
          </button>
        </div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 text-center mb-2">Atenção!</h2>
            <p className="text-slate-500 text-center mb-8">
              Esta ação irá apagar <strong>TODOS</strong> os eventos, alunos e inscrições permanentemente. Deseja continuar?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="py-3 px-6 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
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
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300 text-center">
            <div className={`w-16 h-16 ${feedback.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} rounded-2xl flex items-center justify-center mb-6 mx-auto`}>
              {feedback.type === 'success' ? <TrendingUp size={32} /> : <AlertTriangle size={32} />}
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              {feedback.type === 'success' ? 'Sucesso!' : 'Erro'}
            </h2>
            <p className="text-slate-500 mb-8 font-medium">
              {feedback.message}
            </p>
            <button
              onClick={() => setFeedback(null)}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 ${stat.color} text-white rounded-xl flex items-center justify-center shadow-lg`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Events */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900">Eventos Recentes</h3>
            <Link to="/admin/events" className="text-sm font-bold text-[#0054A6] hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {events.slice(0, 5).map(event => (
              <div key={event.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100">
                    <img src={event.image_url || undefined} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{event.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-500">{format(new Date(event.start_date), "dd/MM/yyyy")}</p>
                      <span className="text-[10px] font-black px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md">
                        {event.registration_count || 0} inscritos
                      </span>
                    </div>
                  </div>
                </div>
                <Link to={`/admin/events`} className="text-slate-400 hover:text-[#0054A6]">
                  <ChevronRight size={20} />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Registrations */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900">Últimas Inscrições</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentRegistrations.map(reg => {
              const student = (reg as any).students;
              return (
                <div key={reg.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#0054A6]/10 flex items-center justify-center text-[#0054A6]">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{student?.name} {student?.surname}</p>
                      <p className="text-xs text-slate-500">Inscrito em: {events.find(e => e.id === reg.event_id)?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {format(new Date(reg.timestamp), "HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
