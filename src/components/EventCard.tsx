import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag, ChevronRight, Users } from 'lucide-react';
import { Event, Category } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventCardProps {
  event: Event;
  category?: Category;
}

export const EventCard: React.FC<EventCardProps> = ({ event, category }) => {
  return (
    <Link
      to={`/event/${event.id}`}
      className="group bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-2xl hover:border-[#0054A6]/20 dark:hover:border-blue-500/30 transition-all duration-300 flex flex-col h-full shadow-sm"
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={event.image_url || `https://picsum.photos/seed/${event.id}/800/450`}
          alt={event.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4">
          <span className="bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-sm text-[#0054A6] dark:text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wider border border-slate-100 dark:border-slate-800">
            {category?.name || 'Evento'}
          </span>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-[#0054A6] dark:group-hover:text-blue-400 transition-colors line-clamp-1">
          {event.name}
        </h3>
        
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 line-clamp-2 flex-grow font-medium">
          {event.description}
        </p>

        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Calendar size={18} className="text-[#0054A6] dark:text-blue-500" />
            <span className="text-sm font-medium">
              {format(new Date(event.start_date), "dd 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Tag size={18} className="text-[#0054A6] dark:text-blue-500" />
            <span className="text-sm font-medium">
              {(event.restrictions as any).type === 'all' ? 'Aberto para todos' : 'Restrito'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Users size={18} className="text-[#0054A6] dark:text-blue-500" />
            <span className="text-sm font-medium">
              {event.registration_count || 0} {event.max_capacity && event.max_capacity > 0 ? `/ ${event.max_capacity}` : ''} inscritos
              {event.max_capacity && event.max_capacity > 0 && (event.registration_count || 0) >= event.max_capacity && (
                <span className="ml-2 text-red-500 dark:text-red-400 font-black uppercase text-[10px]">Esgotado</span>
              )}
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-[#0054A6] dark:text-blue-400 font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
            Ver detalhes <ChevronRight size={16} />
          </span>
          <button className="bg-[#0054A6] dark:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#004080] dark:hover:bg-blue-700 transition-colors shadow-lg shadow-[#0054A6]/10 dark:shadow-blue-900/20">
            Inscrever-se
          </button>
        </div>
      </div>
    </Link>
  );
};
