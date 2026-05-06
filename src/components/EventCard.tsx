import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag, ChevronRight, Users, Lock } from 'lucide-react';
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
      className="group bg-white rounded-[2rem] border border-slate-200/60 overflow-hidden hover:shadow-[0_20px_50px_rgba(14,165,233,0.1)] hover:border-sky-500/30 transition-all duration-500 flex flex-col h-full shadow-sm"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={event.image_url || `https://picsum.photos/seed/${event.id}/800/450`}
          alt={event.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent opacity-60"></div>
        {event.password_protected && (
          <div className="absolute top-5 right-5 w-10 h-10 bg-white/80 backdrop-blur-md rounded-xl flex items-center justify-center text-sky-600 border border-slate-200/50 z-20 shadow-sm">
            <Lock size={18} />
          </div>
        )}
        <div className="absolute top-5 left-5 right-5">
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 bg-sky-500/10 text-sky-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-sky-500/10">
              {category?.name || 'Evento'}
            </span>
            <div className="flex items-center gap-1.5 text-sky-500">
              <Users size={14} className="fill-sky-500/20" />
              <span className="text-[10px] font-black uppercase tracking-tighter">{event.registration_count || 0} Inscritos</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 flex flex-col flex-grow relative">
        <h3 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-sky-600 transition-colors line-clamp-1 tracking-tight">
          {event.name}
        </h3>
        
        <p className="text-slate-500 text-base mb-8 line-clamp-2 flex-grow font-bold leading-relaxed">
          {event.description}
        </p>

        <div className="space-y-4 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-4 text-slate-400">
            <div className="w-10 h-10 bg-sky-500/5 rounded-xl flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-black transition-all duration-500">
              <Calendar size={20} />
            </div>
            <span className="text-sm font-black uppercase tracking-widest">
              {(() => {
                try {
                  return format(new Date(event.start_date), "dd 'de' MMMM", { locale: ptBR });
                } catch (e) {
                  return event.start_date || '-';
                }
              })()}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-slate-400">
            <div className="w-10 h-10 bg-blue-500/5 rounded-xl flex items-center justify-center text-blue-400">
              <Tag size={20} />
            </div>
            <span className="text-sm font-black uppercase tracking-widest">
              {(event.restrictions as any).type === 'all' ? 'Público Geral' : 'Público Restrito'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
              <Users size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vagas</span>
              <span className="text-sm font-black text-slate-900">
                {event.registration_count || 0} {event.max_capacity && event.max_capacity > 0 ? `/ ${event.max_capacity}` : ''}
                {event.max_capacity && event.max_capacity > 0 && (event.registration_count || 0) >= event.max_capacity && (
                  <span className="ml-3 text-red-500 font-black uppercase text-[10px] animate-pulse">Esgotado</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <span className="text-slate-500 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-sky-500 transition-all">
            Detalhes <ChevronRight size={16} />
          </span>
          <div className="bg-sky-500 text-black px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(14,165,233,0.2)]">
            Inscrever
          </div>
        </div>
      </div>
    </Link>
  );
};
