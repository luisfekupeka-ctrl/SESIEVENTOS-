import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Event } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  ExternalLink
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

export default function AdminCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();

    const channel = supabase
      .channel('calendar_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchEvents())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEvents = async () => {
    try {
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
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => {
    return (
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 text-center md:text-left tracking-tight">Calendário de Eventos</h1>
          <p className="text-yellow-500 font-black uppercase tracking-[0.3em] text-xs text-center md:text-left">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-4 bg-black p-2 rounded-[2rem] border border-white/5">
          <button
            onClick={prevMonth}
            className="w-12 h-12 bg-black text-slate-400 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-white/5"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-8 py-3 bg-yellow-500 text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)]"
          >
            Hoje
          </button>
          <button
            onClick={nextMonth}
            className="w-12 h-12 bg-black text-slate-400 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-white/5"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (
      <div className="grid grid-cols-7 mb-4 bg-white/[0.02] rounded-2xl overflow-hidden border border-white/5">
        {days.map((day, i) => (
          <div key={i} className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] py-5">
            {day}
          </div>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40">
      <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-8 shadow-[0_0_20px_rgba(234,179,8,0.2)]"></div>
      <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">Sincronizando Agenda...</p>
    </div>
  );

  return (
    <div className="p-0 md:p-0">
      {renderHeader()}
      <div className="bg-[#0A0A0A] p-2 md:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden mb-16">
        {renderDays()}
        <div className="grid grid-cols-7 gap-px md:gap-1 bg-black border border-white/5 rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl">
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
                className={`min-h-[70px] md:min-h-[140px] p-2 md:p-4 flex flex-col gap-1 md:gap-3 transition-colors ${
                  !isSelectedMonth ? 'bg-[#050505] opacity-20' : 'bg-[#0A0A0A]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] md:text-sm font-black tracking-tighter ${
                    !isSelectedMonth ? 'text-slate-800' : 
                    isToday ? 'bg-sky-500 text-black w-5 h-5 md:w-8 md:h-8 rounded-lg md:rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.4)]' : 
                    'text-white'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && isSelectedMonth && (
                    <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
                  )}
                </div>
                
                {/* Mobile: Dots only | Desktop: Event Cards */}
                <div className="flex-grow flex flex-col gap-1 md:gap-2 overflow-y-auto max-h-[40px] md:max-h-[90px] custom-scrollbar pr-0.5">
                  <div className="flex flex-wrap gap-0.5 md:hidden">
                    {dayEvents.map(e => (
                      <div key={e.id} className="w-1 h-1 rounded-full bg-sky-500/50" />
                    ))}
                  </div>
                  <div className="hidden md:flex flex-col gap-2">
                    {dayEvents.map(event => (
                      <Link key={event.id} to={`/admin/events`} className="group">
                        <div className="px-3 py-2 bg-white/[0.03] border-l-2 border-sky-500 rounded-lg flex flex-col gap-1 hover:bg-white/[0.06] transition-all group-hover:translate-x-1">
                          <p className="text-[10px] font-black text-white truncate leading-tight uppercase tracking-tight group-hover:text-sky-500 transition-colors">
                            {event.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                            <Clock size={10} className="text-yellow-500/50" />
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

      {/* Upcoming Events List */}
      <div className="mt-20">
        <div className="flex items-center gap-6 mb-12">
          <div className="w-12 h-12 bg-yellow-500/10 text-yellow-500 rounded-2xl flex items-center justify-center border border-yellow-500/10">
            <CalendarIcon size={24} />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight uppercase">
            Radar de Eventos
          </h3>
          <div className="h-px flex-grow bg-black"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events
            .filter(e => parseISO(e.start_date) >= startOfMonth(currentMonth))
            .slice(0, 6)
            .map(event => (
              <div key={event.id} className="bg-[#0A0A0A] p-6 rounded-[2rem] border border-white/5 shadow-xl hover:border-yellow-500/30 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-5 overflow-hidden">
                  <div className="w-16 h-16 bg-black rounded-2xl overflow-hidden flex-shrink-0 border border-white/5 group-hover:border-yellow-500/20 transition-all">
                    <img src={event.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-base font-black text-white group-hover:text-yellow-500 transition-colors truncate tracking-tight">{event.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
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
                <Link to="/admin/events" className="w-10 h-10 bg-black text-slate-700 hover:text-yellow-500 rounded-xl flex items-center justify-center transition-all">
                  <ExternalLink size={18} />
                </Link>
              </div>
            ))}
          {events.length === 0 && (
            <div className="col-span-full py-24 text-center bg-white/[0.01] rounded-[3rem] border border-dashed border-white/10">
              <CalendarIcon size={48} className="mx-auto text-slate-800 mb-6 opacity-20" />
              <p className="text-slate-600 font-black uppercase tracking-[0.2em]">Sem eventos detectados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
