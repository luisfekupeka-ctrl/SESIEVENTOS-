import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Event, Category, FormField, EventTemplate } from '../types';
import { Plus, Trash2, Edit2, X, Check, Calendar, Clock, FileText, ShieldCheck, List, ChevronDown, ChevronUp, Users, Lock, Copy, Bookmark, Sparkles, TrendingUp, AlertTriangle, QrCode, Download, UploadCloud, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { GRADES, CLASSES } from '../constants';

export default function AdminEvents() {
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
    onConfirm: () => {},
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [qrEvent, setQrEvent] = useState<Event | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  useEffect(() => {
    fetchData();

    const eventsChannel = supabase.channel('events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchData())
      .subscribe();

    const categoriesChannel = supabase.channel('categories_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchData())
      .subscribe();

    const templatesChannel = supabase.channel('templates_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_templates' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(templatesChannel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [{ data: eventsData }, { data: catsData }, { data: tempsData }] = await Promise.all([
        supabase.from('events').select('*').order('start_date', { ascending: false }),
        supabase.from('categories').select('*'),
        supabase.from('event_templates').select('*')
      ]);

      if (eventsData) setEvents(eventsData as Event[]);
      if (catsData) setCategories(catsData as Category[]);
      if (tempsData) setTemplates(tempsData as EventTemplate[]);
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

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
          
          // Update local state immediately for instant feedback
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
        <p className="text-slate-500 font-bold">Sincronizando eventos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Gerenciar Eventos</h1>
          <p className="text-slate-500 font-bold">Crie, edite e acompanhe todos os eventos escolares.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => setShowTemplates(true)}
            className="bg-white/5 text-slate-400 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all border border-white/5 flex items-center gap-3"
          >
            <Bookmark size={20} className="text-yellow-500" /> Modelos
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-yellow-500 text-black px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] flex items-center gap-3"
          >
            <Plus size={20} /> Novo Evento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {events.map(event => (
          <div key={event.id} className="bg-[#0A0A0A] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden hover:border-yellow-500/20 transition-all flex flex-col md:flex-row group">
            <div className="w-full md:w-64 h-64 md:h-auto bg-white/5 flex-shrink-0 relative overflow-hidden">
              <img src={event.image_url || undefined} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent md:hidden"></div>
            </div>
            <div className="p-10 flex-grow flex flex-col justify-between relative">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <span className="bg-yellow-500/10 text-yellow-500 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-[0.2em] border border-yellow-500/20">
                    {categories.find(c => c.id === event.category_id)?.name || 'Sem Categoria'}
                  </span>
                  {event.password_protected && (
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                      <Lock size={14} className="text-blue-500" /> Protegido
                    </div>
                  )}
                </div>
                <h3 className="text-3xl font-black text-white mb-6 group-hover:text-yellow-500 transition-colors tracking-tight">{event.name}</h3>
                
                <div className="flex flex-wrap gap-8 text-sm font-bold">
                  <div className="flex items-center gap-3 text-slate-400">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-yellow-500">
                      <Calendar size={18} />
                    </div>
                    <span className="uppercase tracking-widest">
                      {(() => {
                        try {
                          return format(new Date(event.start_date), "dd/MM/yyyy");
                        } catch (e) {
                          return event.start_date;
                        }
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-blue-500">
                      <Clock size={18} />
                    </div>
                    <span className="uppercase tracking-widest">{event.start_time} - {event.end_time}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400">
                      <Users size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-600 uppercase tracking-widest">Inscritos</span>
                      <span className="text-white">{event.registration_count || 0} {event.max_capacity && event.max_capacity > 0 ? `/ ${event.max_capacity}` : ''}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex items-center justify-end gap-3 pt-6 border-t border-white/5">
                <Link
                  to={`/admin/events/${event.id}/registrations`}
                  className="w-12 h-12 bg-white/5 text-slate-400 hover:text-blue-400 rounded-2xl flex items-center justify-center transition-all border border-white/5"
                  title="Ver Inscritos"
                >
                  <Users size={22} />
                </Link>
                <button
                  onClick={() => handleSaveAsTemplate(event)}
                  className="w-12 h-12 bg-white/5 text-slate-400 hover:text-green-500 rounded-2xl flex items-center justify-center transition-all border border-white/5"
                  title="Salvar como Modelo"
                >
                  <Bookmark size={22} />
                </button>
                <button
                  onClick={() => handleClone(event)}
                  className="w-12 h-12 bg-white/5 text-slate-400 hover:text-amber-500 rounded-2xl flex items-center justify-center transition-all border border-white/5"
                  title="Duplicar Evento"
                >
                  <Copy size={22} />
                </button>
                <button
                  onClick={() => setQrEvent(event)}
                  className="w-12 h-12 bg-white/5 text-slate-400 hover:text-indigo-400 rounded-2xl flex items-center justify-center transition-all border border-white/5"
                  title="Gerar QR Code"
                >
                  <QrCode size={22} />
                </button>
                <button
                  onClick={() => handleOpenModal(event)}
                  className="w-12 h-12 bg-white/5 text-slate-400 hover:text-yellow-500 rounded-2xl flex items-center justify-center transition-all border border-white/5"
                  title="Editar"
                >
                  <Edit2 size={22} />
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="w-12 h-12 bg-red-500/5 text-slate-400 hover:text-red-500 rounded-2xl flex items-center justify-center transition-all border border-red-500/10"
                  title="Excluir"
                >
                  <Trash2 size={22} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0A0A0A] w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/10">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500/10 text-yellow-500 rounded-2xl flex items-center justify-center">
                  <Bookmark size={24} />
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight">Biblioteca de Modelos</h2>
              </div>
              <button onClick={() => setShowTemplates(false)} className="w-10 h-10 bg-white/5 text-slate-500 hover:text-white rounded-xl flex items-center justify-center transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto max-h-[60vh] space-y-6">
              {templates.length === 0 ? (
                <div className="text-center py-20">
                  <Bookmark size={60} className="mx-auto text-slate-800 mb-6 opacity-20" />
                  <p className="text-slate-500 font-bold text-lg">Nenhum modelo salvo ainda.</p>
                </div>
              ) : (
                templates.map(template => (
                  <div key={template.id} className="flex items-center justify-between p-6 bg-white/[0.02] rounded-3xl border border-white/5 hover:border-yellow-500/30 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 flex-shrink-0">
                        <img src={template.image_url || undefined} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white mb-1">{template.name}</h4>
                        <p className="text-xs font-bold text-slate-500 line-clamp-1">{template.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleUseTemplate(template)}
                        className="px-6 py-3 bg-yellow-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-yellow-400 transition-all flex items-center gap-2"
                      >
                        <Sparkles size={16} /> Usar
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="w-10 h-10 bg-red-500/5 text-slate-500 hover:text-red-500 rounded-xl flex items-center justify-center transition-colors"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0A0A0A] w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/10">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <h2 className="text-3xl font-black text-white tracking-tight">
                {editingEvent ? 'Editar Evento' : 'Criar Novo Evento'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); setSelectedImageFile(null); }} className="w-10 h-10 bg-white/5 text-slate-500 hover:text-white rounded-xl flex items-center justify-center transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-10 space-y-12 custom-scrollbar">
              {/* Basic Info */}
              <section className="space-y-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-yellow-500/10 text-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Informações Básicas</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nome do Evento</label>
                    <input
                      type="text"
                      required
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-white font-bold"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Categoria</label>
                    <select
                      required
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-white font-bold appearance-none"
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    >
                      <option value="" className="bg-black">Selecione...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id} className="bg-black">{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Descrição Completa</label>
                  <textarea
                    rows={4}
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-white font-bold"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-6 pt-6 border-t border-white/5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Capa do Evento</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-center">
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
                        <UploadCloud size={40} className="mx-auto text-slate-700 group-hover:text-yellow-500 transition-colors mb-4" />
                        <p className="text-sm font-black text-white uppercase tracking-widest mb-1">Upload de Arquivo</p>
                        <p className="text-xs font-bold text-slate-500 uppercase">PNG, JPG ou WEBP</p>
                        {selectedImageFile && <p className="mt-4 text-xs font-black text-yellow-500 underline uppercase">{selectedImageFile.name}</p>}
                      </label>
                    </div>
                    <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col justify-center">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Ou Cole o Link</label>
                      <input
                        type="url"
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-white font-bold"
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
                  <div className="w-12 h-12 bg-yellow-500/10 text-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Clock size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Data e Duração</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Início</label>
                    <input type="date" required className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:outline-none" value={formData.start_date || ''} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Hora</label>
                    <input type="time" required className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:outline-none" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Término</label>
                    <input type="date" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:outline-none" value={formData.end_date || ''} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Vagas</label>
                    <input type="number" placeholder="0 = Ilimitado" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:outline-none" value={formData.max_capacity || ''} onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              </section>

              {/* Custom Form Fields */}
              <section className="space-y-8 pt-8 border-t border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-500/10 text-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <List size={24} />
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Formulário de Inscrição</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['name', 'surname', 'grade', 'class'].map(preset => (
                      <button key={preset} type="button" onClick={() => addPresetField(preset as any)} className="px-4 py-2 bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-yellow-500 hover:text-black transition-all border border-white/5">
                        + {preset}
                      </button>
                    ))}
                    <button type="button" onClick={addFormField} className="px-4 py-2 bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-yellow-400 transition-all flex items-center gap-2">
                      <Plus size={14} /> Custom
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {formData.form_fields?.map((field) => (
                    <div key={field.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col md:flex-row gap-6 items-center">
                      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <input type="text" placeholder="Nome do Campo" className="px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:outline-none" value={field.label} onChange={(e) => updateFormField(field.id, { label: e.target.value })} />
                        <select className="px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:outline-none appearance-none" value={field.type} onChange={(e) => updateFormField(field.id, { type: e.target.value as any })}>
                          <option value="text" className="bg-black">Texto</option>
                          <option value="select" className="bg-black">Lista</option>
                        </select>
                      </div>
                      <button type="button" onClick={() => removeFormField(field.id)} className="w-12 h-12 bg-red-500/5 text-slate-500 hover:text-red-500 rounded-xl flex items-center justify-center transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <div className="pt-10 flex justify-end gap-6">
                <button type="button" onClick={() => { setIsModalOpen(false); setSelectedImageFile(null); }} className="px-8 py-4 text-slate-500 font-black uppercase tracking-widest text-xs hover:text-white transition-colors">Cancelar</button>
                <button type="submit" disabled={isUploading} className="px-16 py-4 bg-yellow-500 text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-yellow-400 transition-all shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                  {isUploading ? 'Salvando...' : 'Finalizar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modals & QR Code omitted for brevity, but they should follow the same pattern */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0A0A0A] w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border border-white/10 text-center">
            <h3 className="text-3xl font-black text-white mb-4 tracking-tight">{confirmModal.title}</h3>
            <p className="text-slate-400 mb-10 font-bold text-lg leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} className="flex-grow py-4 bg-white/5 text-slate-400 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-white/10 transition-all">Voltar</button>
              <button onClick={confirmModal.onConfirm} className={`flex-grow py-4 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-lg ${confirmModal.confirmColor || 'bg-blue-600 hover:bg-blue-700'}`}>{confirmModal.confirmText || 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}

      {qrEvent && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0A0A0A] w-full max-w-sm rounded-[3rem] shadow-2xl p-10 text-center border border-white/10">
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">QR Code</h3>
            <p className="text-sm font-bold text-slate-500 mb-10 uppercase tracking-widest">{qrEvent.name}</p>
            <div className="bg-white p-6 rounded-[2rem] inline-block shadow-2xl mb-10">
              <QRCodeSVG id="event-qrcode" value={`${window.location.origin}/event/${qrEvent.id}`} size={200} level="H" includeMargin={true} />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setQrEvent(null)} className="flex-grow py-4 bg-white/5 text-slate-400 font-black uppercase tracking-widest text-xs rounded-2xl">Voltar</button>
              <button onClick={() => {
                const svg = document.getElementById('event-qrcode');
                if (!svg) return;
                const svgData = new XMLSerializer().serializeToString(svg);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new window.Image();
                img.onload = () => {
                  canvas.width = img.width;
                  canvas.height = img.height;
                  ctx?.drawImage(img, 0, 0);
                  const pngFile = canvas.toDataURL('image/png');
                  const downloadLink = document.createElement('a');
                  downloadLink.download = `qrcode.png`;
                  downloadLink.href = pngFile;
                  downloadLink.click();
                };
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
              }} className="flex-grow py-4 bg-yellow-500 text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-yellow-400 transition-all flex items-center justify-center gap-2">
                <Download size={18} /> Baixar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedback && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center border border-white/10">
            <div className={`w-20 h-20 ${feedback.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} rounded-[1.5rem] flex items-center justify-center mb-8 mx-auto shadow-lg`}>
              {feedback.type === 'success' ? <TrendingUp size={40} /> : <AlertTriangle size={40} />}
            </div>
            <h2 className="text-3xl font-black text-white mb-3 tracking-tight">{feedback.type === 'success' ? 'Sucesso!' : 'Erro'}</h2>
            <p className="text-slate-400 mb-10 font-bold text-lg">{feedback.message}</p>
            <button onClick={() => setFeedback(null)} className="w-full py-4 bg-white/5 text-white font-black uppercase tracking-widest text-xs rounded-2xl">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
