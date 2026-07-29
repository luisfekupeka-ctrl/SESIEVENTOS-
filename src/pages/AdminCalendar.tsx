import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Event } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  ExternalLink,
  Loader2
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { getEventImage } from '../utils/getEventImage';

export default function AdminCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const fetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchEvents = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setBackgroundLoading(true);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents(data as Event[]);
    } catch (err) {
      console.error("Error fetching events for calendar:", err);
    } finally {
      setLoading(false);
      setBackgroundLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    const debouncedFetch = () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        fetchEvents(true);
      }, 1500); // 1.5s debounce for calendar
    };

    const channel = supabase
      .channel('calendar_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, debouncedFetch)
      .subscribe();

    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => {
    return (
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">Agenda SESI</h1>
          <p className="text-yellow-400 font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-4 bg-slate-900 p-1.5 md:p-2 rounded-[2rem] border border-slate-800 shadow-xl">
          <button
            onClick={prevMonth}
            className="w-10 h-10 md:w-12 md:h-12 bg-slate-950 text-slate-400 hover:text-white rounded-xl md:rounded-2xl flex items-center justify-center transition-all border border-slate-800"
          >
            <ChevronLeft size={20} className="md:w-6 md:h-6" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 md:px-8 py-2.5 md:py-3 bg-yellow-400 text-black rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20"
          >
            Hoje
          </button>
          <button
            onClick={nextMonth}
            className="w-10 h-10 md:w-12 md:h-12 bg-slate-950 text-slate-400 hover:text-white rounded-xl md:rounded-2xl flex items-center justify-center transition-all border border-slate-800"
          >
            <ChevronRight size={20} className="md:w-6 md:h-6" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (
      <div className="grid grid-cols-7 mb-4 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
        {days.map((day, i) => (
          <div key={i} className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] py-5">
            {day}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="w-16 h-16 text-yellow-400 animate-spin mb-8 shadow-[0_0_20px_rgba(234,179,8,0.3)]" />
        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">Carregando agenda...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#020617] min-h-screen">
      {renderHeader()}
      <div className="bg-slate-900/40 p-2 md:p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden mb-16 backdrop-blur-sm">
        {renderDays()}
        <div className="grid grid-cols-7 gap-px bg-slate-800 border border-slate-800 rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl">
          {eachDayOfInterval({
            start: startOfWeek(startOfMonth(currentMonth)),
            end: endOfWeek(endOfMonth(currentMonth)),
          }).map((day, i) => {
            const dayEvents = events.filter(event => isSameDay(parseISO(event.start_date), day));
            const isSelectedMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={i}
                className={`min-h-[70px] md:min-h-[140px] p-2 md:p-4 flex flex-col gap-1 md:gap-3 transition-all ${
                  !isSelectedMonth ? 'bg-slate-950 opacity-20' : 'bg-slate-900 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] md:text-sm font-black tracking-tighter ${
                    !isSelectedMonth ? 'text-slate-700' : 
                    isToday ? 'bg-yellow-400 text-black w-5 h-5 md:w-8 md:h-8 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-yellow-400/20' : 
                    'text-white'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && isSelectedMonth && (
                    <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(234,179,8,1)] animate-pulse" />
                  )}
                </div>
                
                <div className="flex-grow flex flex-col gap-1 md:gap-2 overflow-y-auto max-h-[40px] md:max-h-[90px] custom-scrollbar pr-0.5">
                  <div className="flex flex-wrap gap-0.5 md:hidden">
                    {dayEvents.map(e => (
                      <div key={e.id} className="w-1.5 h-1.5 rounded-full bg-yellow-400/50" />
                    ))}
                  </div>
                  <div className="hidden md:flex flex-col gap-2">
                    {dayEvents.map(event => (
                      <Link key={event.id} to={`/admin/events`} className="group">
                        <div className="px-3 py-2 bg-slate-950/50 border-l-2 border-yellow-400 rounded-lg flex flex-col gap-1 hover:bg-slate-950 transition-all group-hover:translate-x-1 border border-transparent hover:border-slate-800">
                          <p className="text-[10px] font-black text-white truncate leading-tight uppercase tracking-tight group-hover:text-yellow-400 transition-colors">
                            {event.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                            <Clock size={10} className="text-yellow-400/50" />
                            {event.start_time}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-20">
        <div className="flex items-center gap-6 mb-12">
          <div className="w-12 h-12 bg-yellow-400/10 text-yellow-400 rounded-2xl flex items-center justify-center border border-yellow-400/10 shadow-lg shadow-yellow-400/5">
            <CalendarIcon size={24} />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">
            Radar de Eventos
          </h3>
          <div className="h-px flex-grow bg-slate-800/50"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events
            .filter(e => parseISO(e.start_date) >= startOfMonth(currentMonth))
            .slice(0, 6)
            .map(event => (
              <div key={event.id} className="bg-slate-900/60 p-6 rounded-[2rem] border border-slate-800 shadow-2xl hover:border-yellow-400/30 transition-all flex items-center justify-between group backdrop-blur-sm">
                <div className="flex items-center gap-5 overflow-hidden">
                  <div className="w-16 h-16 bg-slate-950 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-800 group-hover:border-yellow-400/20 transition-all shadow-inner">
                    <img src={event.image_url || getEventImage(event.name) || undefined} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" referrerPolicy="no-referrer" />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-base font-black text-white group-hover:text-yellow-400 transition-colors truncate tracking-tight">{event.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      {(() => {
                        try {
                          return format(parseISO(event.start_date), "dd 'DE' MMMM", { locale: ptBR });
                        } catch (e) {
                          return event.start_date;
                        }
                      })()}
                    </p>
                  </div>
                </div>
                <Link to="/admin/events" className="w-11 h-11 bg-slate-950 text-slate-500 hover:text-yellow-400 rounded-xl flex items-center justify-center transition-all border border-slate-800 shadow-sm">
                  <ExternalLink size={18} />
                </Link>
              </div>
            ))}
          {events.length === 0 && (
            <div className="col-span-full py-24 text-center bg-slate-900/40 rounded-[3rem] border border-dashed border-slate-800 shadow-inner">
              <CalendarIcon size={48} className="mx-auto text-slate-800 mb-6" />
              <p className="text-slate-500 font-black uppercase tracking-[0.2em]">Sem eventos detectados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
