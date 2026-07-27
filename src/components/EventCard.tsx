import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag, ChevronRight, Users, Lock } from 'lucide-react';
import { getEventImage } from '../utils/getEventImage';
import { Event, Category } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GRADES } from '../constants';

export function formatYearRestrictions(event: Event): string {
  const restrictions = event.restrictions as any;
  if (!restrictions || restrictions.type !== 'years' || !restrictions.values || restrictions.values.length === 0) {
    return "Livre para todos os públicos";
  }
  
  const values = restrictions.values;
  
  const ef2Years = ['6º Ano EF', '7º Ano EF', '8º Ano EF', '9º Ano EF'];
  const emYears = ['1º Ano EM', '2º Ano EM', '3º Ano EM'];
  
  const hasAllEF2 = ef2Years.every(y => values.includes(y));
  const hasAllEM = emYears.every(y => values.includes(y));
  
  const ef2Count = values.filter((v: string) => ef2Years.includes(v)).length;
  const emCount = values.filter((v: string) => emYears.includes(v)).length;
  
  if (values.length === GRADES.length) {
    return "Livre para todos os públicos";
  }
  
  if (hasAllEF2 && ef2Count === values.length) {
    return "Exclusivo: Ensino Fundamental 2";
  }
  
  if (hasAllEM && emCount === values.length) {
    return "Exclusivo: Ensino Médio";
  }
  
  if (values.length === 1) {
    const yearNumber = values[0].replace('º Ano EF', '° Ano').replace('º Ano EM', '° Ano EM').replace('1º', '1°').replace('2º', '2°').replace('3º', '3°');
    return `Exclusivo: Somente ${yearNumber}`;
  }
  
  const formattedYears = values.map((v: string) => v.replace('º Ano EF', '°').replace('º Ano EM', '° EM').replace('1º', '1°').replace('2º', '2°').replace('3º', '3°'));
  return `Exclusivo: ${formattedYears.join(' e ')} Ano`;
}

interface EventCardProps {
  event: Event;
  category?: Category;
}

