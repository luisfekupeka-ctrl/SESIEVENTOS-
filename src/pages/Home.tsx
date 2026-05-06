import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Event, Category } from '../types';
import { EventCard } from '../components/EventCard';
import { Search, Filter, CalendarDays, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { GRADES } from '../constants';

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Subscribe to changes
    const channel = supabase
      .channel('home_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [eventsRes, categoriesRes] = await Promise.all([
        supabase.from('events').select('*').order('start_date', { ascending: true }),
        supabase.from('categories').select('*')
      ]);

      if (eventsRes.data) setEvents(eventsRes.data as Event[]);
      if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
    } catch (error) {
      console.error("Error fetching home data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || event.category_id === selectedCategory;
    
    // Year filter logic: 
    // 1. If 'all' is selected in filter, match all.
    // 2. If an event is 'public' (restrictions.type === 'all'), it matches any year filter.
    // 3. If an event is restricted by years, it must include the selected year.
    const restrictions = event.restrictions as any;
    const matchesYear = selectedYear === 'all' || 
                       restrictions.type === 'all' || 
                       (restrictions.type === 'years' && restrictions.values.includes(selectedYear));

    return matchesSearch && matchesCategory && matchesYear;
  });

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden bg-[#e0f2fe]">
        <div className="absolute inset-0 opacity-40">
          <img
            src="https://picsum.photos/seed/sesi/1920/1080?blur=4"
            alt="Background"
            className="w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100/60 via-sky-50/40 to-[#f0f9ff]"></div>
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-5xl md:text-8xl font-black text-slate-900 mb-8 leading-[1.1] tracking-tighter"
          >
            Explore os <span className="text-yellow-500 bg-black px-4 rounded-2xl drop-shadow-sm">Eventos</span> <br/>
            do <span className="text-sky-600">SESI</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-slate-600 font-bold max-w-3xl mx-auto leading-relaxed"
          >
            A sua porta de entrada para oficinas, palestras, esportes e experiências únicas.
          </motion.p>
        </div>
      </section>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20">
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-200 p-8 flex flex-col md:flex-row gap-6 items-center transition-all hover:border-sky-500/20">
          <div className="relative flex-grow w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-sky-500" size={24} />
            <input
              type="text"
              placeholder="Pesquisar eventos por nome ou descrição..."
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all text-slate-900 font-bold placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative flex-grow md:w-64">
              <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-sky-500" size={20} />
              <select
                className="w-full pl-14 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all appearance-none cursor-pointer text-slate-900 font-bold"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Todas as Categorias</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-white text-slate-900">{cat.name}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-sky-500">
                <ChevronDown size={16} />
              </div>
            </div>

            <div className="relative flex-grow md:w-64">
              <CalendarDays className="absolute left-5 top-1/2 -translate-y-1/2 text-sky-500" size={20} />
              <select
                className="w-full pl-14 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all appearance-none cursor-pointer text-slate-900 font-bold"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="all">Todos os Anos</option>
                {GRADES.map(grade => (
                  <option key={grade} value={grade} className="bg-white text-slate-900">{grade}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-sky-500">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-yellow-500 font-black tracking-widest uppercase text-sm">Sincronizando eventos...</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <EventCard
                  event={event}
                  category={categories.find(c => c.id === event.category_id)}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 bg-white rounded-[3rem] border border-slate-200 shadow-sm transition-colors">
            <div className="w-24 h-24 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <Search className="text-sky-300" size={48} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-4">Nenhum evento encontrado</h3>
            <p className="text-slate-500 font-bold text-lg max-w-md mx-auto">Tente ajustar seus filtros para descobrir novas oportunidades.</p>
          </div>
        )}
      </div>
    </div>
  );
}
