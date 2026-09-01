import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Event, Category, FormField, EventTemplate } from '../types';
import { Plus, Trash2, Edit2, X, Check, Calendar, Clock, FileText, ShieldCheck, List, ChevronDown, ChevronUp, Users, Lock, Copy, Bookmark, Sparkles, TrendingUp, AlertTriangle, QrCode, Download, UploadCloud, Loader2, CheckCircle2, Search, Eye, EyeOff } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { GRADES, CLASSES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { getEventImage } from '../utils/getEventImage';
import { safeFormatDate } from '../utils/formatDate';

export default function AdminEvents() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    confirmColor?: string;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [qrEvent, setQrEvent] = useState<Event | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('all');
  const [adminDayFilter, setAdminDayFilter] = useState('all');
  const [adminSelectedGrades, setAdminSelectedGrades] = useState<string[]>([]);

  // Form State
  const [formData, setFormData] = useState<Partial<Event>>({
    name: '',
    category_id: '',
    subcategory_id: '',
    description: '',
    image_url: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    duration: '',
    restrictions: { type: 'all', values: [] },
    password_protected: false,
    password: '',
    max_capacity: 0,
    form_fields: [],
    enable_autocomplete: true,
    is_paid: 0,
    restringir_duplicidade: 0,
    limitar_vagas_por_ano: 0,
    vagas_por_ano: undefined,
    is_hidden: 0,
    limitar_vagas_genero: 0,
    vagas_masculino: 0,
    vagas_feminino: 0
  });

  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const fetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchData = async (isBackground = false) => {
    try {
      if (isBackground) setBackgroundLoading(true);
      else setLoading(true);

      const [eventsRes, catsRes, tempsRes] = await Promise.all([
        supabase.from('events').select('*').order('name', { ascending: true }),
        supabase.from('categories').select('*, subcategories(*)').order('name', { ascending: true }),
        supabase.from('event_templates').select('*').order('name', { ascending: true })
      ]);

      if (eventsRes.error) console.error("Error fetching events:", eventsRes.error);
      if (catsRes.error) console.error("Error fetching categories:", catsRes.error);
      if (tempsRes.error) console.error("Error fetching templates:", tempsRes.error);

      if (eventsRes.data) setEvents(eventsRes.data as Event[]);
      if (catsRes.data) setCategories(catsRes.data as Category[]);
      if (tempsRes.data) setTemplates(tempsRes.data as EventTemplate[]);
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
      setBackgroundLoading(false);
    }
  };

  const activeDays = React.useMemo(() => {
    const daysSet = new Set<string>();
    const ptDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    events.forEach(event => {
      if (event.restringir_dias === 1 && event.dias_semana) {
        let list: string[] = [];
        if (Array.isArray(event.dias_semana)) {
          list = event.dias_semana;
        } else if (typeof event.dias_semana === 'string') {
          try { list = JSON.parse(event.dias_semana); } catch { list = []; }
        }
        list.forEach(day => daysSet.add(day));
      } else if (event.start_date) {
        try {
          const [y, m, d] = event.start_date.split('-').map(Number);
          const date = new Date(y, m - 1, d);
          daysSet.add(ptDays[date.getDay()]);
        } catch(e) {}
      }
    });
    return Array.from(daysSet).sort((a, b) => ptDays.indexOf(a) - ptDays.indexOf(b));
  }, [events]);

  useEffect(() => {
    fetchData();

    const debouncedFetch = () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        fetchData(true);
      }, 1200); // 1.2s debounce
    };

    const eventsChannel = supabase.channel('events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, debouncedFetch)
      .subscribe();

    const categoriesChannel = supabase.channel('categories_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, debouncedFetch)
      .subscribe();

    const templatesChannel = supabase.channel('templates_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_templates' }, debouncedFetch)
      .subscribe();

    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(templatesChannel);
    };
  }, []);

  const handleOpenModal = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      
      let diasSemanaParsed: string[] = [];
      if (event.dias_semana) {
        if (Array.isArray(event.dias_semana)) {
          diasSemanaParsed = event.dias_semana;
        } else if (typeof event.dias_semana === 'string') {
          try {
            diasSemanaParsed = JSON.parse(event.dias_semana);
          } catch (e) {
            diasSemanaParsed = [];
          }
        }
      }

      let vagasPorAnoParsed: any = undefined;
      const eventVagasPorAno = (event as any).vagas_por_ano;
      if (eventVagasPorAno) {
        if (typeof eventVagasPorAno === 'object') {
          vagasPorAnoParsed = eventVagasPorAno;
        } else if (typeof eventVagasPorAno === 'string') {
          try {
            vagasPorAnoParsed = JSON.parse(eventVagasPorAno);
          } catch (e) {
            vagasPorAnoParsed = undefined;
          }
        }
      }

      setFormData({
        ...event,
        dias_semana: diasSemanaParsed,
        limitar_vagas_por_ano: (event as any).limitar_vagas_por_ano || 0,
        vagas_por_ano: vagasPorAnoParsed,
        restringir_dias: event.restringir_dias || 0,
        registration_open_at: event.registration_open_at || '',
        countdown_target_at: event.countdown_target_at || '',
        is_hidden: event.is_hidden || 0,
        limitar_vagas_genero: event.limitar_vagas_genero || 0,
        vagas_masculino: event.vagas_masculino || 0,
        vagas_feminino: event.vagas_feminino || 0
      });
    } else {
      setEditingEvent(null);
      setFormData({
        name: '',
        category_id: categories[0]?.id || '',
        subcategory_id: '',
        description: '',
        image_url: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        duration: '',
        restrictions: { type: 'all', values: [] },
        password_protected: false,
        password: '',
        max_capacity: 0,
        form_fields: [],
        enable_autocomplete: true,
        is_paid: 0,
        restringir_duplicidade: 0,
        restringir_dias: 0,
        dias_semana: [],
        limitar_vagas_por_ano: 0,
        vagas_por_ano: undefined,
        registration_open_at: '',
        countdown_target_at: '',
        is_hidden: 0,
        limitar_vagas_genero: 0,
        vagas_masculino: 0,
        vagas_feminino: 0
      });
    }
    setIsModalOpen(true);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('events')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('events').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      if (formData.limitar_vagas_por_ano === 1) {
        const limitsObj = (typeof formData.vagas_por_ano === 'object' && formData.vagas_por_ano !== null)
          ? (formData.vagas_por_ano as Record<string, number>)
          : {};
        const totalDistributed = Object.values(limitsObj).reduce((sum, val) => sum + (val || 0), 0);
        const totalCapacity = formData.max_capacity || 0;

        if (totalCapacity > 0 && totalDistributed !== totalCapacity) {
          throw new Error(`A soma das vagas distribuídas por ano (${totalDistributed}) deve ser exatamente igual ao total de vagas do evento (${totalCapacity}).`);
        }
      }

      let finalImageUrl = formData.image_url;

      if (selectedImageFile) {
        finalImageUrl = await uploadImage(selectedImageFile);
      }

      const eventToSave = { ...formData, image_url: finalImageUrl };

      delete (eventToSave as any).id;
      delete (eventToSave as any).created_at;
      delete (eventToSave as any).registration_count;

      const cleanEventToSave: any = { ...eventToSave };
      if (cleanEventToSave.start_date === '') cleanEventToSave.start_date = null;
      if (cleanEventToSave.end_date === '') cleanEventToSave.end_date = null;
      if (cleanEventToSave.start_time === '') cleanEventToSave.start_time = null;
      if (cleanEventToSave.end_time === '') cleanEventToSave.end_time = null;
      cleanEventToSave.registration_open_at = null; // Always use start_date and start_time
      if (cleanEventToSave.countdown_target_at === '') cleanEventToSave.countdown_target_at = null;
      
      // Prevent Supabase "invalid input syntax for type uuid" error
      if (cleanEventToSave.category_id === '') cleanEventToSave.category_id = null;
      if (cleanEventToSave.subcategory_id === '') cleanEventToSave.subcategory_id = null;

      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(cleanEventToSave)
          .eq('id', editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('events')
          .insert({ ...cleanEventToSave, registration_count: 0 });
        if (error) throw error;
      }
      setIsModalOpen(false);
      setSelectedImageFile(null);
      setFeedback({ type: 'success', message: 'Evento salvo com sucesso!' });
      fetchData();
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.toLowerCase().includes('jwt')) {
        await supabase.auth.signOut();
        window.location.href = '/login';
        return;
      }
      setFeedback({ type: 'error', message: `Erro ao salvar: ${err.message || 'Tente novamente.'}` });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClone = (event: Event) => {
    setConfirmModal({
      show: true,
      title: 'Duplicar Evento',
      message: `Deseja criar uma cópia do evento "${event.name}"?`,
      confirmText: 'Sim, Duplicar',
      confirmColor: 'bg-amber-600 hover:bg-amber-700',
      onConfirm: async () => {
        try {
          const { id, registration_count, created_at, ...cloneData } = event as any;
          const { error } = await supabase
            .from('events')
            .insert({
              ...cloneData,
              name: `${cloneData.name} (Cópia)`,
              registration_count: 0
            });
          if (error) throw error;
          setFeedback({ type: 'success', message: 'Evento duplicado com sucesso!' });
          setConfirmModal(prev => ({ ...prev, show: false }));
        } catch (err) {
          console.error(err);
          setFeedback({ type: 'error', message: 'Erro ao duplicar evento.' });
        }
      }
    });
  };

  const handleSaveAsTemplate = (event: Event) => {
    setConfirmModal({
      show: true,
      title: 'Salvar como Modelo',
      message: `Deseja salvar o evento "${event.name}" como um modelo permanente?`,
      confirmText: 'Salvar Modelo',
      confirmColor: 'bg-green-600 hover:bg-green-700',
      onConfirm: async () => {
        try {
          const { id, registration_count, start_date, end_date, created_at, ...templateData } = event as any;
          const { error } = await supabase
            .from('event_templates')
            .insert(templateData);
          if (error) throw error;
          setFeedback({ type: 'success', message: 'Modelo salvo com sucesso!' });
          setConfirmModal(prev => ({ ...prev, show: false }));
        } catch (err) {
          console.error(err);
          setFeedback({ type: 'error', message: 'Erro ao salvar modelo.' });
        }
      }
    });
  };

  const handleUseTemplate = (template: EventTemplate) => {
    const { id, ...eventData } = template;
    setEditingEvent(null);
    setFormData({
      ...eventData,
      start_date: '',
      end_date: '',
      registration_count: 0
    } as any);
    setIsModalOpen(true);
    setShowTemplates(false);
  };

  const handleDeleteTemplate = (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Excluir Modelo',
      message: 'Deseja excluir este modelo permanentemente?',
      confirmText: 'Excluir',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      onConfirm: async () => {
        const { error } = await supabase.from('event_templates').delete().eq('id', id);
        if (error) console.error(error);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Excluir Evento',
      message: 'Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('events').delete().eq('id', id);
          if (error) throw error;
          setEvents(prev => prev.filter(e => e.id !== id));
          setFeedback({ type: 'success', message: 'Evento excluído permanentemente.' });
        } catch (err: any) {
          console.error(err);
          setFeedback({ type: 'error', message: 'Erro ao excluir evento.' });
        } finally {
          setConfirmModal(prev => ({ ...prev, show: false }));
        }
      }
    });
  };

  const handleToggleVisibility = async (event: Event) => {
    try {
      const newHiddenState = event.is_hidden === 1 ? 0 : 1;
      const { error } = await supabase
        .from('events')
        .update({ is_hidden: newHiddenState })
        .eq('id', event.id);
        
      if (error) throw error;
      
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, is_hidden: newHiddenState } : e));
      setFeedback({ type: 'success', message: newHiddenState === 1 ? 'Evento ocultado com sucesso!' : 'Evento visível com sucesso!' });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Erro ao alterar visibilidade do evento.' });
    }
  };

  const addFormField = () => {
    const newField: FormField = {
      id: Math.random().toString(36).substr(2, 9),
      label: '',
      type: 'text',
      required: false
    };
    setFormData(prev => ({ ...prev, form_fields: [...(prev.form_fields || []), newField] }));
  };

  const addPresetField = (preset: 'grade' | 'class' | 'name' | 'surname' | 'gender') => {
    let newField: FormField;

    if (preset === 'name' || preset === 'surname') {
      newField = {
        id: Math.random().toString(36).substr(2, 9),
        label: preset === 'name' ? 'Nome' : 'Sobrenome',
        type: 'text',
        required: true
      };
    } else if (preset === 'gender') {
      newField = {
        id: Math.random().toString(36).substr(2, 9),
        label: 'Gênero',
        type: 'select',
        required: true,
        options: ['Masculino', 'Feminino']
      };
    } else {
      newField = {
        id: Math.random().toString(36).substr(2, 9),
        label: preset === 'grade' ? 'Série' : 'Turma',
        type: 'select',
        required: true,
        options: preset === 'grade' ? GRADES : CLASSES
      };
    }

    setFormData(prev => ({ ...prev, form_fields: [...(prev.form_fields || []), newField] }));
  };

  const removeFormField = (id: string) => {
    setFormData(prev => ({ ...prev, form_fields: prev.form_fields?.filter(f => f.id !== id) || [] }));
  };

  const updateFormField = (id: string, updates: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      form_fields: prev.form_fields?.map(f => f.id === id ? { ...f, ...updates } : f) || []
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(234,179,8,0.3)]"></div>
        <p className="text-slate-300 font-bold">Carregando eventos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 bg-[#020617]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">Gerenciar Eventos</h1>
          <p className="text-sm md:text-base text-slate-300 font-bold">Crie, edite e acompanhe todos os eventos escolares.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex items-center gap-3 md:gap-4">
          <button
            onClick={() => setShowTemplates(true)}
            className="flex-grow sm:flex-none bg-slate-900 text-slate-400 px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest hover:bg-slate-800 transition-all border border-slate-800 flex items-center justify-center gap-3 shadow-lg"
          >
            <Bookmark size={18} className="text-yellow-400" /> Modelos
          </button>
          <button
            onClick={() => handleOpenModal()}
            disabled={profile?.status !== 'approved'}
            className="flex-grow sm:flex-none flex items-center justify-center gap-3 px-6 md:px-8 py-3 md:py-4 bg-yellow-400 text-black font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl md:rounded-2xl hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale"
          >
            <Plus size={18} /> Novo Evento
          </button>
        </div>
      </div>

      {profile?.status !== 'approved' && (
        <div className="p-8 bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 text-amber-400 shadow-xl shadow-amber-500/5 mb-10">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/10">
            <ShieldCheck size={32} />
          </div>
          <div className="flex-grow text-center md:text-left">
            <h3 className="text-xl font-black text-white mb-1">Criação Bloqueada</h3>
            <p className="font-bold text-slate-300 leading-relaxed">
              Sua conta ainda não foi aprovada por um Super Admin. Por razões de segurança, a criação e edição de eventos só é permitida para usuários com status <span className="text-amber-400 uppercase">Aprovado</span>.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 mb-10">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-400" size={20} />
            <input
              type="text"
              placeholder="Pesquisar por nome ou descrição..."
              className="w-full pl-12 pr-6 py-4 bg-slate-900 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400 transition-all text-white font-bold placeholder:text-slate-500 shadow-2xl"
              value={adminSearchTerm}
              onChange={(e) => setAdminSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap md:flex-nowrap gap-4">
            <div className="relative">
              <select
                className="w-full md:w-56 px-6 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all appearance-none cursor-pointer shadow-2xl"
                value={adminCategoryFilter}
                onChange={(e) => setAdminCategoryFilter(e.target.value)}
              >
                <option value="all">Todas as Categorias</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-slate-900 text-white">{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-400 pointer-events-none" size={16} />
            </div>
            <div className="relative">
              <select
                className="w-full md:w-52 px-6 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all appearance-none cursor-pointer shadow-2xl"
                value={adminDayFilter}
                onChange={(e) => setAdminDayFilter(e.target.value)}
              >
                <option value="all">Todos os Dias</option>
                {activeDays.map(day => (
                  <option key={day} value={day} className="bg-slate-900 text-white">{day}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        {/* Multi-select Year Filter */}
        <div className="flex flex-col gap-3 bg-slate-900/60 border border-slate-800 rounded-[2rem] p-5 shadow-2xl w-full backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filtro por Série/Ano Escolar</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAdminSelectedGrades([])}
                className={`px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer ${
                  adminSelectedGrades.length === 0 ? 'text-yellow-400 border-yellow-400/20' : 'text-slate-400 border-transparent'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setAdminSelectedGrades(['6º Ano EF', '7º Ano EF'])}
                className={`px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer ${
                  adminSelectedGrades.length === 2 && adminSelectedGrades.includes('6º Ano EF') && adminSelectedGrades.includes('7º Ano EF')
                    ? 'text-yellow-400 border-yellow-400/20' : 'text-slate-400 border-transparent'
                }`}
              >
                6º e 7º EF
              </button>
              <button
                type="button"
                onClick={() => setAdminSelectedGrades(['8º Ano EF', '9º Ano EF'])}
                className={`px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer ${
                  adminSelectedGrades.length === 2 && adminSelectedGrades.includes('8º Ano EF') && adminSelectedGrades.includes('9º Ano EF')
                    ? 'text-yellow-400 border-yellow-400/20' : 'text-slate-400 border-transparent'
                }`}
              >
                8º e 9º EF
              </button>
              <button
                type="button"
                onClick={() => setAdminSelectedGrades(['6º Ano EF', '7º Ano EF', '8º Ano EF', '9º Ano EF'])}
                className={`px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer ${
                  adminSelectedGrades.length === 4 && adminSelectedGrades.every(g => g.includes('EF'))
                    ? 'text-yellow-400 border-yellow-400/20' : 'text-slate-400 border-transparent'
                }`}
              >
                Fundamental II
              </button>
              <button
                type="button"
                onClick={() => setAdminSelectedGrades(['1º Ano EM', '2º Ano EM', '3º Ano EM'])}
                className={`px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer ${
                  adminSelectedGrades.length === 3 && adminSelectedGrades.every(g => g.includes('EM'))
                    ? 'text-yellow-400 border-yellow-400/20' : 'text-slate-400 border-transparent'
                }`}
              >
                Ensino Médio
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {GRADES.map(grade => {
              const isSelected = adminSelectedGrades.includes(grade);
              const displayLabel = grade.replace(' Ano', '');
              return (
                <button
                  key={grade}
                  type="button"
                  onClick={() => {
                    setAdminSelectedGrades(prev => 
                      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
                    );
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    isSelected 
                      ? 'bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-400/10' 
                      : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-white'
                  }`}
                >
                  {displayLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {(events || [])
          .filter(event => {
            if (!event) return false;
            const matchesSearch = (event.name || '').toLowerCase().includes(adminSearchTerm.toLowerCase()) || 
                                 (event.description || '').toLowerCase().includes(adminSearchTerm.toLowerCase());
            const matchesCategory = adminCategoryFilter === 'all' || event.category_id === adminCategoryFilter;
            
            const restrictions = event.restrictions as any;
            let allowedYears: string[] = [];
            if (restrictions?.type === 'years') {
              allowedYears = restrictions.values || [];
            } else if (restrictions?.type === 'all' || !restrictions?.type) {
              allowedYears = GRADES;
            }

            // Year filter logic (subset of selected grades)
            let matchesYear = true;
            if (adminSelectedGrades.length > 0) {
              matchesYear = allowedYears.length > 0 && allowedYears.every(yr => adminSelectedGrades.includes(yr));
            }

            let matchesDay = true;
            if (adminDayFilter !== 'all') {
              let eventDays: string[] = [];
              const ptDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
              if (event.restringir_dias === 1 && event.dias_semana) {
                if (Array.isArray(event.dias_semana)) eventDays = event.dias_semana;
                else if (typeof event.dias_semana === 'string') {
                  try { eventDays = JSON.parse(event.dias_semana); } catch { eventDays = []; }
                }
              } else if (event.start_date) {
                try {
                  const [y, m, d] = event.start_date.split('-').map(Number);
                  const date = new Date(y, m - 1, d);
                  eventDays = [ptDays[date.getDay()]];
                } catch(e) {}
              }
              matchesDay = eventDays.includes(adminDayFilter);
            }

            return matchesSearch && matchesCategory && matchesYear && matchesDay;
          })
          .map(event => {
            const regCount = event.registration_count || 0;
            const maxCap = event.max_capacity || 0;
            const isFull = maxCap > 0 && regCount >= maxCap;
            const fillPercent = maxCap > 0 ? Math.min(100, Math.round((regCount / maxCap) * 100)) : 0;
            const remainingSpots = maxCap > 0 ? Math.max(0, maxCap - regCount) : null;
            const categoryName = categories.find(c => c.id === event.category_id)?.name || 'Sem Categoria';

            // Format Days
            let daysText: string | null = null;
            if (event.restringir_dias === 1 && event.dias_semana) {
              let list: string[] = [];
              if (Array.isArray(event.dias_semana)) list = event.dias_semana;
              else if (typeof event.dias_semana === 'string') {
                try { list = JSON.parse(event.dias_semana); } catch { list = []; }
              }
              if (list.length > 0) daysText = list.join(', ');
            } else if (event.start_date) {
              try {
                const ptDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                const [y, m, d] = event.start_date.split('-').map(Number);
                const date = new Date(y, m - 1, d);
                daysText = ptDays[date.getDay()];
              } catch {}
            }

            // Format Year Restrictions
            let yearsLabel = 'Todos os Anos';
            const restrictions = event.restrictions as any;
            if (restrictions?.type && restrictions.type !== 'all') {
              if (restrictions.type === 'years' && Array.isArray(restrictions.values) && restrictions.values.length > 0) {
                const ef2Years = ['6º Ano EF', '7º Ano EF', '8º Ano EF', '9º Ano EF'];
                const emYears = ['1º Ano EM', '2º Ano EM', '3º Ano EM'];
                const clean = (s: string) => s.replace(/°/g, 'º').trim();
                const normValues = restrictions.values.map(clean);
                const hasAllEF2 = ef2Years.every((y: string) => normValues.includes(y));
                const hasAllEM = emYears.every((y: string) => normValues.includes(y));
                if (normValues.length === GRADES.length) yearsLabel = 'Todos os Anos';
                else if (hasAllEF2 && normValues.length === ef2Years.length) yearsLabel = 'Fund. 2 (6º ao 9º Ano)';
                else if (hasAllEM && normValues.length === emYears.length) yearsLabel = 'Ensino Médio (1º ao 3º Ano)';
                else yearsLabel = normValues.map((v: string) => v.replace(/\s*Ano\s*EF/gi, 'º EF').replace(/\s*Ano\s*EM/gi, 'º EM').replace(/º+/g, 'º')).join(', ');
              } else if (restrictions.type === 'classes') {
                yearsLabel = `Turmas: ${restrictions.values?.join(', ')}`;
              } else if (restrictions.type === 'collaborators') {
                yearsLabel = 'Apenas Colaboradores';
              } else {
                yearsLabel = 'Restrito';
              }
            }

            // Format Year Limits
            let yearLimitsFormatted = '';
            if (event.limitar_vagas_por_ano === 1 && event.vagas_por_ano) {
              try {
                const limits = typeof event.vagas_por_ano === 'string' ? JSON.parse(event.vagas_por_ano) : event.vagas_por_ano;
                const entries = Object.entries(limits || {});
                if (entries.length > 0) {
                  yearLimitsFormatted = entries
                    .map(([grade, val]) => `${grade.replace(/\s*Ano\s*EF/gi, 'º EF').replace(/\s*Ano\s*EM/gi, 'º EM').replace(/º+/g, 'º')}: ${val}`)
                    .join(' • ');
                }
              } catch {}
            }

            const hasGenderLimit = event.limitar_vagas_genero === 1 && (Number(event.vagas_masculino) > 0 || Number(event.vagas_feminino) > 0);

            return (
              <div key={event.id} className="bg-slate-900/95 rounded-3xl border border-slate-800 shadow-xl hover:border-yellow-400/40 transition-all overflow-hidden p-6 md:p-7 flex flex-col gap-6 group backdrop-blur-md">
                {/* Top: Header Row (Image Thumbnail + Event Name + Badges) */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {/* Image Thumbnail */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-950 overflow-hidden relative flex-shrink-0 border border-slate-800 shadow-md">
                    <img 
                      src={event.image_url || getEventImage(event.name) || undefined} 
                      alt={event.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    {event.password_protected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-slate-950/90 rounded-lg flex items-center justify-center text-yellow-400 border border-yellow-400/30">
                        <Lock size={12} />
                      </div>
                    )}
                  </div>

                  {/* Title & Badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-yellow-400 text-black text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm">
                        {categoryName}
                      </span>
                      <span className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-xl ${
                        event.is_paid === 1 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {event.is_paid === 1 ? 'Pago' : 'Gratuito'}
                      </span>
                      {event.is_hidden === 1 && (
                        <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider rounded-xl">
                          Oculto
                        </span>
                      )}
                      {isFull ? (
                        <span className="px-2.5 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm">
                          Lotado
                        </span>
                      ) : maxCap > 0 ? (
                        <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-yellow-400 text-[10px] font-black uppercase tracking-wider rounded-xl">
                          {remainingSpots} vagas restantes
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-black text-yellow-400 group-hover:text-yellow-300 transition-colors tracking-tight leading-tight">
                      {event.name}
                    </h3>
                    {event.description && (
                      <p className="text-slate-400 text-xs font-semibold line-clamp-1 mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Middle: Clean Ordered Grid of Information Blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* 1. Vagas Box */}
                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col justify-between gap-2">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="text-slate-400 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                        <Users size={14} className="text-yellow-400" />
                        Vagas:
                      </span>
                      <span className={isFull ? 'text-red-400 font-black' : 'text-white'}>
                        {regCount} {maxCap > 0 ? `/ ${maxCap}` : ''} {maxCap > 0 && `(${fillPercent}%)`}
                      </span>
                    </div>
                    {maxCap > 0 && (
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFull ? 'bg-red-500' : fillPercent >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`} 
                          style={{ width: `${fillPercent}%` }}
                        ></div>
                      </div>
                    )}
                  </div>

                  {/* 2. Público / Séries */}
                  <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Público Permitido</span>
                      <span className="text-slate-200 font-black text-xs block truncate" title={yearsLabel}>
                        {yearsLabel}
                      </span>
                    </div>
                  </div>

                  {/* 3. Horário & Dias */}
                  <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center flex-shrink-0">
                      <Clock size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Horário & Dias</span>
                      <span className="text-slate-200 font-black text-xs block truncate">
                        {event.start_time ? `${event.start_time}${event.end_time ? ` às ${event.end_time}` : ''}` : safeFormatDate(event.start_date, 'dd/MM/yyyy')}
                        {daysText ? ` (${daysText})` : ''}
                      </span>
                    </div>
                  </div>

                  {/* 4. Inscrições até */}
                  <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center flex-shrink-0">
                      <Calendar size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Prazo de Inscrição</span>
                      <span className="text-slate-200 font-black text-xs block truncate">
                        {event.end_date ? `${safeFormatDate(event.end_date, 'dd/MM/yyyy')}${event.end_time ? ` às ${event.end_time}` : ''}` : 'Sem limite definido'}
                      </span>
                    </div>
                  </div>

                  {/* 5. Gênero (se houver) */}
                  {hasGenderLimit && (
                    <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-between gap-3 text-purple-300 md:col-span-2 lg:col-span-2">
                      <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider">
                        <Users size={15} className="text-purple-400" />
                        Divisão de Vagas por Gênero:
                      </span>
                      <span className="text-white font-black text-xs">
                        {Number(event.vagas_masculino) > 0 && `👦 Masc: ${event.vagas_masculino} vagas`}
                        {Number(event.vagas_masculino) > 0 && Number(event.vagas_feminino) > 0 && ' • '}
                        {Number(event.vagas_feminino) > 0 && `👧 Fem: ${event.vagas_feminino} vagas`}
                      </span>
                    </div>
                  )}

                  {/* 6. Cotas por Série (se houver) */}
                  {yearLimitsFormatted && (
                    <div className={`p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between gap-3 text-blue-300 ${
                      hasGenderLimit ? 'md:col-span-2 lg:col-span-2' : 'col-span-full'
                    }`}>
                      <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider flex-shrink-0">
                        <ShieldCheck size={15} className="text-blue-400" />
                        Cotas por Série:
                      </span>
                      <span className="text-white font-black text-xs truncate" title={yearLimitsFormatted}>
                        {yearLimitsFormatted}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom: Action Bar Dock */}
                <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <Link
                    to={`/admin/events/${event.id}/registrations`}
                    className="py-3 px-6 bg-yellow-400 text-black hover:bg-yellow-300 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-yellow-400/20 hover:scale-[1.02]"
                    title="Ver Lista de Inscritos"
                  >
                    <Users size={16} />
                    <span>{regCount} Inscritos Confirmados</span>
                  </Link>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleSaveAsTemplate(event)}
                      className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 rounded-xl flex items-center gap-2 transition-all border border-slate-700 text-xs font-bold"
                      title="Salvar como Modelo"
                    >
                      <Bookmark size={15} />
                      <span>Modelo</span>
                    </button>
                    <button
                      onClick={() => handleClone(event)}
                      className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 rounded-xl flex items-center gap-2 transition-all border border-slate-700 text-xs font-bold"
                      title="Duplicar Evento"
                    >
                      <Copy size={15} />
                      <span>Clonar</span>
                    </button>
                    <button
                      onClick={() => setQrEvent(event)}
                      className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-indigo-400 rounded-xl flex items-center justify-center transition-all border border-slate-700"
                      title="Gerar QR Code"
                    >
                      <QrCode size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleVisibility(event)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                        event.is_hidden === 1
                          ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                      }`}
                      title={event.is_hidden === 1 ? "Mostrar a Todos" : "Ocultar Evento"}
                    >
                      {event.is_hidden === 1 ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => handleOpenModal(event)}
                      className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-yellow-400 rounded-xl flex items-center justify-center transition-all border border-slate-700"
                      title="Editar Evento"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="w-10 h-10 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl flex items-center justify-center transition-all border border-red-500/20"
                      title="Excluir Evento"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

        {events.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-900/40 rounded-[3rem] border-2 border-dashed border-slate-800">
            <Calendar size={60} className="mx-auto text-slate-800 mb-6" />
            <p className="text-slate-300 font-bold text-lg">Nenhum evento encontrado.</p>
            <p className="text-slate-400 text-sm">Clique em "Novo Evento" para começar.</p>
          </div>
        )}
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-800">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-400/10 text-yellow-400 rounded-2xl flex items-center justify-center">
                  <Bookmark size={24} />
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight">Biblioteca de Modelos</h2>
              </div>
              <button onClick={() => setShowTemplates(false)} className="w-10 h-10 bg-slate-800 text-slate-300 hover:text-white rounded-xl flex items-center justify-center transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto max-h-[60vh] space-y-6">
              {templates.length === 0 ? (
                <div className="text-center py-20">
                  <Bookmark size={60} className="mx-auto text-slate-300 mb-6" />
                  <p className="text-slate-500 font-bold text-lg">Nenhum modelo salvo ainda.</p>
                </div>
              ) : (
                templates.map(template => (
                  <div key={template.id} className="flex items-center justify-between p-6 bg-slate-800/50 rounded-3xl border border-slate-800 hover:border-yellow-400/30 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-950 flex-shrink-0">
                        <img src={template.image_url || getEventImage(template.name) || undefined} alt="" className="w-full h-full object-cover opacity-80" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white mb-1">{template.name}</h4>
                        <p className="text-xs font-bold text-slate-400 line-clamp-1">{template.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <button
                        onClick={() => handleUseTemplate(template)}
                        className="px-6 py-3 bg-yellow-400 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-yellow-300 transition-all flex items-center gap-2 shadow-lg shadow-yellow-400/10"
                      >
                        <Copy size={16} /> Usar
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="w-10 h-10 bg-red-500/5 text-slate-400 hover:text-red-500 rounded-xl flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-4xl max-h-[95vh] rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-slate-800">
            <div className="p-6 md:p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <h2 className="text-3xl font-black text-white tracking-tight">
                {editingEvent ? 'Editar Evento' : 'Criar Novo Evento'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); setSelectedImageFile(null); }} className="w-10 h-10 bg-slate-800 text-slate-300 hover:text-white rounded-xl flex items-center justify-center transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 md:p-10 space-y-8 md:space-y-12 custom-scrollbar">
              {/* Basic Info */}
              <section className="space-y-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-yellow-400/10 text-yellow-400 rounded-2xl flex items-center justify-center shadow-sm">
                    <FileText size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Informações Básicas</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Nome do Evento</label>
                    <input
                      type="text"
                      required
                      className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400 transition-all text-white font-bold placeholder:text-slate-600 shadow-sm"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Categoria</label>
                    <select
                      required
                      className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400 transition-all text-white font-bold appearance-none placeholder:text-slate-600 shadow-sm"
                      value={formData.category_id}
                      onChange={(e) => {
                        const catId = e.target.value;
                        setFormData({
                          ...formData,
                          category_id: catId,
                          subcategory_id: '' // reset subcategory on category change
                        });
                      }}
                    >
                      <option value="" className="bg-slate-900">Selecione...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id} className="bg-slate-900">{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Tipo / Subcategoria</label>
                    <select
                      className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400 transition-all text-white font-bold appearance-none placeholder:text-slate-600 shadow-sm"
                      value={formData.subcategory_id || ''}
                      onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
                      disabled={!formData.category_id}
                    >
                      <option value="" className="bg-slate-900">Selecione o Tipo...</option>
                      {(categories.find(c => String(c.id) === String(formData.category_id))?.subcategories || []).map(sub => (
                        <option key={sub.id} value={sub.id} className="bg-slate-900">{sub.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Descrição Completa</label>
                  <textarea
                    rows={4}
                    className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400 transition-all text-white font-bold placeholder:text-slate-600 shadow-sm"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-6 pt-6 border-t border-slate-800">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Capa do Evento</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-[2rem] flex flex-col items-center justify-center text-center">
                      <input
                        type="file"
                        accept="image/*"
                        id="image-upload"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSelectedImageFile(e.target.files[0]);
                            setFormData({ ...formData, image_url: '' });
                          }
                        }}
                      />
                      <label htmlFor="image-upload" className="cursor-pointer group">
                        <UploadCloud size={40} className="mx-auto text-slate-700 group-hover:text-yellow-400 transition-colors mb-4" />
                        <p className="text-sm font-black text-white uppercase tracking-widest mb-1">Upload de Arquivo</p>
                        <p className="text-xs font-bold text-slate-500 uppercase">PNG, JPG ou WEBP</p>
                        {selectedImageFile && <p className="mt-4 text-xs font-black text-yellow-400 underline uppercase">{selectedImageFile.name}</p>}
                      </label>
                    </div>
                    <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-[2rem] flex flex-col justify-center">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Ou Cole o Link</label>
                      <input
                        type="url"
                        className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all text-white font-bold"
                        placeholder="https://..."
                        value={formData.image_url}
                        onChange={(e) => {
                          setFormData({ ...formData, image_url: e.target.value });
                          setSelectedImageFile(null);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Date and Time */}
              <section className="space-y-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-yellow-400/10 text-yellow-400 rounded-2xl flex items-center justify-center shadow-sm">
                    <Clock size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Data e Duração</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Início</label>
                    <input type="date" required className="w-full px-5 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all shadow-sm" value={formData.start_date || ''} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Hora Início</label>
                    <input type="time" required className="w-full px-5 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all shadow-sm" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Término</label>
                    <input type="date" className="w-full px-5 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all shadow-sm" value={formData.end_date || ''} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Hora Término</label>
                    <input type="time" className="w-full px-5 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all shadow-sm" value={formData.end_time || ''} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Vagas</label>
                    <input type="number" placeholder="0 = Ilimitado" className="w-full px-5 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all placeholder:text-slate-600 shadow-sm" value={formData.max_capacity || ''} onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) || 0 })} />
                  </div>

                  {/* Gender Limit Toggle */}
                  <div className="space-y-4 md:col-span-2 p-6 bg-slate-950/50 border border-slate-800 rounded-3xl">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Limitar Vagas por Gênero</label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, limitar_vagas_genero: formData.limitar_vagas_genero === 1 ? 0 : 1 })}
                        className={`w-14 h-8 rounded-full transition-all relative ${formData.limitar_vagas_genero === 1 ? 'bg-yellow-400' : 'bg-slate-800'}`}
                      >
                        <div className={`absolute top-1 w-6 h-6 bg-white shadow-sm rounded-full transition-all ${formData.limitar_vagas_genero === 1 ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>
                    {formData.limitar_vagas_genero === 1 && (
                      <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Vagas (Masculino)</label>
                          <input type="number" min="0" placeholder="0" className="w-full px-5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all" value={formData.vagas_masculino || ''} onChange={(e) => setFormData({ ...formData, vagas_masculino: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Vagas (Feminino)</label>
                          <input type="number" min="0" placeholder="0" className="w-full px-5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all" value={formData.vagas_feminino || ''} onChange={(e) => setFormData({ ...formData, vagas_feminino: parseInt(e.target.value) || 0 })} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Security & Restrictions */}
              <section className="space-y-8 pt-8 border-t border-slate-800">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-yellow-400/10 text-yellow-400 rounded-2xl flex items-center justify-center shadow-sm">
                    <ShieldCheck size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Segurança e Restrições</h3>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Ocultar Evento de Visitantes</label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_hidden: formData.is_hidden === 1 ? 0 : 1 })}
                        className={`w-14 h-8 rounded-full transition-all relative ${formData.is_hidden === 1 ? 'bg-yellow-400' : 'bg-slate-800'}`}
                      >
                        <div className={`absolute top-1 w-6 h-6 bg-white shadow-sm rounded-full transition-all ${formData.is_hidden === 1 ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Proteção por Senha</label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, password_protected: !formData.password_protected })}
                        className={`w-14 h-8 rounded-full transition-all relative ${formData.password_protected ? 'bg-yellow-400' : 'bg-slate-800'}`}
                      >
                        <div className={`absolute top-1 w-6 h-6 bg-white shadow-sm rounded-full transition-all ${formData.password_protected ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>

                    {formData.password_protected && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-[10px] font-black text-yellow-400 uppercase tracking-widest px-2">Senha do Evento</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                          <input
                            type="text"
                            placeholder="Defina uma senha..."
                            className="w-full pl-12 pr-6 py-4 bg-slate-900 border border-yellow-400/20 rounded-2xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all shadow-sm"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-3xl space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Restrição de Acesso</label>
                      <select
                        className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all appearance-none shadow-sm"
                        value={formData.restrictions?.type || 'all'}
                        onChange={(e) => setFormData({
                          ...formData,
                          restrictions: {
                            type: e.target.value as any,
                            values: []
                          }
                        })}
                      >
                        <option value="all" className="bg-slate-900">Público (Todos)</option>
                        <option value="years" className="bg-slate-900">Por Ano Escolar</option>
                        <option value="classes" className="bg-slate-900">Por Turma</option>
                        <option value="participant_types" className="bg-slate-900">Por Tipo de Participante</option>
                        <option value="collaborators" className="bg-slate-900">Apenas Colaboradores</option>
                      </select>
                    </div>

                    {(formData.restrictions?.type === 'years' || formData.restrictions?.type === 'classes' || formData.restrictions?.type === 'participant_types') && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-[10px] font-black text-yellow-400 uppercase tracking-widest px-2">
                          Selecionar {
                            formData.restrictions?.type === 'years' ? 'Anos' : 
                            formData.restrictions?.type === 'classes' ? 'Turmas' : 'Tipos'
                          }
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {(
                            formData.restrictions?.type === 'years' ? GRADES : 
                            formData.restrictions?.type === 'classes' ? CLASSES : 
                            [
                              { label: 'Aluno', value: 'student' },
                              { label: 'Colaborador', value: 'collaborator' },
                              { label: 'Responsável', value: 'responsible' },
                              { label: 'Outro', value: 'other' }
                            ]
                          ).map((item) => {
                            const val = typeof item === 'string' ? item : item.value;
                            const label = typeof item === 'string' ? item : item.label;
                            const isSelected = formData.restrictions?.values.includes(val);
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => {
                                  const currentValues = formData.restrictions?.values || [];
                                  const newValues = isSelected
                                    ? currentValues.filter(v => v !== val)
                                    : [...currentValues, val];
                                  setFormData({
                                    ...formData,
                                    restrictions: { 
                                      type: formData.restrictions?.type || 'all', 
                                      values: newValues 
                                    }
                                  });
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isSelected
                                    ? 'bg-yellow-400 text-black border-yellow-400 shadow-md'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-yellow-400/30'
                                  }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between h-full">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Auto-preenchimento</label>
                        <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Sugere nomes e preenche Série/Turma automaticamente</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, enable_autocomplete: !formData.enable_autocomplete })}
                        className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 ${formData.enable_autocomplete !== false ? 'bg-yellow-400' : 'bg-slate-800'}`}
                      >
                        <div className={`absolute top-1 w-6 h-6 bg-white shadow-sm rounded-full transition-all ${formData.enable_autocomplete !== false ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between h-full">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Atividade Paga</label>
                        <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Define se esta atividade possui taxa ou cobrança associada</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_paid: formData.is_paid === 1 ? 0 : 1 })}
                        className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 ${formData.is_paid === 1 ? 'bg-yellow-400' : 'bg-slate-800'}`}
                      >
                        <div className={`absolute top-1 w-6 h-6 bg-white shadow-sm rounded-full transition-all ${formData.is_paid === 1 ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between h-full">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Escolha Única</label>
                        <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Impede inscrições duplicadas nesta Categoria e Tipo</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, restringir_duplicidade: formData.restringir_duplicidade === 1 ? 0 : 1 })}
                        className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 ${formData.restringir_duplicidade === 1 ? 'bg-yellow-400' : 'bg-slate-800'}`}
                      >
                        <div className={`absolute top-1 w-6 h-6 bg-white shadow-sm rounded-full transition-all ${formData.restringir_duplicidade === 1 ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Novos controles de dias da semana, agendamento e limite por ano */}
                  <div className="grid grid-cols-1 gap-6 pt-6 border-t border-slate-800/40">
                    <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-3xl space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Exibir Dias da Semana</label>
                          <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Define se o evento exibe dias específicos na semana (Sexta, Sábado...)</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const active = formData.restringir_dias === 1 ? 0 : 1;
                            setFormData({ 
                              ...formData, 
                              restringir_dias: active,
                              dias_semana: active === 0 ? [] : (formData.dias_semana || [])
                            });
                          }}
                          className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 ${formData.restringir_dias === 1 ? 'bg-yellow-400' : 'bg-slate-800'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white shadow-sm rounded-full transition-all ${formData.restringir_dias === 1 ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>

                      {formData.restringir_dias === 1 && (
                        <div className="pt-4 border-t border-slate-800/50 space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Dias Selecionados</label>
                          <div className="flex flex-wrap gap-2">
                            {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(day => {
                              const diasList = Array.isArray(formData.dias_semana) 
                                ? formData.dias_semana 
                                : [];
                              const isSelected = diasList.includes(day);
                              return (
                                <button
                                  type="button"
                                  key={day}
                                  onClick={() => {
                                    let nextDays = [...diasList];
                                    if (isSelected) {
                                      nextDays = nextDays.filter(d => d !== day);
                                    } else {
                                      nextDays.push(day);
                                    }
                                    setFormData({ ...formData, dias_semana: nextDays });
                                  }}
                                  className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all border ${
                                    isSelected 
                                      ? 'bg-yellow-400 border-yellow-400 text-black shadow-sm' 
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-3xl space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Alerta Vermelho do Cronômetro</label>
                          <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Escolha quanto tempo antes do início o cronômetro deve ficar vermelho e chamar atenção.</p>
                        </div>
                        
                        <div className="space-y-2">
                          <select
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold text-xs focus:outline-none focus:border-red-500 transition-all shadow-sm"
                            value={formData.countdown_target_at || '10'}
                            onChange={(e) => {
                              setFormData({ 
                                ...formData, 
                                countdown_target_at: e.target.value,
                                registration_open_at: '' // clear this so it always uses start_date and start_time
                              });
                            }}
                          >
                            {[5, 10, 15, 20, 30, 45, 60, 120].map(mins => {
                              let timeStr = '';
                              if (formData.start_time) {
                                const [h, m] = formData.start_time.split(':').map(Number);
                                const totalMins = h * 60 + m - mins;
                                if (totalMins >= 0) {
                                  const newH = Math.floor(totalMins / 60);
                                  const newM = totalMins % 60;
                                  timeStr = ` (a partir das ${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')})`;
                                }
                              }
                              return (
                                <option key={mins} value={mins}>
                                  {mins} minutos antes do evento{timeStr}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-3xl space-y-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Limite por Ano</label>
                          <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Define um limite individual de vagas por ano escolar</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ 
                            ...formData, 
                            limitar_vagas_por_ano: formData.limitar_vagas_por_ano === 1 ? 0 : 1,
                            vagas_por_ano: formData.limitar_vagas_por_ano === 1 ? undefined : {}
                          })}
                          className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 ${formData.limitar_vagas_por_ano === 1 ? 'bg-yellow-400' : 'bg-slate-800'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white shadow-sm rounded-full transition-all ${formData.limitar_vagas_por_ano === 1 ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>
                      {formData.limitar_vagas_por_ano === 1 && (
                        <div className="pt-4 border-t border-slate-800/50 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                          {(() => {
                            const limits = (typeof formData.vagas_por_ano === 'object' && formData.vagas_por_ano !== null)
                              ? (formData.vagas_por_ano as Record<string, number>)
                              : {};
                            const totalDistributed = Object.values(limits).reduce((sum, val) => sum + (val || 0), 0);
                            const totalCapacity = formData.max_capacity || 0;
                            const remainingCapacity = totalCapacity - totalDistributed;

                            return (
                              <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Divisão de Vagas</span>
                                    <span className="text-xs font-bold text-slate-300">
                                      Total do Evento: <strong className="text-white">{totalCapacity || 'Ilimitado'}</strong>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs font-black uppercase tracking-wider">
                                    <div className="flex flex-col items-end">
                                      <span className="text-[9px] font-bold text-slate-500">Distribuídas</span>
                                      <span className={totalDistributed === totalCapacity ? "text-green-400" : "text-yellow-400"}>{totalDistributed} vagas</span>
                                    </div>
                                    {totalCapacity > 0 && (
                                      <div className="flex flex-col items-end border-l border-slate-800 pl-4">
                                        <span className="text-[9px] font-bold text-slate-500">Status</span>
                                        <span className={remainingCapacity === 0 ? "text-green-400" : remainingCapacity > 0 ? "text-blue-400" : "text-red-400"}>
                                          {remainingCapacity === 0 ? "Pronto" : remainingCapacity > 0 ? `Restam ${remainingCapacity}` : `Excedeu ${Math.abs(remainingCapacity)}`}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {totalCapacity > 0 && remainingCapacity !== 0 && (
                                  <div className={`p-3 rounded-xl border text-[11px] font-bold ${
                                    remainingCapacity > 0 
                                      ? "bg-blue-500/5 border-blue-500/20 text-blue-400" 
                                      : "bg-red-500/5 border-red-500/20 text-red-400"
                                  }`}>
                                    {remainingCapacity > 0 
                                      ? `Atenção: Restam ${remainingCapacity} vagas das ${totalCapacity} totais para serem distribuídas.`
                                      : `Erro: A soma das vagas por ano (${totalDistributed}) excede o limite geral de ${totalCapacity} vagas!`
                                    }
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Definir Vagas por Ano:</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {(() => {
                              const gradesToShow = formData.restrictions?.type === 'years' && Array.isArray(formData.restrictions?.values) && formData.restrictions.values.length > 0
                                ? formData.restrictions.values
                                : GRADES;

                              const limits = (typeof formData.vagas_por_ano === 'object' && formData.vagas_por_ano !== null)
                                ? (formData.vagas_por_ano as Record<string, number>)
                                : {};

                              return gradesToShow.map((grade) => {
                                const val = limits[grade] !== undefined ? limits[grade] : '';
                                const shortGrade = grade.replace(' EF', '').replace(' EM', '');
                                return (
                                  <div key={grade} className="flex flex-col gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/60 hover:border-yellow-400/20 transition-all items-center">
                                    <span className="text-[11px] font-bold text-slate-300 text-center truncate w-full">{shortGrade}</span>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      placeholder="Ilimitado"
                                      value={val}
                                      onChange={(e) => {
                                        const rawVal = e.target.value.replace(/\D/g, '');
                                        const numVal = parseInt(rawVal);
                                        const updatedLimits = { ...limits };
                                        if (isNaN(numVal) || numVal <= 0) {
                                          delete updatedLimits[grade];
                                        } else {
                                          updatedLimits[grade] = numVal;
                                        }
                                        setFormData({ ...formData, vagas_por_ano: updatedLimits });
                                      }}
                                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-yellow-400 text-slate-100 text-xs font-black text-center transition-all shadow-inner"
                                    />
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Custom Form Fields */}
              <section className="space-y-8 pt-8 border-t border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-400/10 text-yellow-400 rounded-2xl flex items-center justify-center shadow-sm">
                      <List size={24} />
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Formulário de Inscrição</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['name', 'surname', 'grade', 'class', 'gender'].map(preset => (
                      <button key={preset} type="button" onClick={() => addPresetField(preset as any)} className="px-4 py-2 bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-yellow-400 hover:text-black transition-all border border-slate-700">
                        + {preset}
                      </button>
                    ))}
                    <button type="button" onClick={addFormField} className="px-4 py-2 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-yellow-300 transition-all flex items-center gap-2 shadow-sm">
                      <Plus size={14} /> Custom
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {formData.form_fields?.map((field) => (
                    <div key={field.id} className="p-6 bg-slate-950/50 border border-slate-800 rounded-3xl flex flex-col md:flex-row gap-6 items-center">
                      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Rótulo do Campo</label>
                          <input type="text" placeholder="Nome do Campo (ex: CPF, Turma...)" className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all placeholder:text-slate-600" value={field.label} onChange={(e) => updateFormField(field.id, { label: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Tipo de Entrada</label>
                          <select className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all appearance-none" value={field.type} onChange={(e) => updateFormField(field.id, { type: e.target.value as any })}>
                            <option value="text" className="bg-slate-900">Texto Curto</option>
                            <option value="textarea" className="bg-slate-900">Texto Longo (Parágrafo)</option>
                            <option value="select" className="bg-slate-900">Lista Suspensa</option>
                            <option value="checkbox" className="bg-slate-900">Caixa de Seleção (Múltipla)</option>
                            <option value="radio" className="bg-slate-900">Escolha Única (Radio)</option>
                          </select>
                        </div>
                        {(field.type === 'select' || field.type === 'checkbox' || field.type === 'radio') && (
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-yellow-400 uppercase tracking-widest px-2">Opções (separadas por vírgula)</label>
                            <input 
                              type="text" 
                              placeholder="Opção 1, Opção 2, Opção 3..." 
                              className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all placeholder:text-slate-600 shadow-sm" 
                              value={field.options?.join(', ') || ''} 
                              onChange={(e) => updateFormField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') })} 
                            />
                          </div>
                        )}
                        <div className="md:col-span-2 flex items-center gap-3 px-2">
                          <input 
                            type="checkbox" 
                            id={`req-${field.id}`} 
                            checked={field.required} 
                            onChange={(e) => updateFormField(field.id, { required: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-yellow-400 focus:ring-yellow-400/50"
                          />
                          <label htmlFor={`req-${field.id}`} className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">Campo Obrigatório</label>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeFormField(field.id)} className="w-12 h-12 bg-red-500/5 text-slate-500 hover:text-red-500 rounded-xl flex items-center justify-center transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <div className="pt-8 md:pt-10 flex flex-col md:flex-row justify-end gap-4 md:gap-6">
                <button type="button" onClick={() => { setIsModalOpen(false); setSelectedImageFile(null); }} className="px-8 py-4 text-slate-500 font-black uppercase tracking-widest text-xs hover:text-white transition-colors">Cancelar</button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-grow py-5 bg-yellow-400 text-black font-black uppercase text-sm tracking-[0.2em] rounded-3xl hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isUploading ? <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin"></div> : (
                    <>
                      <CheckCircle2 size={24} />
                      Confirmar e Salvar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border border-slate-800 text-center">
            <h3 className="text-3xl font-black text-white mb-4 tracking-tight">{confirmModal.title}</h3>
            <p className="text-slate-400 mb-10 font-bold text-lg leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} className="flex-grow py-4 bg-slate-800 text-slate-400 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-700 transition-all border border-slate-700">Voltar</button>
              <button onClick={confirmModal.onConfirm} className={`flex-grow py-4 text-black font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-lg ${confirmModal.confirmColor || 'bg-yellow-400 hover:bg-yellow-300'}`}>{confirmModal.confirmText || 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}

      {qrEvent && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-sm rounded-[3rem] shadow-2xl p-10 text-center border border-slate-800">
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">QR Code</h3>
            <p className="text-sm font-bold text-slate-500 mb-10 uppercase tracking-widest">{qrEvent.name}</p>
            <div className="bg-white p-6 rounded-[2rem] inline-block shadow-xl mb-10 border border-white">
              <QRCodeSVG id="event-qrcode" value={`${window.location.origin}/event/${qrEvent.id}`} size={200} level="H" includeMargin={true} />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setQrEvent(null)} className="flex-grow py-4 bg-slate-800 text-slate-400 font-black uppercase tracking-widest text-xs rounded-2xl border border-slate-700">Voltar</button>
              <button onClick={() => {
                const canvas = document.getElementById('event-qrcode') as HTMLCanvasElement;
                if (canvas) {
                  const url = canvas.toDataURL('image/png');
                  const link = document.createElement('a');
                  link.download = `qrcode-${qrEvent.name}.png`;
                  link.href = url;
                  link.click();
                }
              }} className="flex-grow py-4 bg-yellow-400 text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-yellow-300 transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20">
                <Download size={18} /> Baixar
              </button>
            </div>
          </div>
        </div>
      )}

      {feedback && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center border border-slate-800">
            <div className={`w-20 h-20 ${feedback.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'} rounded-[1.5rem] flex items-center justify-center mb-8 mx-auto shadow-sm`}>
              {feedback.type === 'success' ? <CheckCircle2 size={40} /> : <AlertTriangle size={40} />}
            </div>
            <h2 className="text-3xl font-black text-white mb-3 tracking-tight">{feedback.type === 'success' ? 'Sucesso!' : 'Erro'}</h2>
            <p className="text-slate-400 mb-10 font-bold text-lg leading-relaxed">{feedback.message}</p>
            <button onClick={() => setFeedback(null)} className="w-full py-4 bg-slate-800 text-slate-400 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-700 transition-all border border-slate-700">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
