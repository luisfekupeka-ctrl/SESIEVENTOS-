import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag, ChevronRight, Users, Lock, Clock, ShieldCheck } from 'lucide-react';
import { getEventImage } from '../utils/getEventImage';
import { Event, Category } from '../types';
import { safeFormatDate } from '../utils/formatDate';
import { GRADES } from '../constants';

export function formatYearRestrictions(event: Event): string {
  let restrictions = event.restrictions as any;
  if (typeof restrictions === 'string') {
    try { restrictions = JSON.parse(restrictions); } catch { restrictions = null; }
  }
  if (!restrictions || restrictions.type !== 'years' || !restrictions.values || restrictions.values.length === 0) {
    return "Todos os Anos";
  }
  
  const values: string[] = restrictions.values;
  
  const ef2Years = ['6º Ano EF', '7º Ano EF', '8º Ano EF', '9º Ano EF'];
  const emYears = ['1º Ano EM', '2º Ano EM', '3º Ano EM'];
  
  const clean = (s: string) => s.replace(/°/g, 'º').trim();
  const normValues = values.map(clean);
  
  const hasAllEF2 = ef2Years.every(y => normValues.includes(y));
  const hasAllEM = emYears.every(y => normValues.includes(y));
  
  if (normValues.length === GRADES.length) {
    return "Todos os Anos";
  }
  
  if (hasAllEF2 && normValues.length === ef2Years.length) {
    return "6º ao 9º Ano EF";
  }
  
  if (hasAllEM && normValues.length === emYears.length) {
    return "1º ao 3º Ano EM";
  }
  
  return normValues
    .map(v => v.replace(/\s*Ano\s*EF/gi, 'º EF').replace(/\s*Ano\s*EM/gi, 'º EM').replace(/º+/g, 'º'))
    .join(', ');
}

export function formatEventDays(event: Event): string | null {
  if (event.restringir_dias === 1 && event.dias_semana) {
    let list: string[] = [];
    if (Array.isArray(event.dias_semana)) list = event.dias_semana;
    else if (typeof event.dias_semana === 'string') {
      try { list = JSON.parse(event.dias_semana); } catch { list = []; }
    }
    if (list.length > 0) return list.join(', ');
  }
  if (event.start_date) {
    try {
      const ptDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const [y, m, d] = event.start_date.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return ptDays[date.getDay()];
    } catch {
      return null;
    }
  }
  return null;
}

interface EventCardProps {
  event: Event;
  category?: Category;
}

