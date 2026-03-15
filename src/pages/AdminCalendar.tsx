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
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 text-center md:text-left">Calendário de Eventos</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium capitalize text-center md:text-left">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300 shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm"
          >
            Hoje
          </button>
          <button
            onClick={nextMonth}
            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300 shadow-sm"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (
      <div className="grid grid-cols-7 mb-2 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl overflow-hidden">
        {days.map((day, i) => (
          <div key={i} className="text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest py-3">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const allDays = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    return (
      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {allDays.map((day, i) => {
          const dayFormatted = format(day, dateFormat);
          const dayEvents = events.filter(event => isSameDay(parseISO(event.start_date), day));
          const isSelectedMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={i}
              className={`min-h-[120px] p-2 bg-white dark:bg-[#0F172A] flex flex-col gap-1 ${
                !isSelectedMonth ? 'bg-slate-50/50 dark:bg-slate-900/40 opacity-50' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-bold ${
                  !isSelectedMonth ? 'text-slate-300 dark:text-slate-600' : 
                  isToday ? 'bg-[#0054A6] dark:bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center' : 
                  'text-slate-900 dark:text-slate-200'
                }`}>
                  {dayFormatted}
                </span>
              </div>
              <div className="flex-grow flex flex-col gap-1 overflow-y-auto max-h-[100px] custom-scrollbar pr-1">
                {dayEvents.map(event => (
                  <Link
                    key={event.id}
                    to={`/admin/events`}
                    className="group"
                  >
                    <div className="px-2 py-1.5 bg-blue-50 dark:bg-blue-500/10 border-l-4 border-[#0054A6] dark:border-blue-500 rounded flex flex-col gap-0.5 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors cursor-pointer">
                      <p className="text-[10px] font-black text-[#0054A6] dark:text-blue-400 truncate leading-tight group-hover:dark:text-blue-300">
                        {event.name}
                      </p>
                      <div className="flex items-center gap-1 text-[8px] text-blue-500 dark:text-blue-400/80 font-bold uppercase tracking-tighter">
                        <Clock size={8} />
                        {event.start_time}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-12 h-12 border-4 border-[#0054A6] dark:border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando calendário...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 p-2 md:p-0">
      {renderHeader()}
      <div className="bg-white dark:bg-[#0F172A] p-2 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {renderDays()}
        {renderCells()}
      </div>

      {/* Upcoming Events List for Mobile/Quick View */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon size={20} className="text-[#0054A6] dark:text-blue-400" />
            Próximos Eventos
          </h3>
          <div className="h-1 flex-grow mx-4 border-t border-slate-100 dark:border-slate-800 hidden md:block"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events
            .filter(e => parseISO(e.start_date) >= startOfMonth(currentMonth))
            .slice(0, 6)
            .map(event => (
              <div key={event.id} className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md dark:hover:border-slate-700 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 dark:border-slate-700">
                    <img src={event.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#0054A6] dark:group-hover:text-blue-400 transition-colors truncate">{event.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {format(parseISO(event.start_date), "dd 'de' MMMM", { locale: ptBR })} • {event.start_time}
                    </p>
                  </div>
                </div>
                <Link to="/admin/events" className="text-slate-400 dark:text-slate-600 hover:text-[#0054A6] dark:hover:text-blue-400 flex-shrink-0 ml-2">
                  <ExternalLink size={18} />
                </Link>
              </div>
            ))}
          {events.length === 0 && (
            <div className="col-span-full py-12 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <CalendarIcon size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-slate-400 dark:text-slate-500 font-medium">Nenhum evento futuro encontrado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
