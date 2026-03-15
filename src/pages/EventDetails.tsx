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
      // This is much safer for high concurrency
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#0054A6] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!event) return (
    <div className="min-h-screen flex items-center justify-center flex-col p-4">
      <AlertTriangle size={48} className="text-red-500 mb-4" />
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Evento não encontrado</h2>
      <button onClick={() => navigate('/')} className="text-[#0054A6] font-bold hover:underline">Voltar para o início</button>
    </div>
  );

  return (
    <div className="pb-20">
      {/* Hero Header */}
      <div className="relative h-[300px] md:h-[450px] bg-slate-900">
        <img
          src={event.image_url || `https://picsum.photos/seed/${event.id}/1920/1080`}
          alt={event.name}
          className="w-full h-full object-cover opacity-60"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={() => navigate('/')}
              className="mb-6 flex items-center gap-2 text-white/80 hover:text-white font-medium transition-colors"
            >
              <ChevronLeft size={20} /> Voltar
            </button>
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="bg-[#FFD700] text-[#0054A6] text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">
                {category?.name || 'Evento'}
              </span>
              {event.password_protected && (
                <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Lock size={12} /> Protegido
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight max-w-4xl">
              {event.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <div className="w-1.5 h-8 bg-[#0054A6] rounded-full"></div>
                Sobre o Evento
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed text-lg">
                {event.description}
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                <div className="w-12 h-12 bg-[#0054A6]/5 rounded-xl flex items-center justify-center text-[#0054A6]">
                  <Calendar size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Data e Hora</h4>
                  <p className="text-slate-900 font-bold">
                    {format(new Date(event.start_date), "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="text-slate-500 font-medium">
                    {event.start_time} às {event.end_time}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                <div className="w-12 h-12 bg-[#0054A6]/5 rounded-xl flex items-center justify-center text-[#0054A6]">
                  <Users size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Público Alvo</h4>
                  <p className="text-slate-900 font-bold">
                    {(event.restrictions as any).type === 'all' ? 'Aberto para todos' : 'Restrito'}
                  </p>
                  {(event.restrictions as any).type !== 'all' && (
                    <p className="text-slate-500 font-medium line-clamp-1">
                      {(event.restrictions as any).values.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Registration Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sticky top-24">
              <AnimatePresence mode="wait">
                {registrationSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Inscrição Realizada!</h3>
                    <p className="text-slate-500 font-medium mb-8">
                      Sua participação no evento foi confirmada com sucesso.
                    </p>
                    <button
                      onClick={() => navigate('/')}
                      className="w-full bg-[#0054A6] text-white font-bold py-4 rounded-2xl hover:bg-[#004080] transition-all"
                    >
                      Voltar para o Início
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Inscrever-se</h3>
                    <p className="text-slate-500 font-medium mb-4">Preencha os dados abaixo para participar.</p>

                    {event.max_capacity && event.max_capacity > 0 && (
                      <div className="mb-6 space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500">
                          <span>Vagas Preenchidas</span>
                          <span>{event.registration_count || 0} / {event.max_capacity}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              (event.registration_count || 0) >= event.max_capacity ? 'bg-red-500' : 'bg-[#0054A6]'
                            }`}
                            style={{ width: `${Math.min(((event.registration_count || 0) / event.max_capacity) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {event.max_capacity && event.max_capacity > 0 && (event.registration_count || 0) >= event.max_capacity ? (
                      <div className="text-center py-6">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <AlertTriangle size={32} />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 mb-2">Vagas Esgotadas</h4>
                        <p className="text-sm text-slate-500 font-medium mb-6">
                          Infelizmente todas as vagas já foram preenchidas.
                        </p>
                        <button
                          onClick={() => navigate('/')}
                          className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all"
                        >
                          Ver outros eventos
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleRegister} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Tipo de Participante</label>
                        <select
                          required
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] transition-all"
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
                          <label className="text-sm font-bold text-slate-700">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          {field.type === 'text' ? (
                            <input
                              type="text"
                              required={field.required}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] transition-all"
                              onChange={(e) => setFormData({ ...formData, [field.label.toLowerCase()]: e.target.value })}
                            />
                          ) : (
                            <select
                              required={field.required}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] transition-all"
                              onChange={(e) => setFormData({ ...formData, [field.label.toLowerCase()]: e.target.value })}
                            >
                              <option value="">Selecione...</option>
                              {field.options?.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}

                      {restrictionError && (
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs font-bold flex items-start gap-2">
                          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> 
                          <p>{restrictionError}</p>
                        </div>
                      )}

                      {event.password_protected && (
                        <div className="space-y-2 pt-4 border-t border-slate-100">
                          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Lock size={16} className="text-[#0054A6]" /> Senha do Evento
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="Digite a senha para se inscrever"
                            className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 transition-all ${
                              passwordError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-[#0054A6]'
                            }`}
                            value={eventPassword}
                            onChange={(e) => {
                              setEventPassword(e.target.value);
                              setPasswordError(false);
                            }}
                          />
                          {passwordError && <p className="text-xs font-bold text-red-500">Senha incorreta.</p>}
                        </div>
                      )}

                      {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                          <AlertTriangle size={14} /> {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isRegistering}
                        className="w-full bg-[#0054A6] text-white font-bold py-4 rounded-2xl hover:bg-[#004080] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isRegistering ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Send size={18} /> Confirmar Inscrição
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