export const EventCard: React.FC<EventCardProps> = ({ event, category }) => {
  const regCount = event.registration_count || 0;
  const maxCap = event.max_capacity || 0;
  const isFull = maxCap > 0 && regCount >= maxCap;
  const remainingSpots = maxCap > 0 ? Math.max(0, maxCap - regCount) : null;
  const daysText = formatEventDays(event);
  const yearsText = formatYearRestrictions(event);

  return (
    <Link
      to={`/event/${event.id}`}
      className="group bg-slate-900/90 backdrop-blur-md rounded-[2rem] border border-slate-800 overflow-hidden hover:shadow-[0_20px_50px_rgba(234,179,8,0.15)] hover:border-yellow-400/40 transition-all duration-300 flex flex-col h-full shadow-xl hover:-translate-y-1"
    >
      {/* Top Banner Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
        <img
          src={event.image_url || getEventImage(event.name) || `https://picsum.photos/seed/${event.id}/800/450`}
          alt={event.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent"></div>

        {/* Password Protect Icon */}
        {event.password_protected && (
          <div className="absolute top-4 right-4 w-8 h-8 bg-slate-950/80 backdrop-blur-md rounded-xl flex items-center justify-center text-yellow-400 border border-yellow-400/30 z-20 shadow-md">
            <Lock size={14} />
          </div>
        )}

        {/* Esgotado Overlay */}
        {isFull && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <div className="bg-red-600 text-white px-6 py-2.5 rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-2xl border-2 border-white/20 rotate-[-4deg] animate-pulse">
              ESGOTADO
            </div>
          </div>
        )}

        {/* Badges Overlay Header */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 z-10">
          <div className="flex flex-wrap items-center gap-2 max-w-[80%]">
            <span className="px-3 py-1 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md">
              {category?.name || 'Evento'}
            </span>
            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md ${
              event.is_paid === 1 
                ? 'bg-red-500 text-white shadow-red-500/25' 
                : 'bg-emerald-500 text-white shadow-emerald-500/25'
            }`}>
              {event.is_paid === 1 ? 'Pago' : 'Gratuito'}
            </span>
          </div>

          {/* Vagas Badge */}
          {maxCap > 0 && !isFull && (
            <div className="flex flex-col items-end gap-1">
              <span className="px-3 py-1 bg-slate-950/90 border border-slate-700/60 text-yellow-400 text-[10px] font-black uppercase tracking-tight rounded-xl backdrop-blur-md">
                {remainingSpots} vagas
              </span>
              {event.limitar_vagas_genero === 1 && (
                <span className="px-2 py-0.5 bg-slate-950/90 border border-slate-800 text-[9px] font-black rounded-lg backdrop-blur-md flex items-center gap-1.5">
                  <span className="text-blue-400">M:{event.vagas_masculino || 0}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-pink-400">F:{event.vagas_feminino || 0}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Days pill at bottom of image */}
        {daysText && (
          <div className="absolute bottom-3.5 left-4 z-10">
            <span className="px-3 py-1 bg-slate-950/90 border border-slate-700/80 text-white text-[10px] font-black uppercase tracking-wider rounded-xl backdrop-blur-md flex items-center gap-1.5 shadow-lg">
              <Calendar size={12} className="text-yellow-400" />
              {daysText}
            </span>
          </div>
        )}
      </div>

      {/* Public Card Body - Clean, Essential & Legible */}
      <div className="p-5 md:p-6 flex flex-col flex-grow justify-between gap-4">
        <div>
          {/* Event Title */}
          <h3 className="text-xl font-black text-white group-hover:text-yellow-400 transition-colors line-clamp-1 tracking-tight leading-snug mb-2">
            {event.name}
          </h3>

          {/* Description */}
          {event.description && (
            <p className="text-slate-400 text-xs font-semibold line-clamp-2 leading-relaxed mb-4">
              {event.description}
            </p>
          )}

          {/* Essential Info Chips */}
          <div className="space-y-2 text-xs font-bold">
            {/* Horário / Data */}
            <div className="flex items-center gap-2.5 text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-yellow-400/10 text-yellow-400 flex items-center justify-center flex-shrink-0">
                <Clock size={14} />
              </div>
              <span className="text-slate-200 font-bold text-xs truncate">
                {event.start_time ? `${event.start_time}${event.end_time ? ` às ${event.end_time}` : ''}` : safeFormatDate(event.start_date, 'dd/MM/yyyy')}
                {daysText ? ` (${daysText})` : ''}
              </span>
            </div>

            {/* Público */}
            <div className="flex items-center gap-2.5 text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={14} />
              </div>
              <span className="text-slate-200 font-bold text-xs truncate">
                {yearsText}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div className="pt-3.5 border-t border-slate-800/80 flex items-center justify-between mt-auto">
          <span className="text-slate-400 font-black text-xs uppercase tracking-wider flex items-center gap-1 group-hover:text-yellow-400 transition-colors">
            Detalhes <ChevronRight size={14} />
          </span>
          <div className="bg-yellow-400 text-black px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-yellow-300 transition-all shadow-md shadow-yellow-400/20 group-hover:scale-105">
            {isFull ? 'Ver Evento' : 'Inscrever-se'}
          </div>
        </div>
      </div>
    </Link>
  );
};