export const EventCard: React.FC<EventCardProps> = ({ event, category }) => {
  return (
    <Link
      to={`/event/${event.id}`}
      className="group bg-slate-900/80 backdrop-blur-sm rounded-[2rem] border border-slate-700/50 overflow-hidden hover:shadow-[0_20px_50px_rgba(234,179,8,0.15)] hover:border-yellow-400/40 transition-all duration-500 flex flex-col h-full shadow-lg"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={event.image_url || getEventImage(event.name) || `https://picsum.photos/seed/${event.id}/800/450`}
          alt={event.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-80"></div>
        {event.password_protected && (
          <div className="absolute top-5 right-5 w-10 h-10 bg-slate-900/80 backdrop-blur-md rounded-xl flex items-center justify-center text-yellow-400 border border-yellow-400/30 z-20 shadow-sm">
            <Lock size={18} />
          </div>
        )}
        {event.max_capacity && event.max_capacity > 0 && (event.registration_count || 0) >= event.max_capacity && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="bg-red-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xl tracking-[0.2em] shadow-2xl border-4 border-white/20 rotate-[-5deg] animate-bounce">
              ESGOTADO
            </div>
          </div>
        )}
        <div className="absolute top-5 left-5 right-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-wrap items-center gap-2 max-w-[80%]">
              <span className="px-3 py-1 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                {category?.name || 'Evento'}
              </span>
              <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm ${
                event.is_paid === 1 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' 
                  : 'bg-green-500 text-white shadow-lg shadow-green-500/25'
              }`}>
                {event.is_paid === 1 ? 'Pago' : 'Gratuito'}
              </span>
              {event.restringir_dias === 1 && (() => {
                let list: string[] = [];
                if (Array.isArray(event.dias_semana)) {
                  list = event.dias_semana;
                } else if (typeof event.dias_semana === 'string') {
                  try {
                    list = JSON.parse(event.dias_semana);
                  } catch {
                    list = [];
                  }
                }
                if (list.length === 0) return null;
                return (
                  <span className="px-3 py-1 bg-slate-950/80 border border-slate-700/50 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                    {list.join(', ')}
                  </span>
                );
              })()}
              {(() => {
                let targetTime: Date | null = null;
                let target = event.registration_open_at;
                if (!target && event.start_date && event.start_time) {
                  target = `${event.start_date}T${event.start_time}:00`;
                }
                if (target) {
                  const cleanStr = target.trim();
                  const isoStr = cleanStr.includes('-03:00') || cleanStr.includes('Z')
                    ? cleanStr
                    : (cleanStr.length === 16 ? `${cleanStr}:00-03:00` : (cleanStr.length === 19 ? `${cleanStr}-03:00` : cleanStr));
                  targetTime = new Date(isoStr);
                }

                // Check split-window logic
                let isMixedEvent = false;
                const restrictions = event.restrictions as any;
                if (restrictions?.type === 'all' || !restrictions || !restrictions.type) {
                  isMixedEvent = true;
                } else if (restrictions?.type === 'years' && Array.isArray(restrictions.values)) {
                  const hasGroupA = restrictions.values.some((v: string) => ['6º Ano EF', '7º Ano EF'].includes(v));
                  const hasGroupB = restrictions.values.some((v: string) => ['8º Ano EF', '9º Ano EF', '1º Ano EM', '2º Ano EM', '3º Ano EM'].includes(v));
                  isMixedEvent = hasGroupA && hasGroupB;
                }

                if (isMixedEvent) {
                  const date27_open = new Date('2026-07-27T13:30:00-03:00');
                  if (Date.now() < date27_open.getTime()) {
                    targetTime = date27_open;
                  }
                }

                const isUpcoming = targetTime && !isNaN(targetTime.getTime()) && targetTime.getTime() > Date.now();
                if (isUpcoming) {
                  return (
                    <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm shadow-amber-500/25 animate-pulse">
                      Em Breve
                    </span>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex items-center gap-1.5 text-yellow-400 flex-shrink-0">
              <Users size={14} className="fill-yellow-400/20" />
              <span className="text-[10px] font-black uppercase tracking-tighter drop-shadow-md">{event.registration_count || 0} Inscritos</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 flex flex-col flex-grow relative">
        <h3 className="text-2xl font-black text-white mb-3 group-hover:text-yellow-400 transition-colors line-clamp-1 tracking-tight">
          {event.name}
        </h3>
        
        <p className="text-slate-400 text-base mb-8 line-clamp-2 flex-grow font-bold leading-relaxed">
          {event.description}
        </p>

        <div className="space-y-4 pt-6 border-t border-slate-700/50">
          <div className="flex items-center gap-4 text-slate-300">
            <div className="w-10 h-10 bg-yellow-400/10 rounded-xl flex items-center justify-center text-yellow-400 group-hover:bg-yellow-400 group-hover:text-black transition-all duration-500">
              <Calendar size={20} />
            </div>
            <span className="text-sm font-black uppercase tracking-widest">
              {(() => {
                try {
                  // Add T00:00:00 to ensure local time parsing
                  return format(new Date(event.start_date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR });
                } catch (e) {
                  return event.start_date || '-';
                }
              })()}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-slate-300">
            <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400">
              <Tag size={20} />
            </div>
            <span className="text-sm font-black uppercase tracking-widest">
              {formatYearRestrictions(event)}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-300">
              <Users size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vagas</span>
              <span className="text-sm font-black text-white">
                {event.registration_count || 0} {event.max_capacity && event.max_capacity > 0 ? `/ ${event.max_capacity}` : ''}
                {event.max_capacity && event.max_capacity > 0 && (event.registration_count || 0) >= event.max_capacity && (
                  <span className="ml-3 text-red-400 font-black uppercase text-[10px] animate-pulse">Esgotado</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <span className="text-slate-400 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-yellow-400 transition-all">
            Detalhes <ChevronRight size={16} />
          </span>
          <div className="bg-yellow-400 text-black px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-yellow-400/20">
            Inscrever
          </div>
        </div>
      </div>
    </Link>
  );
};
