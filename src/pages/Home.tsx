import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Event, Category } from '../types';
import { EventCard } from '../components/EventCard';
import { Search, Filter } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden bg-black">
        <div className="absolute inset-0 opacity-40">
          <img
            src="https://picsum.photos/seed/sesi/1920/1080?blur=4"
            alt="Background"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black"></div>
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-5xl md:text-8xl font-black text-white mb-8 leading-[1.1] tracking-tighter"
          >
            Explore os <span className="text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]">Eventos</span> <br/>
            do <span className="text-sky-500">SESI</span>
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
        <div className="bg-[#0A0A0A]/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 p-8 flex flex-col md:flex-row gap-6 items-center transition-all hover:border-sky-500/20">
          <div className="relative flex-grow w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-yellow-500" size={24} />
            <input
              type="text"
              placeholder="Pesquisar eventos por nome ou descrição..."
              className="w-full pl-14 pr-6 py-4 bg-black border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all text-white font-bold placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-grow md:w-80">
              <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-yellow-500" size={20} />
              <select
                className="w-full pl-14 pr-10 py-4 bg-black border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all appearance-none cursor-pointer text-white font-bold"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Todas as Categorias</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-black text-white">{cat.name}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-yellow-500">
                <Filter size={16} className="rotate-90" />
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
          <div className="text-center py-32 bg-[#0A0A0A] rounded-[3rem] border-2 border-dashed border-white/5 transition-colors">
            <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center mx-auto mb-8">
              <Search className="text-slate-700" size={48} />
            </div>
            <h3 className="text-3xl font-black text-white mb-4">Nenhum evento encontrado</h3>
            <p className="text-slate-500 font-bold text-lg max-w-md mx-auto">Tente ajustar seus filtros para descobrir novas oportunidades.</p>
          </div>
        )}
      </div>
    </div>
  );
}
