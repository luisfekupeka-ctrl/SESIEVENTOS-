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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Calendário de Eventos</h1>
          <p className="text-slate-500 font-medium capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600 shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-sm font-bold text-slate-600 shadow-sm"
          >
            Hoje
          </button>
          <button
            onClick={nextMonth}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600 shadow-sm"
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
      <div className="grid grid-cols-7 mb-2">
        {days.map((day, i) => (
          <div key={i} className="text-center text-xs font-black text-slate-400 uppercase tracking-widest py-2">
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
      <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {allDays.map((day, i) => {
          const dayFormatted = format(day, dateFormat);
          const dayEvents = events.filter(event => isSameDay(parseISO(event.start_date), day));
          const isSelectedMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={i}
              className={`min-h-[120px] p-2 bg-white flex flex-col gap-1 ${
                !isSelectedMonth ? 'bg-slate-50/50' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-bold ${
                  !isSelectedMonth ? 'text-slate-300' : 
                  isToday ? 'bg-[#0054A6] text-white w-7 h-7 rounded-full flex items-center justify-center' : 
                  'text-slate-900'
                }`}>
                  {dayFormatted}
                </span>
              </div>
              <div className="flex-grow flex flex-col gap-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                {dayEvents.map(event => (
                  <Link
                    key={event.id}
                    to={`/admin/events`}
                    className="group"
                  >
                    <div className="px-2 py-1 bg-blue-50 border-l-4 border-[#0054A6] rounded flex flex-col gap-0.5 hover:bg-blue-100 transition-colors cursor-pointer">
                      <p className="text-[10px] font-black text-[#0054A6] truncate leading-tight">
                        {event.name}
                      </p>
                      <div className="flex items-center gap-1 text-[8px] text-blue-500 font-bold uppercase tracking-tighter">
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
      <div className="w-12 h-12 border-4 border-[#0054A6] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium">Carregando calendário...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500">
      {renderHeader()}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        {renderDays()}
        {renderCells()}
      </div>

      {/* Upcoming Events List for Mobile/Quick View */}
      <div className="mt-8">
        <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
          <CalendarIcon size={20} className="text-[#0054A6]" />
          Próximos Eventos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events
            .filter(e => parseISO(e.start_date) >= startOfMonth(currentMonth))
            .slice(0, 6)
            .map(event => (
              <div key={event.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={event.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0054A6] transition-colors">{event.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      {format(parseISO(event.start_date), "dd 'de' MMMM", { locale: ptBR })} • {event.start_time}
                    </p>
                  </div>
                </div>
                <Link to="/admin/events" className="text-slate-400 hover:text-[#0054A6]">
                  <ExternalLink size={18} />
                </Link>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
