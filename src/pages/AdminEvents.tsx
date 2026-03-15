import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Event, Category, FormField, EventRestrictions, EventTemplate } from '../types';
import { Plus, Trash2, Edit2, X, Check, Calendar, Clock, Image, FileText, ShieldCheck, List, Settings, ChevronDown, ChevronUp, Users, Lock, Eye, EyeOff, Copy, Bookmark, Save, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(formData)
          .eq('id', editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('events')
          .insert({ ...formData, registration_count: 0 });
        if (error) throw error;
      }
      setIsModalOpen(false);
      setFeedback({ type: 'success', message: 'Evento salvo com sucesso!' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Erro ao salvar evento.' });
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
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) console.error(error);
        setConfirmModal(prev => ({ ...prev, show: false }));
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
    setFormData({ ...formData, form_fields: [...(formData.form_fields || []), newField] });
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
    
    setFormData({ ...formData, form_fields: [...(formData.form_fields || []), newField] });
  };

  const removeFormField = (id: string) => {
    setFormData({ ...formData, form_fields: formData.form_fields?.filter(f => f.id !== id) });
  };

  const updateFormField = (id: string, updates: Partial<FormField>) => {
    setFormData({
      ...formData,
      form_fields: formData.form_fields?.map(f => f.id === id ? { ...f, ...updates } : f)
    });
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Gerenciar Eventos</h1>
          <p className="text-slate-500 font-medium">Crie, edite e acompanhe todos os eventos escolares.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTemplates(true)}
            className="bg-amber-50 text-amber-600 px-6 py-3 rounded-xl font-bold hover:bg-amber-100 transition-all border border-amber-100 flex items-center gap-2"
          >
            <Bookmark size={20} /> Biblioteca de Modelos
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-[#0054A6] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#004080] transition-all shadow-lg flex items-center gap-2"
          >
            <Plus size={20} /> Novo Evento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {events.map(event => (
          <div key={event.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col md:flex-row">
            <div className="w-full md:w-48 h-48 md:h-auto bg-slate-100 flex-shrink-0">
              <img src={event.image_url || undefined} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="p-6 flex-grow flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-[#0054A6]/10 text-[#0054A6] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {categories.find(c => c.id === event.category_id)?.name || 'Sem Categoria'}
                  </span>
                  {event.password_protected && <Lock size={14} className="text-slate-400" />}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">{event.name}</h3>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={16} className="text-[#0054A6]" />
                    {format(new Date(event.start_date), "dd/MM/yyyy")}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={16} className="text-[#0054A6]" />
                    {event.start_time} - {event.end_time}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={16} className="text-[#0054A6]" />
                    {event.registration_count || 0} {event.max_capacity && event.max_capacity > 0 ? `/ ${event.max_capacity}` : ''} inscritos
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <Link
                  to={`/admin/events/${event.id}/registrations`}
                  className="p-2.5 text-slate-400 hover:text-[#0054A6] hover:bg-[#0054A6]/5 rounded-xl transition-all flex items-center gap-2 text-sm font-bold"
                  title="Ver Inscritos"
                >
                  <Users size={20} />
                  <span className="hidden sm:inline">Inscritos</span>
                </Link>
                <button
                  onClick={() => handleSaveAsTemplate(event)}
                  className="p-2.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                  title="Salvar como Modelo"
                >
                  <Bookmark size={20} />
                </button>
                <button
                  onClick={() => handleClone(event)}
                  className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                  title="Duplicar Evento"
                >
                  <Copy size={20} />
                </button>
                <button
                  onClick={() => handleOpenModal(event)}
                  className="p-2.5 text-slate-400 hover:text-[#0054A6] hover:bg-[#0054A6]/5 rounded-xl transition-all"
                  title="Editar"
                >
                  <Edit2 size={20} />
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Excluir"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                  <Bookmark size={20} />
                </div>
                <h2 className="text-2xl font-black text-slate-900">Biblioteca de Modelos</h2>
              </div>
              <button onClick={() => setShowTemplates(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <Bookmark size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-500 font-medium">Nenhum modelo salvo ainda.</p>
                  <p className="text-xs text-slate-400 mt-2">Salve um evento como modelo para vê-lo aqui.</p>
                </div>
              ) : (
                templates.map(template => (
                  <div key={template.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-amber-200 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                        <img src={template.image_url || undefined} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{template.name}</h4>
                        <p className="text-xs text-slate-500 line-clamp-1">{template.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUseTemplate(template)}
                        className="px-4 py-2 bg-amber-100 text-amber-600 text-sm font-bold rounded-xl hover:bg-amber-200 transition-all flex items-center gap-2"
                      >
                        <Sparkles size={16} /> Usar
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 text-center">
              <p className="text-xs text-slate-400 font-medium">
                Modelos salvos não são excluídos quando você reseta o sistema.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-2xl font-black text-slate-900">
                {editingEvent ? 'Editar Evento' : 'Criar Novo Evento'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-8 space-y-10">
              {/* Basic Info */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#0054A6] text-white rounded-xl flex items-center justify-center shadow-md">
                    <FileText size={20} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Informações Básicas</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nome do Evento</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Categoria</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] transition-all"
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Descrição Completa</label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] transition-all"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">URL da Imagem</label>
                  <input
                    type="url"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] transition-all"
                    placeholder="https://exemplo.com/imagem.jpg"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>
              </section>

              {/* Date and Time */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#0054A6] text-white rounded-xl flex items-center justify-center shadow-md">
                    <Clock size={20} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Data e Duração</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Data Inicial</label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] transition-all"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Hora Inicial</label>
                    <input
                      type="time"
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] transition-all"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Data Final</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] transition-all"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Hora Final</label>
                    <input
                      type="time"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] transition-all"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Duração (Texto)</label>
                    <input
                      type="text"
                      placeholder="Ex: 2 horas, 3 dias"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] transition-all"
                      value={formData.duration || ''}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Limite de Vagas</label>
                    <input
                      type="number"
                      placeholder="0 = Ilimitado"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] transition-all"
                      value={formData.max_capacity || ''}
                      onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </section>

              {/* Restrictions and Security */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#0054A6] text-white rounded-xl flex items-center justify-center shadow-md">
                    <ShieldCheck size={20} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Restrições e Segurança</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700">Quem pode participar?</label>
                    <div className="space-y-2">
                      {['all', 'years', 'classes', 'collaborators'].map(type => (
                        <div key={type} className="space-y-2">
                          <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                              type="radio"
                              name="restrictionType"
                              className="w-4 h-4 text-[#0054A6]"
                              checked={formData.restrictions?.type === type}
                              onChange={() => setFormData({ ...formData, restrictions: { type: type as any, values: [] } })}
                            />
                            <span className="text-sm font-medium text-slate-700 capitalize">
                              {type === 'all' ? 'Aberto para todos' : 
                               type === 'years' ? 'Anos escolares específicos' :
                               type === 'classes' ? 'Turmas específicas' : 'Apenas colaboradores'}
                            </span>
                          </label>
                          
                          {formData.restrictions?.type === type && (type === 'years' || type === 'classes') && (
                            <div className="pl-8 flex flex-wrap gap-2">
                              {(type === 'years' ? GRADES : CLASSES).map(val => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => {
                                    const current = formData.restrictions?.values || [];
                                    const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
                                    setFormData({ ...formData, restrictions: { ...formData.restrictions!, values: next } });
                                  }}
                                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                    formData.restrictions?.values.includes(val)
                                      ? 'bg-[#0054A6] text-white'
                                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                  }`}
                                >
                                  {type === 'classes' ? `Turma ${val}` : val}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700">Proteção por Senha</label>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded text-[#0054A6]"
                          checked={formData.password_protected}
                          onChange={(e) => setFormData({ ...formData, password_protected: e.target.checked })}
                        />
                        <span className="text-sm font-bold text-slate-700">Ativar senha para inscrição</span>
                      </label>
                      {formData.password_protected && (
                        <input
                          type="text"
                          placeholder="Defina a senha do evento"
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Custom Form Fields */}
              <section className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0054A6] text-white rounded-xl flex items-center justify-center shadow-md">
                      <List size={20} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">Formulário de Inscrição</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addPresetField('name')}
                      className="text-xs font-bold text-[#0054A6] bg-[#0054A6]/5 px-3 py-1.5 rounded-lg hover:bg-[#0054A6]/10 transition-colors"
                    >
                      + Nome
                    </button>
                    <button
                      type="button"
                      onClick={() => addPresetField('surname')}
                      className="text-xs font-bold text-[#0054A6] bg-[#0054A6]/5 px-3 py-1.5 rounded-lg hover:bg-[#0054A6]/10 transition-colors"
                    >
                      + Sobrenome
                    </button>
                    <button
                      type="button"
                      onClick={() => addPresetField('grade')}
                      className="text-xs font-bold text-[#0054A6] bg-[#0054A6]/5 px-3 py-1.5 rounded-lg hover:bg-[#0054A6]/10 transition-colors"
                    >
                      + Série (Lista)
                    </button>
                    <button
                      type="button"
                      onClick={() => addPresetField('class')}
                      className="text-xs font-bold text-[#0054A6] bg-[#0054A6]/5 px-3 py-1.5 rounded-lg hover:bg-[#0054A6]/10 transition-colors"
                    >
                      + Turma (Lista)
                    </button>
                    <button
                      type="button"
                      onClick={addFormField}
                      className="text-sm font-bold text-slate-400 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus size={16} /> Personalizado
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dica de Organização</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Para que o sistema organize automaticamente os participantes no banco de dados, use os nomes: 
                      <strong className="text-slate-600"> Nome</strong>, 
                      <strong className="text-slate-600"> Sobrenome</strong>, 
                      <strong className="text-slate-600"> Série</strong> e 
                      <strong className="text-slate-600"> Turma</strong>.
                    </p>
                  </div>

                  {formData.form_fields?.map((field, index) => (
                    <div key={field.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center">
                      <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                        <input
                          type="text"
                          placeholder="Rótulo do campo (ex: Nome)"
                          className="px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          value={field.label}
                          onChange={(e) => updateFormField(field.id, { label: e.target.value })}
                        />
                        <select
                          className="px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          value={field.type}
                          onChange={(e) => updateFormField(field.id, { type: e.target.value as any })}
                        >
                          <option value="text">Texto Simples</option>
                          <option value="select">Lista de Opções</option>
                        </select>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded text-[#0054A6]"
                            checked={field.required}
                            onChange={(e) => updateFormField(field.id, { required: e.target.checked })}
                          />
                          <span className="text-sm font-medium text-slate-600">Obrigatório</span>
                        </label>
                      </div>
                      
                      {field.type === 'select' && (
                        <div className="w-full md:w-auto flex-grow">
                          <input
                            type="text"
                            placeholder="Opções (separadas por vírgula)"
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                            value={field.options?.join(', ') || ''}
                            onChange={(e) => updateFormField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => removeFormField(field.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <div className="pt-8 border-t border-slate-100 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-12 py-3 bg-[#0054A6] text-white font-bold rounded-xl hover:bg-[#004080] transition-all shadow-lg"
                >
                  Salvar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedback && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
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

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-black text-slate-900 mb-4">{confirmModal.title}</h3>
            <p className="text-slate-500 mb-8 font-medium">
              {confirmModal.message}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="flex-grow py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`flex-grow py-3 text-white font-bold rounded-xl transition-all shadow-lg ${confirmModal.confirmColor || 'bg-[#0054A6] hover:bg-[#004080]'}`}
              >
                {confirmModal.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
