import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Event, Category } from '../types';
import { Calendar, Clock, Tag, Users, ShieldCheck, ChevronLeft, Send, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Registration Form State
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [participantType, setParticipantType] = useState<'student' | 'collaborator' | 'responsible' | 'other'>('student');
  const [eventPassword, setEventPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [restrictionError, setRestrictionError] = useState<string | null>(null);

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
  }, [id]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !id) return;

    // Time restriction check
    const isTest = event.name.toLowerCase().includes('teste') || category?.name.toLowerCase().includes('teste');
    if (!isTest) {
      const startDateTime = new Date(`${event.start_date}T${event.start_time}`);
      const now = new Date();
      if (now < startDateTime) {
        setRestrictionError(`As inscrições para este evento só abrem em ${format(startDateTime, "dd/MM 'às' HH:mm", { locale: ptBR })}`);
        return;
      }
    }

    // Extract student info from formData for the database
    const sName = formData['nome'] || formData['name'] || '';
    const sSurname = formData['sobrenome'] || formData['surname'] || '';
    const sGrade = formData['série'] || formData['grade'] || formData['ano'] || '';
    const sClass = formData['turma'] || formData['class'] || '';

    const restrictions = event.restrictions as any;

    // Check restrictions
    if (restrictions.type === 'years' && !restrictions.values.includes(sGrade)) {
      setRestrictionError(`Este evento é restrito aos anos: ${restrictions.values.join(', ')}`);
      return;
    }
    if (restrictions.type === 'classes' && !restrictions.values.includes(sClass)) {
      setRestrictionError(`Este evento é restrito às turmas: ${restrictions.values.join(', ')}`);
      return;
    }
    if (restrictions.type === 'collaborators' && participantType !== 'collaborator') {
      setRestrictionError(`Este evento é restrito apenas para colaboradores.`);
      return;
    }

    // Check password if protected
    if (event.password_protected && event.password !== eventPassword) {
      setPasswordError(true);
      return;
    }

    setIsRegistering(true);
    setError(null);
    setRestrictionError(null);

    try {
      // Use the atomic RPC to handle registration in one go
      const { data, error: rpcError } = await supabase.rpc('register_participant', {
        p_event_id: id,
        p_student_name: sName,
        p_student_surname: sSurname,
        p_student_grade: sGrade,
        p_student_class: sClass,
        p_participant_type: participantType,
        p_form_data: formData
      });

      if (rpcError) throw rpcError;

      if (!data.success) {
        setError(data.error);
        setIsRegistering(false);
        return;
      }

      setRegistrationSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError("Erro ao processar inscrição. Tente novamente.");
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center transition-colors">
      <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!event) return (
    <div className="min-h-screen bg-black flex items-center justify-center flex-col p-4 transition-colors">
      <AlertTriangle size={48} className="text-red-500 mb-4" />
      <h2 className="text-2xl font-black text-white mb-2">Evento não encontrado</h2>
      <button onClick={() => navigate('/')} className="text-yellow-500 font-bold hover:underline">Voltar para o início</button>
    </div>
  );

  return (
    <div className="pb-20 bg-black text-white">
      {/* Hero Header */}
      <div className="relative h-[400px] md:h-[600px] bg-black">
        <img
          src={event.image_url || `https://picsum.photos/seed/${event.id}/1920/1080`}
          alt={event.name}
          className="w-full h-full object-cover opacity-50"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-7xl mx-auto">
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => navigate('/')}
              className="mb-8 flex items-center gap-2 text-white/60 hover:text-yellow-500 font-bold transition-all"
            >
              <ChevronLeft size={20} /> Voltar para o início
            </motion.button>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-3 mb-6"
            >
              <span className="bg-yellow-500 text-black text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                {category?.name || 'Evento'}
              </span>
              {event.password_protected && (
                <span className="bg-white/10 backdrop-blur-md text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10">
                  <Lock size={12} className="text-yellow-500" /> Protegido
                </span>
              )}
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-7xl font-black text-white leading-[1.1] max-w-5xl tracking-tight"
            >
              {event.name}
            </motion.h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-16">
            <section className="bg-[#0A0A0A]/80 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <h2 className="text-3xl font-black text-white mb-8 flex items-center gap-4">
                <div className="w-2 h-10 bg-yellow-500 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
                Sobre o Evento
              </h2>
              <div className="prose prose-invert max-w-none text-slate-400 leading-relaxed text-xl font-medium">
                {event.description}
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#0A0A0A]/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 shadow-xl flex items-start gap-6 transition-all hover:border-yellow-500/20 group">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
                  <Calendar size={32} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-yellow-500/50 uppercase tracking-[0.2em] mb-2">Data e Hora</h4>
                  <p className="text-white text-2xl font-black">
                    {(() => {
                      try {
                        return format(new Date(event.start_date), "dd 'de' MMMM", { locale: ptBR });
                      } catch (e) {
                        return event.start_date;
                      }
                    })()}
                  </p>
                  <p className="text-slate-400 text-lg font-bold mt-1">
                    {event.start_time} às {event.end_time}
                  </p>
                </div>
              </div>

              <div className="bg-[#0A0A0A]/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 shadow-xl flex items-start gap-6 transition-all hover:border-blue-500/20 group">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <Users size={32} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-blue-400/50 uppercase tracking-[0.2em] mb-2">Público Alvo</h4>
                  <p className="text-white text-2xl font-black line-clamp-1">
                    {(event.restrictions as any).type === 'all' ? 'Aberto para todos' : 'Público Restrito'}
                  </p>
                  {(event.restrictions as any).type !== 'all' && (
                    <p className="text-slate-400 text-lg font-bold mt-1 line-clamp-1">
                      {(event.restrictions as any).values.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Registration Form */}
          <div className="lg:col-span-1">
            <div className="bg-[#0A0A0A] rounded-[2.5rem] border border-white/5 shadow-2xl p-10 sticky top-28 transition-all hover:border-yellow-500/10">
              <AnimatePresence mode="wait">
                {registrationSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                      <CheckCircle2 size={48} />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-4">Inscrição Realizada!</h3>
                    <p className="text-slate-400 font-bold mb-10 text-lg leading-relaxed">
                      Sua participação no evento foi confirmada com sucesso.
                    </p>
                    <button
                      onClick={() => navigate('/')}
                      className="w-full bg-yellow-500 text-black font-black py-5 rounded-2xl hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] text-xl"
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
                    <h3 className="text-3xl font-black text-white mb-3">Inscrever-se</h3>
                    <p className="text-slate-500 font-bold mb-8">Preencha os dados abaixo para participar.</p>

                    {event.max_capacity && event.max_capacity > 0 && (
                      <div className="mb-10 space-y-3">
                        <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                          <span>Vagas Preenchidas</span>
                          <span className="text-yellow-500">{event.registration_count || 0} / {event.max_capacity}</span>
                        </div>
                        <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(((event.registration_count || 0) / event.max_capacity) * 100, 100)}%` }}
                            className={`h-full transition-all duration-1000 ${
                              (event.registration_count || 0) >= event.max_capacity ? 'bg-red-500' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]'
                            }`}
                          />
                        </div>
                      </div>
                    )}

                    {event.max_capacity && event.max_capacity > 0 && (event.registration_count || 0) >= event.max_capacity ? (
                      <div className="text-center py-8">
                        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                          <AlertTriangle size={40} />
                        </div>
                        <h4 className="text-2xl font-black text-white mb-3">Vagas Esgotadas</h4>
                        <p className="text-slate-400 font-bold mb-8">
                          Infelizmente todas as vagas já foram preenchidas.
                        </p>
                        <button
                          onClick={() => navigate('/')}
                          className="w-full bg-white/5 text-white font-black py-4 rounded-2xl hover:bg-white/10 transition-all border border-white/10"
                        >
                          Ver outros eventos
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleRegister} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tipo de Participante</label>
                        <select
                          required
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-white font-bold appearance-none"
                          value={participantType}
                          onChange={(e) => setParticipantType(e.target.value as any)}
                        >
                          <option value="student">Aluno</option>
                          <option value="collaborator">Colaborador</option>
                          <option value="responsible">Responsável</option>
                          <option value="other">Outro</option>
                        </select>
                      </div>

                      {/* Custom Form Fields */}
                      {(event.form_fields as any[]).map((field) => (
                        <div key={field.id} className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            {field.label} {field.required && <span className="text-yellow-500">*</span>}
                          </label>
                          {field.type === 'text' ? (
                            <input
                              type="text"
                              required={field.required}
                              placeholder={`Seu ${field.label.toLowerCase()}`}
                              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-white font-bold placeholder:text-slate-700"
                              onChange={(e) => setFormData({ ...formData, [field.label.toLowerCase()]: e.target.value })}
                            />
                          ) : (
                            <select
                              required={field.required}
                              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-white font-bold appearance-none"
                              onChange={(e) => setFormData({ ...formData, [field.label.toLowerCase()]: e.target.value })}
                            >
                              <option value="">Selecione o(a) {field.label.toLowerCase()}</option>
                              {field.options?.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}

                      {restrictionError && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold flex items-start gap-3"
                        >
                          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" /> 
                          <p>{restrictionError}</p>
                        </motion.div>
                      )}

                      {event.password_protected && (
                        <div className="space-y-3 pt-6 border-t border-white/5">
                          <label className="text-xs font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2">
                            <Lock size={14} /> Senha de Acesso
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="Digite a senha do evento"
                            className={`w-full px-5 py-4 bg-white/5 border rounded-2xl focus:outline-none focus:ring-2 transition-all font-bold ${
                              passwordError ? 'border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:ring-yellow-500/50 focus:border-yellow-500'
                            }`}
                            value={eventPassword}
                            onChange={(e) => {
                              setEventPassword(e.target.value);
                              setPasswordError(false);
                            }}
                          />
                          {passwordError && <p className="text-xs font-black text-red-500 uppercase tracking-widest">Senha incorreta</p>}
                        </div>
                      )}

                      {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold flex items-center gap-3">
                          <AlertTriangle size={18} /> {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isRegistering}
                        className="w-full bg-yellow-500 text-black font-black py-5 rounded-2xl hover:bg-yellow-400 transition-all shadow-[0_0_30px_rgba(234,179,8,0.3)] flex items-center justify-center gap-3 disabled:opacity-50 text-xl mt-4"
                      >
                        {isRegistering ? (
                          <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Send size={22} /> Confirmar Inscrição
                          </>
                        )}
                      </button>
                    </form>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
