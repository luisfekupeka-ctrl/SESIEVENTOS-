import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Event, Category, FormField, EventTemplate } from '../types';
import { Plus, Trash2, Edit2, X, Check, Calendar, Clock, FileText, ShieldCheck, List, ChevronDown, ChevronUp, Users, Lock, Copy, Bookmark, Sparkles, TrendingUp, AlertTriangle, QrCode, Download, UploadCloud, Loader2, CheckCircle2, Search } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { GRADES, CLASSES } from '../constants';
import { useAuth } from '../context/AuthContext';

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

  // Form State
  const [formData, setFormData] = useState<Partial<Event>>({
    name: '',
    category_id: '',
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
    form_fields: []
  });

  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const fetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchData = async (isBackground = false) => {
    try {
      if (isBackground) setBackgroundLoading(true);
      else setLoading(true);

      const [eventsRes, catsRes, tempsRes] = await Promise.all([
        supabase.from('events').select('*').order('name', { ascending: true }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
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
      setFormData(event);
    } else {
      setEditingEvent(null);
      setFormData({
        name: '',
        category_id: categories[0]?.id || '',
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
        form_fields: []
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
      let finalImageUrl = formData.image_url;

      if (selectedImageFile) {
        finalImageUrl = await uploadImage(selectedImageFile);
      }

      const eventToSave = { ...formData, image_url: finalImageUrl };

      delete (eventToSave as any).id;
      delete (eventToSave as any).created_at;
      delete (eventToSave as any).registration_count;

      const cleanEventToSave = { ...eventToSave };
      if (cleanEventToSave.start_date === '') delete cleanEventToSave.start_date;
      if (cleanEventToSave.end_date === '') delete cleanEventToSave.end_date;
      if (cleanEventToSave.start_time === '') delete cleanEventToSave.start_time;
      if (cleanEventToSave.end_time === '') delete cleanEventToSave.end_time;

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

  const addFormField = () => {
    const newField: FormField = {
      id: Math.random().toString(36).substr(2, 9),
      label: '',
      type: 'text',
      required: false
    };
    setFormData(prev => ({ ...prev, form_fields: [...(prev.form_fields || []), newField] }));
  };

  const addPresetField = (preset: 'grade' | 'class' | 'name' | 'surname') => {
    let newField: FormField;

    if (preset === 'name' || preset === 'surname') {
      newField = {
        id: Math.random().toString(36).substr(2, 9),
        label: preset === 'name' ? 'Nome' : 'Sobrenome',
        type: 'text',
        required: true
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
        <p className="text-slate-300 font-bold">Sincronizando eventos...</p>
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

      <div className="flex flex-col md:flex-row gap-4 mb-10">
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
        <div className="relative">
          <select
            className="w-full md:w-64 px-6 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all appearance-none cursor-pointer shadow-2xl"
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {events
          .filter(event => {
            const matchesSearch = event.name.toLowerCase().includes(adminSearchTerm.toLowerCase()) || 
                                 event.description.toLowerCase().includes(adminSearchTerm.toLowerCase());
            const matchesCategory = adminCategoryFilter === 'all' || event.category_id === adminCategoryFilter;
            return matchesSearch && matchesCategory;
          })
          .map(event => (
          <div key={event.id} className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden hover:border-yellow-400/30 transition-all flex flex-col group backdrop-blur-sm">
            <div className="w-full h-48 md:h-56 bg-slate-950 relative overflow-hidden">
              <img src={event.image_url || undefined} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-70 group-hover:opacity-100" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent"></div>
              <div className="absolute bottom-4 left-6">
                <span className="bg-yellow-400/10 text-yellow-400 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-[0.2em] border border-yellow-400/20 backdrop-blur-md">
                  {categories.find(c => c.id === event.category_id)?.name || 'Sem Categoria'}
                </span>
              </div>
            </div>
            <div className="p-6 md:p-8 flex-grow flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-4 min-h-[1.5rem]">
                  {event.password_protected && (
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-amber-500/10 text-amber-600 font-black text-[10px] uppercase tracking-widest rounded-lg border border-amber-500/10">
                      <Lock size={12} /> Protegido
                    </div>
                  )}
                  {(() => {
                    const restrictions = event.restrictions as any;
                    if (restrictions?.type && restrictions.type !== 'all') {
                      const typeLabels: Record<string, string> = {
                        years: 'Anos',
                        classes: 'Turmas',
                        participant_types: 'Tipos',
                        collaborators: 'Colaboradores'
                      };
                      return (
                        <div className="flex items-center gap-2 px-2.5 py-1 bg-yellow-400/10 text-yellow-400 font-black text-[10px] uppercase tracking-widest rounded-lg border border-yellow-400/10">
                          <ShieldCheck size={12} /> {typeLabels[restrictions.type] || 'Restrito'}
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-800 text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-lg border border-slate-700">
                        <Users size={12} /> Público
                      </div>
                    );
                  })()}
                </div>
                <h3 className="text-xl font-black text-white mb-6 group-hover:text-yellow-400 transition-colors tracking-tight leading-tight line-clamp-2">{event.name}</h3>

                <div className="grid grid-cols-1 gap-4 text-sm font-bold">
                  <div className="flex items-center gap-3 text-slate-300">
                    <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-yellow-400">
                      <Calendar size={16} />
                    </div>
                    <span className="uppercase tracking-widest text-[10px] font-bold text-slate-300">
                      Início: {(() => {
                        try {
                          if (!event.start_date) return 'Sem data';
                          return format(new Date(event.start_date + 'T00:00:00'), "dd/MM/yyyy");
                        } catch (e) {
                          return event.start_date || 'Data inválida';
                        }
                      })()} às {event.start_time || '--:--'}
                    </span>
                  </div>
                  {event.end_date && (
                    <div className="flex items-center gap-3 text-slate-300">
                      <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-red-400">
                        <Clock size={16} />
                      </div>
                      <span className="uppercase tracking-widest text-[10px] font-bold text-slate-300">
                        Limite: {(() => {
                          try {
                            if (!event.end_date) return 'Sem limite';
                            return format(new Date(event.end_date + 'T00:00:00'), "dd/MM/yyyy");
                          } catch (e) {
                            return event.end_date || 'Data inválida';
                          }
                        })()} às {event.end_time || '--:--'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-slate-300">
                    <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
                      <Users size={16} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xs font-black">{event.registration_count || 0}</span>
                      <span className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">Inscritos</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-end gap-2 md:gap-3 pt-6 border-t border-slate-800">
                <Link
                  to={`/admin/events/${event.id}/registrations`}
                  className="w-12 h-12 bg-slate-800 text-slate-300 hover:text-yellow-400 rounded-2xl flex items-center justify-center transition-all border border-slate-700 shadow-sm"
                  title="Ver Inscritos"
                >
                  <Users size={22} />
                </Link>
                <button
                  onClick={() => handleSaveAsTemplate(event)}
                  className="w-12 h-12 bg-slate-800 text-slate-300 hover:text-green-400 rounded-2xl flex items-center justify-center transition-all border border-slate-700 shadow-sm"
                  title="Salvar como Modelo"
                >
                  <Bookmark size={22} />
                </button>
                <button
                  onClick={() => handleClone(event)}
                  className="w-12 h-12 bg-slate-800 text-slate-300 hover:text-amber-400 rounded-2xl flex items-center justify-center transition-all border border-slate-700 shadow-sm"
                  title="Duplicar Evento"
                >
                  <Copy size={22} />
                </button>
                <button
                  onClick={() => setQrEvent(event)}
                  className="w-12 h-12 bg-slate-800 text-slate-300 hover:text-indigo-400 rounded-2xl flex items-center justify-center transition-all border border-slate-700 shadow-sm"
                  title="Gerar QR Code"
                >
                  <QrCode size={22} />
                </button>
                <button
                  onClick={() => handleOpenModal(event)}
                  className="w-12 h-12 bg-slate-800 text-slate-300 hover:text-yellow-400 rounded-2xl flex items-center justify-center transition-all border border-slate-700 shadow-sm"
                  title="Editar Evento"
                >
                  <Edit2 size={20} />
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="w-12 h-12 bg-red-500/5 text-slate-300 hover:text-red-500 rounded-2xl flex items-center justify-center transition-all border border-red-500/10"
                  title="Excluir"
                >
                  <Trash2 size={22} />
                </button>
              </div>
            </div>
          </div>
        ))}

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
                        <img src={template.image_url || undefined} alt="" className="w-full h-full object-cover opacity-80" />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    >
                      <option value="" className="bg-slate-900">Selecione...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id} className="bg-slate-900">{cat.name}</option>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                    {['name', 'surname', 'grade', 'class'].map(preset => (
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
