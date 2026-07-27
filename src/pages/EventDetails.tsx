import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Event, Category } from '../types';
import { Calendar, Clock, Tag, Users, ShieldCheck, ChevronLeft, Send, CheckCircle2, AlertTriangle, Lock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { formatYearRestrictions } from '../components/EventCard';
import { getEventImage } from '../utils/getEventImage';
import { useAuth } from '../context/AuthContext';

export default function EventDetails() {
  const { profile } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [participantType, setParticipantType] = useState<'student' | 'collaborator' | 'responsible' | 'other'>('student');
  const [eventPassword, setEventPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [restrictionError, setRestrictionError] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedStudentGrade, setSelectedStudentGrade] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [paymentAccepted, setPaymentAccepted] = useState(false);
  const [eventParticipants, setEventParticipants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
  const [isLive, setIsLive] = useState(false);
  
  // Registration countdown timer states
  const [regCountdownTime, setRegCountdownTime] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
  const [regUpcoming, setRegUpcoming] = useState(false);
  const [countdownTitle, setCountdownTitle] = useState('Inscrições em Breve');
  const [countdownSubtitle, setCountdownSubtitle] = useState('Prepare-se! As inscrições serão liberadas automaticamente assim que o cronômetro zerar.');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (eventError) throw eventError;
        if (eventData) {
          setEvent(eventData as Event);
          
          const { data: catData } = await supabase
            .from('categories')
            .select('*')
            .eq('id', eventData.category_id)
            .single();

          if (catData) {
            setCategory(catData as Category);
          }
        }
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar detalhes do evento.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const fetchStudents = async () => {
      const { data } = await supabase.from('students').select('*').eq('type', 'student');
      if (data) setAllStudents(data);
    };
    fetchStudents();

    const fetchParticipants = async () => {
      if (!id) return;
      const { data } = await supabase
        .from('registrations')
        .select('*, students(*)')
        .eq('event_id', id)
        .eq('status', 'approved');
      
      if (data) {
        const sorted = [...data].sort((a, b) => {
          const nameA = (a.students?.name || a.form_data?.nome || a.form_data?.['nome completo'] || '').toLowerCase().trim();
          const nameB = (b.students?.name || b.form_data?.nome || b.form_data?.['nome completo'] || '').toLowerCase().trim();
          return nameA.localeCompare(nameB);
        });
        setEventParticipants(sorted);
      }
    };
    fetchParticipants();

    // Subscribe to realtime database updates
    const channel = supabase
      .channel(`realtime-event-details-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${id}`
        },
        (payload) => {
          if (payload.new) {
            setEvent(payload.new as Event);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registrations',
          filter: `event_id=eq.${id}`
        },
        () => {
          fetchParticipants();
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    const calculateTime = () => {
      if (!event) return;
      
      const now = new Date();

      // Fix start date time parsing for the overall event
      let startDateTime = new Date();
      if (event.start_date && event.start_time) {
        const dateStr = `${event.start_date}T${event.start_time}:00`;
        startDateTime = new Date(dateStr);
      }
      
      const diff = startDateTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(null);
        setIsLive(true);
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ d, h, m, s });
        setIsLive(false);
      }

      // Check registration opening / countdown target
      let targetTime: Date | null = null;
      let targetTimeStr = event.registration_open_at;

      if (!targetTimeStr && event.start_date && event.start_time) {
        targetTimeStr = `${event.start_date}T${event.start_time}:00`;
      }

      if (targetTimeStr) {
        const cleanStr = targetTimeStr.trim();
        const isoStr = cleanStr.includes('-03:00') || cleanStr.includes('Z')
          ? cleanStr
          : (cleanStr.length === 16 ? `${cleanStr}:00-03:00` : (cleanStr.length === 19 ? `${cleanStr}-03:00` : cleanStr));
        targetTime = new Date(isoStr);
      }

      // Check if it's a mixed event (contains both 6/7 and 8/9/EM)
      let isMixedEvent = false;
      const restrictions = event.restrictions as any;
      if (restrictions?.type === 'all' || !restrictions || !restrictions.type) {
        isMixedEvent = true;
      } else if (restrictions?.type === 'years' && Array.isArray(restrictions.values)) {
        const hasGroupA = restrictions.values.some((v: string) => ['6º Ano EF', '7º Ano EF'].includes(v));
        const hasGroupB = restrictions.values.some((v: string) => ['8º Ano EF', '9º Ano EF', '1º Ano EM', '2º Ano EM', '3º Ano EM'].includes(v));
        isMixedEvent = hasGroupA && hasGroupB;
      }

      if (isMixedEvent) {
        const date27_open = new Date('2026-07-27T12:15:00-03:00');
        const date27_close = new Date('2026-07-27T14:00:00-03:00');
        const date28_open = new Date('2026-07-28T09:30:00-03:00');

        if (now < date27_open) {
          targetTime = date27_open;
          setCountdownTitle('Inscrições em Breve');
          setCountdownSubtitle('Prepare-se! As inscrições serão liberadas automaticamente assim que o cronômetro zerar.');
        } else if (now >= date27_open && now < date27_close) {
          // Open for 6/7, closed for others (handled in submit check)
          targetTime = null;
        } else if (now >= date27_close && now < date28_open) {
          // Closed temporarily, waiting for July 28th
          targetTime = date28_open;
          setCountdownTitle('Reabertura em Breve');
          setCountdownSubtitle('As inscrições para o 8º/9º ano e Ensino Médio reabrirão automaticamente às 09h30 de 28/07.');
        } else {
          // Open for everyone
          targetTime = null;
        }
      } else {
        setCountdownTitle('Inscrições em Breve');
        setCountdownSubtitle('Prepare-se! As inscrições serão liberadas automaticamente assim que o cronômetro zerar.');
      }

      if (!targetTime || isNaN(targetTime.getTime())) {
        setRegCountdownTime(null);
        setRegUpcoming(false);
        return;
      }
      
      const diffReg = targetTime.getTime() - now.getTime();
      
      if (diffReg <= 0) {
        setRegCountdownTime(null);
        setRegUpcoming(false);
      } else {
        setRegUpcoming(true);
        const d = Math.floor(diffReg / (1000 * 60 * 60 * 24));
        const h = Math.floor((diffReg % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diffReg % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diffReg % (1000 * 60)) / 1000);
        setRegCountdownTime({ d, h, m, s });
      }
    };

    calculateTime(); // run immediately!
    const timer = setInterval(calculateTime, 1000);

    return () => clearInterval(timer);
  }, [event]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regUpcoming) return;
    
    if (isSubmitDisabled) return;

    if (!event || !id) return;


    const formFields = (event.form_fields as any[]) || [];
    const nameKey = formFields.find(f => f.label?.toLowerCase().includes('nome'))?.label?.toLowerCase() || 'nome';
    const surnameKey = formFields.find(f => f.label?.toLowerCase().includes('sobrenome'))?.label?.toLowerCase() || 'sobrenome';
    const gradeKey = formFields.find(f => f.label?.toLowerCase().includes('série') || f.label?.toLowerCase().includes('ano'))?.label?.toLowerCase() || 'série';
    const classKey = formFields.find(f => f.label?.toLowerCase().includes('turma'))?.label?.toLowerCase() || 'turma';

    const sName = formData[nameKey] || '';
    const sSurname = formData[surnameKey] || '';
    const sGrade = formData[gradeKey] || '';
    const sClass = formData[classKey] || '';

    let finalFirstName = sName.trim();
    let finalLastName = sSurname.trim();
    if (!finalLastName && finalFirstName.includes(' ')) {
      const parts = finalFirstName.split(/\s+/);
      finalFirstName = parts[0] || '';
      finalLastName = parts.slice(1).join(' ') || '';
    }

    const restrictions = event.restrictions as any;

    if (restrictions?.type === 'years' && !restrictions.values?.includes(sGrade)) {
      setRestrictionError(`Este evento é restrito aos anos: ${restrictions.values?.join(', ')}`);
      return;
    }
    if (restrictions?.type === 'classes' && !restrictions.values?.includes(sClass)) {
      setRestrictionError(`Este evento é restrito às turmas: ${restrictions.values?.join(', ')}`);
      return;
    }
    if (restrictions?.type === 'collaborators' && participantType !== 'collaborator') {
      setRestrictionError(`Este evento é restrito apenas para colaboradores.`);
      return;
    }
    if (restrictions?.type === 'participant_types' && !restrictions.values?.includes(participantType)) {
      const typeLabels: Record<string, string> = {
        student: 'alunos',
        collaborator: 'colaboradores',
        responsible: 'responsáveis',
        other: 'outros'
      };
      const allowedLabels = restrictions.values?.map((v: string) => typeLabels[v] || v).join(', ');
      setRestrictionError(`Este evento é restrito aos seguintes tipos de participante: ${allowedLabels}`);
      return;
    }


    if (event.enable_autocomplete !== false && participantType === 'student') {
      const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const sNameNorm = normalizeString(sName);
      const isStudentInDatabase = allStudents.some(s => 
        normalizeString(s.name || '') === sNameNorm || 
        normalizeString(`${s.name} ${s.surname || ''}`) === sNameNorm
      );
      if (!isStudentInDatabase) {
        setRestrictionError("Por favor, selecione um aluno válido da lista de sugestões.");
        return;
      }
    }

    if (event.password_protected && event.password !== eventPassword) {
      setPasswordError(true);
      return;
    }

    setIsRegistering(true);
    setError(null);
    setRestrictionError(null);

    try {
      let status = 'approved';
      if (event.end_date && event.end_time) {
        const endDateTime = new Date(`${event.end_date}T${event.end_time}`);
        if (new Date() > endDateTime) {
          status = 'pending';
        }
      }

      const { data: resData, error: rpcError } = await supabase.rpc('register_participant', {
        p_event_id: id,
        p_student_name: finalFirstName,
        p_student_surname: finalLastName,
        p_student_grade: sGrade,
        p_student_class: sClass,
        p_participant_type: participantType,
        p_form_data: { ...formData, status }
      });

      if (rpcError || !resData || !resData.success) {
        const errorMsg = rpcError?.message || resData?.error || "Erro ao processar inscrição. Tente novamente.";
        if (errorMsg.toLowerCase().includes('dup') || errorMsg.toLowerCase().includes('já inscrito') || errorMsg.toLowerCase().includes('repetido') || errorMsg.toLowerCase().includes('duplicada') || errorMsg.toLowerCase().includes('inscrição não permitida')) {
          setRestrictionError(errorMsg);
        } else if (errorMsg.toLowerCase().includes('lotado')) {
          setError("Desculpe, o evento acabou de lotar.");
        } else {
          setError(errorMsg);
        }
        setIsRegistering(false);
        return;
      }

      setRegistrationSuccess(true);
      // Atualizar lista de inscritos após sucesso
      const { data: newParticipants } = await supabase
        .from('registrations')
        .select('*, students(*)')
        .eq('event_id', id)
        .eq('status', 'approved');
      if (newParticipants) {
        const sorted = [...newParticipants].sort((a, b) => {
          const nameA = (a.students?.name || a.form_data?.nome || a.form_data?.['nome completo'] || '').toLowerCase().trim();
          const nameB = (b.students?.name || b.form_data?.nome || b.form_data?.['nome completo'] || '').toLowerCase().trim();
          return nameA.localeCompare(nameB);
        });
        setEventParticipants(sorted);
      }
      return; // Success!
    } catch (err: any) {
      console.error(err);
      setError("Erro ao processar inscrição. Tente novamente.");
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center transition-colors">
      <Loader2 className="w-12 h-12 text-yellow-400 animate-spin shadow-[0_0_15px_rgba(234,179,8,0.3)]" />
    </div>
  );

  if (!event) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center flex-col p-4 transition-colors">
      <AlertTriangle size={60} className="text-red-500 mb-6" />
      <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Evento não encontrado</h2>
      <button onClick={() => navigate('/')} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold border border-slate-800 hover:bg-slate-800 transition-all">Voltar para o início</button>
    </div>
  );

  const restrictions = event.restrictions as any;
  const isGradeInvalid = participantType === 'student' && 
                         restrictions?.type === 'years' && 
                         selectedStudentGrade && 
                         !restrictions.values?.includes(selectedStudentGrade);

  const isSubmitDisabled = isRegistering || (event.is_paid === 1 && !paymentAccepted) || isGradeInvalid;

  return (
    <div className="pb-20 bg-[#020617] text-white">
      {/* Hero Header */}
      <div className="relative h-[400px] md:h-[600px] bg-slate-950 overflow-hidden">
        <motion.img
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.5 }}
          transition={{ duration: 1.5 }}
          src={event.image_url || getEventImage(event.name) || `https://picsum.photos/seed/${event.id}/1920/1080`}
          alt={event.name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/50 to-transparent"></div>
        {event.max_capacity && event.max_capacity > 0 && (event.registration_count || 0) >= event.max_capacity && (
          <div className="absolute top-20 left-0 right-0 z-40 flex items-center justify-center animate-in fade-in zoom-in duration-500 px-4">
            <div className="bg-red-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-3xl md:text-5xl tracking-[0.3em] shadow-[0_20px_50px_rgba(220,38,38,0.6)] border-8 border-white/20 rotate-[-4deg] flex items-center gap-6">
              <AlertTriangle size={48} className="text-white animate-pulse hidden md:block" />
              ESGOTADO
            </div>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-7xl mx-auto">
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => navigate('/')}
              className="mb-8 flex items-center gap-2 text-slate-400 hover:text-yellow-400 font-black transition-all uppercase text-[10px] tracking-widest"
            >
              <ChevronLeft size={18} /> Voltar para o início
            </motion.button>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-3 mb-6"
            >
              <span className="bg-yellow-400/10 text-yellow-400 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] border border-yellow-400/20 backdrop-blur-md">
                {category?.name || 'Evento'}
              </span>
              <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] border backdrop-blur-md ${
                event.is_paid === 1 
                  ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                  : 'bg-green-500/10 text-green-400 border-green-500/20'
              }`}>
                {event.is_paid === 1 ? 'Pago' : 'Gratuito'}
              </span>
              <span className="bg-sky-500/10 text-sky-400 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] border border-sky-500/20 backdrop-blur-md">
                {formatYearRestrictions(event)}
              </span>
              {event.password_protected && (
                <span className="bg-slate-900/60 backdrop-blur-md text-white text-[10px] font-black px-4 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10 uppercase tracking-widest">
                  <Lock size={12} className="text-yellow-400" /> Protegido
                </span>
              )}
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.8 }}
              className="text-4xl md:text-7xl font-black text-white leading-[1.1] max-w-5xl tracking-tighter"
            >
              {event.name}
            </motion.h1>
          </div>
        </div>
      </div>

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 ${regUpcoming ? '-mt-4 md:-mt-8' : '-mt-20'}`}>
        
        {regUpcoming && regCountdownTime && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-12 text-center py-12 md:py-16 space-y-8 ${
              (regCountdownTime.d * 24 * 60 + regCountdownTime.h * 60 + regCountdownTime.m <= parseInt(event.countdown_target_at || '10')) 
                ? 'bg-red-500/10 border-2 border-red-500/50 shadow-[0_0_80px_rgba(239,68,68,0.3)]' 
                : 'bg-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-xl'
            } p-8 rounded-[3rem] transition-all duration-1000 w-full`}
          >
            <div className={`w-28 h-28 md:w-32 md:h-32 rounded-[2.5rem] flex items-center justify-center mx-auto text-5xl md:text-6xl border-4 animate-pulse shadow-inner ${
              (regCountdownTime.d * 24 * 60 + regCountdownTime.h * 60 + regCountdownTime.m <= parseInt(event.countdown_target_at || '10'))
                ? 'bg-red-500/20 text-red-500 border-red-500/40 shadow-[inset_0_0_40px_rgba(239,68,68,0.4)]'
                : 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
            }`}>
              ⏱️
            </div>
            <div className="space-y-4">
              <h4 className="text-4xl md:text-5xl font-black text-white tracking-tighter">{countdownTitle}</h4>
              <p className="text-slate-400 font-bold text-lg md:text-xl uppercase tracking-[0.3em]">Abertura em contagem regressiva</p>
            </div>

            <div className="flex justify-center gap-4 md:gap-6 max-w-2xl mx-auto pt-6">
              {[
                ...(regCountdownTime.d > 0 ? [{ val: regCountdownTime.d, label: 'dias' }] : []),
                ...(regCountdownTime.d > 0 || regCountdownTime.h > 0 ? [{ val: regCountdownTime.h, label: 'horas' }] : []),
                { val: regCountdownTime.m, label: 'minutos' },
                { val: regCountdownTime.s, label: 'segundos' }
              ].map(t => (
                <div key={t.label} className={`flex-1 p-6 md:p-8 rounded-[2rem] border-2 transform transition-transform hover:scale-105 ${
                  (regCountdownTime.d * 24 * 60 + regCountdownTime.h * 60 + regCountdownTime.m <= parseInt(event.countdown_target_at || '10'))
                    ? 'bg-gradient-to-b from-red-950/40 to-slate-950 border-red-500/40 shadow-[0_20px_40px_rgba(239,68,68,0.2)]'
                    : 'bg-slate-950/80 border-slate-800'
                }`}>
                  <div className={`text-6xl md:text-8xl font-black leading-none tracking-tighter ${
                    (regCountdownTime.d * 24 * 60 + regCountdownTime.h * 60 + regCountdownTime.m <= parseInt(event.countdown_target_at || '10'))
                      ? 'text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.8)]'
                      : 'text-yellow-400'
                  }`}>
                    {String(t.val).padStart(2, '0')}
                  </div>
                  <div className={`text-xs md:text-sm font-black uppercase tracking-[0.3em] mt-6 ${
                    (regCountdownTime.d * 24 * 60 + regCountdownTime.h * 60 + regCountdownTime.m <= parseInt(event.countdown_target_at || '10'))
                      ? 'text-red-400/80' : 'text-slate-500'
                  }`}>{t.label}</div>
                </div>
              ))}
            </div>
            
            <div className={`mt-10 p-8 rounded-3xl border-2 inline-block max-w-3xl mx-auto ${
              (regCountdownTime.d * 24 * 60 + regCountdownTime.h * 60 + regCountdownTime.m <= parseInt(event.countdown_target_at || '10'))
                ? 'bg-red-500/10 border-red-500/20'
                : 'bg-yellow-400/5 border-yellow-400/10'
            }`}>
              <p className={`text-sm md:text-base font-black uppercase tracking-[0.2em] leading-relaxed ${
                (regCountdownTime.d * 24 * 60 + regCountdownTime.h * 60 + regCountdownTime.m <= parseInt(event.countdown_target_at || '10'))
                  ? 'text-red-400'
                  : 'text-yellow-400/80'
              }`}>
                {countdownSubtitle}
              </p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Details */}
          <div className={regUpcoming ? "lg:col-span-3 space-y-12" : "lg:col-span-2 space-y-12"}>
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900/40 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-slate-800 shadow-2xl"
            >
              <h2 className="text-2xl md:text-3xl font-black text-white mb-8 flex items-center gap-4">
                <div className="w-1.5 h-10 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)]"></div>
                Sobre o Evento
              </h2>
              <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-lg md:text-xl font-medium">
                {event.description}
              </div>
            </motion.section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-[2rem] border border-slate-800 shadow-2xl flex items-start gap-6 group hover:border-yellow-400/30 transition-all"
              >
                <div className="w-16 h-16 bg-yellow-400/10 rounded-2xl flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform shadow-lg border border-yellow-400/10">
                  <Calendar size={32} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-yellow-400/60 uppercase tracking-[0.2em] mb-2">Data e Hora</h4>
                  <p className="text-white text-2xl font-black tracking-tight">
                    {(() => {
                      try {
                        return format(new Date(event.start_date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR });
                      } catch (e) {
                        return event.start_date;
                      }
                    })()}
                  </p>
                  <p className="text-slate-400 text-lg font-bold mt-1">
                    {event.start_time} às {event.end_time}
                  </p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-[2rem] border border-slate-800 shadow-2xl flex items-start gap-6 group hover:border-yellow-400/30 transition-all"
              >
                <div className="w-16 h-16 bg-yellow-400/10 text-yellow-400 rounded-2xl flex items-center justify-center shadow-lg border border-yellow-400/10 group-hover:scale-110 transition-transform">
                  <Users size={32} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-yellow-400/60 uppercase tracking-[0.2em] mb-2">Vagas Disponíveis</h4>
                  <p className="text-3xl font-black text-white tracking-tight">
                    {event.max_capacity - (event.registration_count || 0)} / {event.max_capacity}
                  </p>
                </div>
              </motion.div>
            </section>
          </div>

          {/* Right Column: Registration Form */}
          {!regUpcoming && (
            <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 md:p-10 sticky top-28 backdrop-blur-md"
            >
              <AnimatePresence mode="wait">
                {registrationSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-10"
                  >
                    <div className="w-20 h-20 bg-yellow-400/10 text-yellow-400 rounded-3xl flex items-center justify-center mb-8 mx-auto shadow-lg border border-yellow-400/10">
                      <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Inscrição Confirmada!</h2>
                    <p className="text-slate-400 mb-10 font-bold text-lg leading-relaxed">Prepare-se! Seu lugar está garantido. Detalhes enviados para seu registro.</p>
                    <button
                      onClick={() => navigate('/')}
                      className="w-full py-5 bg-yellow-400 text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-yellow-300 transition-all shadow-xl shadow-yellow-400/20"
                    >
                      Voltar para o Início
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <h3 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">Inscrever-se</h3>
                    <p className="text-slate-400 font-bold mb-10 text-sm">Preencha os dados para confirmar participação.</p>

                    {event.max_capacity && event.max_capacity > 0 && (
                      <div className="mb-10 space-y-3">
                        <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          <span>Vagas Preenchidas</span>
                          <span className="text-yellow-400">{event.registration_count || 0} / {event.max_capacity}</span>
                        </div>
                        <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(((event.registration_count || 0) / event.max_capacity) * 100, 100)}%` }}
                            className={`h-full transition-all duration-1000 ${
                              (event.registration_count || 0) >= event.max_capacity ? 'bg-red-500' : 'bg-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)]'
                            }`}
                          />
                        </div>
                      </div>
                    )}

                    {event.max_capacity && event.max_capacity > 0 && (event.registration_count || 0) >= event.max_capacity && profile?.role !== 'super_admin' ? (
                      <div className="text-center py-8">
                        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                          <AlertTriangle size={40} />
                        </div>
                        <h4 className="text-2xl font-black text-white mb-3 tracking-tight">Vagas Esgotadas</h4>
                        <p className="text-slate-400 font-bold mb-8 leading-relaxed">
                          Infelizmente todas as vagas já foram preenchidas.
                        </p>
                        <button
                          onClick={() => navigate('/')}
                          className="w-full bg-slate-800 text-white font-black py-4 rounded-2xl hover:bg-slate-700 transition-all border border-slate-700"
                        >
                          Voltar ao Início
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleRegister} className="space-y-6">
                      {event.max_capacity && event.max_capacity > 0 && (event.registration_count || 0) >= event.max_capacity && profile?.role === 'super_admin' && (
                        <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm font-bold border border-red-500/20 mb-4 inline-flex items-center gap-2">
                          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                          <p>
                            <strong>Aviso de Admin:</strong> O limite de vagas deste evento foi atingido. 
                            Como você é um Administrador Master, você pode inscrever o aluno manualmente 
                            (as demais regras ainda serão validadas).
                          </p>
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Participante</label>
                        <select
                          required
                          className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all text-white font-bold appearance-none shadow-inner"
                          value={participantType}
                          onChange={(e) => setParticipantType(e.target.value as any)}
                        >
                          <option value="student" className="bg-slate-900">Aluno</option>
                          <option value="collaborator" className="bg-slate-900">Colaborador</option>
                          <option value="responsible" className="bg-slate-900">Responsável</option>
                          <option value="other" className="bg-slate-900">Outro</option>
                        </select>
                      </div>

                      {/* Custom Form Fields */}
                      {((event.form_fields as any[]) || []).map((field) => (
                        <div key={field.id} className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            {field.label} {field.required && <span className="text-yellow-400">*</span>}
                          </label>
                          {(() => {
                            const fieldKey = field.label.toLowerCase();
                            const commonClasses = "w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all text-white font-bold placeholder:text-slate-600 shadow-inner";
                            const isNameField = fieldKey === 'nome' || fieldKey === 'nome completo';
                            
                            if (isNameField && participantType === 'student' && event.enable_autocomplete !== false) {
                              return (
                                <div className="relative">
                                  <input
                                    type="text"
                                    required={field.required}
                                    placeholder={`Digite seu nome completo...`}
                                    autoComplete="off"
                                    className={commonClasses}
                                    value={formData[fieldKey] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormData({ ...formData, [fieldKey]: val });
                                      
                                      if (val.length >= 3) {
                                        const matches = allStudents.filter(s => {
                                          const fullName = `${s.name || ''} ${s.surname || ''}`.toLowerCase();
                                          return fullName.includes(val.toLowerCase());
                                        }).slice(0, 5);
                                        setSuggestions(matches);
                                        setShowSuggestions(true);
                                      } else {
                                        setSuggestions([]);
                                        setShowSuggestions(false);
                                      }
                                    }}
                                    onFocus={() => {
                                      if (formData[fieldKey]?.length >= 3 && suggestions.length > 0) {
                                        setShowSuggestions(true);
                                      }
                                    }}
                                  />
                                  {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
                                      {suggestions.map(student => (
                                        <button
                                          key={student.id}
                                          type="button"
                                          className="w-full text-left px-5 py-4 text-white hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-0"
                                          onClick={() => {
                                            const studentFullName = `${student.name || ''} ${student.surname || ''}`.trim();
                                            const newFormData = { ...formData, [fieldKey]: studentFullName };
                                            
                                            // Autofill grade if exists
                                            const gradeField = event.form_fields?.find((f: any) => 
                                              f.label.toLowerCase().includes('série') || 
                                              f.label.toLowerCase().includes('ano')
                                            );
                                            
                                            if (gradeField && student.grade) {
                                              newFormData[gradeField.label.toLowerCase()] = student.grade;
                                              setSelectedStudentGrade(student.grade);
                                            }
                                            
                                            // Autofill other fields
                                            const surnameField = event.form_fields?.find((f: any) => f.label.toLowerCase() === 'sobrenome');
                                            if (surnameField && student.surname) {
                                              newFormData['sobrenome'] = student.surname;
                                            }
                                            
                                            const classField = event.form_fields?.find((f: any) => f.label.toLowerCase() === 'turma');
                                            if (classField && student.class) {
                                              newFormData['turma'] = student.class;
                                            }
                                            
                                            setFormData(newFormData);
                                            setSelectedStudentId(student.id);
                                            setShowSuggestions(false);
                                          }}
                                        >
                                          <div className="font-bold">{student.name} {student.surname}</div>
                                          <div className="text-xs text-slate-400 mt-1">
                                            {student.grade} • Turma {student.class}
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            }
 
                            switch (field.type) {
                              case 'textarea':
                                return (
                                  <textarea
                                    required={field.required}
                                    rows={4}
                                    placeholder={`Sua resposta...`}
                                    className={commonClasses}
                                    value={formData[fieldKey] || ''}
                                    onChange={(e) => setFormData({ ...formData, [fieldKey]: e.target.value })}
                                  />
                                );
                              case 'select':
                                return (
                                  <select
                                    required={field.required}
                                    className={`${commonClasses} appearance-none`}
                                    value={formData[fieldKey] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormData({ ...formData, [fieldKey]: val });
                                      if (fieldKey.includes('série') || fieldKey.includes('ano')) {
                                        setSelectedStudentGrade(val);
                                      }
                                    }}
                                  >
                                    <option value="" className="bg-slate-900">Selecione...</option>
                                    {field.options?.map((opt: string) => (
                                      <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
                                    ))}
                                  </select>
                                );
                              default: // text
                                return (
                                  <input
                                    type="text"
                                    required={field.required}
                                    placeholder={`Seu(a) ${field.label.toLowerCase()}...`}
                                    className={commonClasses}
                                    value={formData[fieldKey] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormData({ ...formData, [fieldKey]: val });
                                      if (fieldKey.includes('série') || fieldKey.includes('ano')) {
                                        setSelectedStudentGrade(val);
                                      }
                                    }}
                                  />
                                );
                            }
                          })()}
                        </div>
                      ))}
 
                      {restrictionError && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold flex items-start gap-3"
                        >
                          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" /> 
                          <p>{restrictionError}</p>
                        </motion.div>
                      )}
 
                      {event.password_protected && (
                        <div className="space-y-3 pt-6 border-t border-slate-800">
                          <label className="text-[10px] font-black text-yellow-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                            <Lock size={14} /> Senha do Evento
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="Digite a senha..."
                            className={`w-full px-5 py-4 bg-slate-950 border rounded-2xl focus:outline-none focus:ring-2 transition-all font-bold ${
                              passwordError ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-800 focus:ring-yellow-400/50 focus:border-yellow-400'
                            }`}
                            value={eventPassword}
                            onChange={(e) => {
                              setEventPassword(e.target.value);
                              setPasswordError(false);
                            }}
                          />
                          {passwordError && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">Senha incorreta</p>}
                        </div>
                      )}
                      
                      {isGradeInvalid && (
                        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold flex items-center gap-3">
                          <AlertTriangle size={18} />
                          Este aluno pertence ao ano escolar "{selectedStudentGrade}", mas o evento é restrito aos anos: {restrictions.values?.join(', ')}
                        </div>
                      )}

                      {event.is_paid === 1 && (
                        <div className="p-5 bg-yellow-500/10 border-2 border-yellow-500/20 rounded-2xl text-yellow-400 text-sm font-bold space-y-3">
                          <div className="flex items-center gap-3">
                            <AlertTriangle size={24} className="text-yellow-400" />
                            <span className="uppercase tracking-wider font-black text-xs">Atividade Paga</span>
                          </div>
                          <p className="leading-relaxed text-xs">
                            Atenção: Esta é uma atividade paga. Confirme a aceitação dos termos de cobrança no checkbox abaixo para prosseguir.
                          </p>
                          <label className="flex items-start gap-3 mt-4 cursor-pointer text-white">
                            <input
                              type="checkbox"
                              className="mt-1 w-5 h-5 rounded bg-slate-950 border-slate-800 text-yellow-400 focus:ring-yellow-400"
                              checked={paymentAccepted}
                              onChange={(e) => setPaymentAccepted(e.target.checked)}
                            />
                            <span className="text-xs font-bold leading-tight select-none">
                              Confirmo que estou ciente de que esta atividade é paga e concordo com a cobrança.
                            </span>
                          </label>
                        </div>
                      )}
                      
                      {event.limitar_vagas_por_ano === 1 && event.vagas_por_ano && (
                        <div className="p-5 bg-blue-500/10 border-2 border-blue-500/20 rounded-2xl text-blue-400 text-sm font-bold space-y-2">
                          <div className="flex items-center gap-3">
                            <Users size={18} className="text-blue-400" />
                            <span className="uppercase tracking-wider font-black text-xs">Vagas Limitadas por Ano</span>
                          </div>
                          <div className="space-y-1.5 leading-relaxed text-xs text-slate-300">
                            <p>Este evento possui limite de vagas independente por ano escolar:</p>
                            <ul className="list-disc list-inside pl-1 text-[11px] font-black text-blue-300 grid grid-cols-2 gap-1">
                              {(() => {
                                try {
                                  const limits = typeof event.vagas_por_ano === 'string'
                                    ? JSON.parse(event.vagas_por_ano)
                                    : event.vagas_por_ano;
                                  return Object.entries(limits || {}).map(([grade, val]) => (
                                    <li key={grade} className="truncate">{grade}: {val} vagas</li>
                                  ));
                                } catch {
                                  return null;
                                }
                              })()}
                            </ul>
                          </div>
                        </div>
                      )}
 
                      {error && (
                        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold flex items-center gap-3">
                          <AlertTriangle size={18} /> {error}
                        </div>
                      )}
 
                      <button
                        type="submit"
                        disabled={isSubmitDisabled}
                        className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-[0.2em] text-xs py-5 px-10 rounded-2xl transition-all flex items-center justify-center gap-4 shadow-lg shadow-yellow-400/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100"
                      >
                        {isRegistering ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 size={20} />
                            Confirmar Inscrição
                          </>
                        )}
                      </button>
                      </form>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
          )}
        </div>
      </div>

      {/* Participants List Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-slate-900/40 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-slate-800 shadow-2xl"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
            <h2 className="text-2xl md:text-4xl font-black text-white flex items-center gap-4">
              <div className="w-1.5 h-10 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)]"></div>
              Participantes Inscritos
            </h2>
            <div className="bg-slate-950 px-6 py-3 rounded-2xl border border-slate-800 flex items-center gap-3">
              <Users size={20} className="text-yellow-400" />
              <span className="text-white font-black text-lg">{eventParticipants.length}</span>
              <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Inscritos</span>
            </div>
          </div>

          {/* Search Bar - New Row for Maximum Visibility */}
          <div className="mb-8 relative group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-500 group-focus-within:text-yellow-400 transition-colors">
              <Send size={20} className="rotate-90" />
            </div>
            <input
              type="text"
              placeholder="PESQUISAR SEU NOME NA LISTA..."
              className="w-full bg-slate-950/80 border-2 border-slate-800 rounded-[1.5rem] pl-16 pr-6 py-5 text-white font-black placeholder:text-slate-700 focus:outline-none focus:border-yellow-400/50 focus:ring-4 focus:ring-yellow-400/10 transition-all text-sm tracking-widest uppercase"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="space-y-3">
            {(() => {
              const filtered = eventParticipants.filter(reg => {
                const student = reg.students;
                const name = (student ? `${student.name} ${student.surname || ''}`.trim() : (reg.form_data?.nome || reg.form_data?.['nome completo'] || reg.form_data?.Name || reg.form_data?.name || '')).toLowerCase();
                const term = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const nameNorm = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return nameNorm.includes(term);
              });

              if (filtered.length > 0) {
                return filtered.map((reg, idx) => {
                const student = reg.students;
                const name = student ? `${student.name} ${student.surname || ''}`.trim() : (reg.form_data?.nome || reg.form_data?.['nome completo'] || reg.form_data?.Name || reg.form_data?.name);
                const grade = student?.grade || reg.form_data?.série || reg.form_data?.ano || reg.form_data?.Grade;
                
                return (
                  <motion.div
                    key={reg.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="p-5 bg-slate-950/50 border border-slate-800 rounded-2xl flex items-center gap-6 group hover:border-yellow-400/30 transition-all"
                  >
                    <div className="w-12 h-12 bg-yellow-400/10 text-yellow-400 rounded-xl flex items-center justify-center font-black text-lg border border-yellow-400/10 group-hover:scale-110 transition-transform">
                      {name?.[0] || 'P'}
                    </div>
                    <div className="flex-grow">
                      <p className="text-white font-black text-lg tracking-tight">{name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {grade || 'Participante'}
                        </span>
                        <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {reg.students?.class || 'Inscrito'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/5 text-green-500 rounded-xl border border-green-500/10">
                      <CheckCircle2 size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Confirmado</span>
                    </div>
                  </motion.div>
                );
              });
              } else if (searchTerm) {
                return (
                  <div className="py-20 text-center bg-slate-950/30 rounded-3xl border border-dashed border-slate-800">
                    <AlertTriangle size={48} className="mx-auto text-yellow-400/50 mb-4" />
                    <p className="text-slate-500 font-bold text-lg">Nenhum participante encontrado com "{searchTerm}"</p>
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="mt-4 text-yellow-400 font-black uppercase text-[10px] tracking-widest hover:underline"
                    >
                      Limpar busca
                    </button>
                  </div>
                );
              } else {
                return (
                  <div className="py-20 text-center bg-slate-950/30 rounded-3xl border border-dashed border-slate-800">
                    <Users size={48} className="mx-auto text-slate-800 mb-4" />
                    <p className="text-slate-500 font-bold text-lg">Ninguém se inscreveu ainda. Seja o primeiro!</p>
                  </div>
                );
              }
            })()}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
