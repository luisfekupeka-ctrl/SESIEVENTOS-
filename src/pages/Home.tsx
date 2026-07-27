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
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
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

    // Debounced fetch to avoid thundering herd during high concurrent registrations
    let timeoutId: NodeJS.Timeout;
    const debouncedFetch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchData();
      }, 2000); // Wait 2s after last change
    };

    // Subscribe to changes
    const channel = supabase
      .channel('home_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => debouncedFetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => debouncedFetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(timeoutId);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [eventsRes, categoriesRes, subcatRes] = await Promise.all([
        supabase.from('events').select('*').order('name', { ascending: true }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
        supabase.from('subcategories').select('*').order('name', { ascending: true })
      ]);

      if (eventsRes.data) setEvents(eventsRes.data as Event[]);
      if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
      if (subcatRes.data) setSubcategories(subcatRes.data);
    } catch (error) {
      console.error("Error fetching home data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const qNorm = normalizeString(searchTerm);
    const nameNorm = normalizeString(event.name || '');
    const descNorm = normalizeString(event.description || '');
    
    const matchesSearch = nameNorm.includes(qNorm) || descNorm.includes(qNorm);
    const matchesCategory = selectedCategory === 'all' || event.category_id === selectedCategory;
    const matchesSubcategory = selectedSubcategory === 'all' || event.subcategory_id === selectedSubcategory;
    
    let restrictions = event.restrictions as any;
    if (typeof restrictions === 'string') {
      try { restrictions = JSON.parse(restrictions); } catch { restrictions = null; }
    }
    
    const matchesYear = selectedYear === 'all' || 
                       !restrictions ||
                       restrictions?.type === 'all' || 
                       !restrictions?.type ||
                       (restrictions?.type === 'years' && Array.isArray(restrictions?.values) && restrictions.values.includes(selectedYear));

    // Day filter logic
    let matchesDay = true;
    if (selectedDay !== 'all') {
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
      matchesDay = eventDays.includes(selectedDay);
    }

    return matchesSearch && matchesCategory && matchesSubcategory && matchesYear && matchesDay;
  });

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden bg-[#020617]">
        <div className="absolute inset-0 opacity-40">
          <img
            src="https://picsum.photos/seed/sesi/1920/1080?blur=4"
            alt="Background"
            className="w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-[#020617]/40 to-[#020617]"></div>
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-5xl md:text-8xl font-black text-white mb-8 leading-[1.1] tracking-tighter"
          >
            Explore os <span className="text-yellow-400 bg-slate-950 px-4 rounded-2xl drop-shadow-sm border border-yellow-400/20">Eventos</span> <br/>
            do <span className="text-yellow-400">SESI</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-slate-300 font-bold max-w-3xl mx-auto leading-relaxed"
          >
            A sua porta de entrada para oficinas, palestras, esportes e experiências únicas.
          </motion.p>
        </div>
      </section>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20">
        <div className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-800 p-8 flex flex-col md:flex-row gap-6 items-center transition-all hover:border-yellow-400/20">
          <div className="relative flex-grow w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-yellow-400" size={24} />
            <input
              type="text"
              placeholder="Pesquisar eventos por nome ou descrição..."
              className="w-full pl-14 pr-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all text-white font-bold placeholder:text-slate-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto flex-wrap md:flex-nowrap">
            <div className="relative flex-grow md:w-56">
              <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-yellow-400" size={20} />
              <select
                className="w-full pl-14 pr-10 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all appearance-none cursor-pointer text-white font-bold"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Todas as Categorias</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-slate-950 text-white">{cat.name}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-yellow-400">
                <ChevronDown size={16} />
              </div>
            </div>

            {selectedCategory !== 'all' && subcategories.filter(s => s.category_id === selectedCategory).length > 0 && (
              <div className="relative flex-grow md:w-56">
                <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-yellow-400" size={20} />
                <select
                  className="w-full pl-14 pr-10 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all appearance-none cursor-pointer text-white font-bold"
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                >
                  <option value="all">Todas as Modalidades</option>
                  {subcategories.filter(s => s.category_id === selectedCategory).map(cat => (
                    <option key={cat.id} value={cat.id} className="bg-slate-950 text-white">{cat.name}</option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-yellow-400">
                  <ChevronDown size={16} />
                </div>
              </div>
            )}

            <div className="relative flex-grow md:w-56">
              <CalendarDays className="absolute left-5 top-1/2 -translate-y-1/2 text-yellow-400" size={20} />
              <select
                className="w-full pl-14 pr-10 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all appearance-none cursor-pointer text-white font-bold"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="all">Todos os Anos</option>
                {GRADES.map(grade => (
                  <option key={grade} value={grade} className="bg-slate-950 text-white">{grade}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-yellow-400">
                <ChevronDown size={16} />
              </div>
            </div>

            {activeDays.length > 0 && (
              <div className="relative flex-grow md:w-56">
                <CalendarDays className="absolute left-5 top-1/2 -translate-y-1/2 text-yellow-400" size={20} />
                <select
                  className="w-full pl-14 pr-10 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all appearance-none cursor-pointer text-white font-bold"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                >
                  <option value="all">Todos os Dias</option>
                  {activeDays.map(day => (
                    <option key={day} value={day} className="bg-slate-950 text-white">{day}</option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-yellow-400">
                  <ChevronDown size={16} />
                </div>
              </div>
            )}
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
          <div className="text-center py-32 bg-slate-900/40 rounded-[3rem] border border-slate-800 shadow-2xl transition-colors">
            <div className="w-24 h-24 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-8 border border-slate-800">
              <Search className="text-yellow-400/30" size={48} />
            </div>
            <h3 className="text-3xl font-black text-white mb-4">Nenhum evento encontrado</h3>
            <p className="text-slate-400 font-bold text-lg max-w-md mx-auto leading-relaxed">Tente ajustar seus filtros para descobrir novas oportunidades.</p>
          </div>
        )}
      </div>
    </div>
  );
}
