import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag, ChevronRight, Users, Lock, Clock, ShieldCheck, Sparkles } from 'lucide-react';
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
  
  const values = restrictions.values;
  
  const ef2Years = ['6º Ano EF', '7º Ano EF', '8º Ano EF', '9º Ano EF'];
  const emYears = ['1º Ano EM', '2º Ano EM', '3º Ano EM'];
  
  const hasAllEF2 = ef2Years.every(y => values.includes(y));
  const hasAllEM = emYears.every(y => values.includes(y));
  
  const ef2Count = values.filter((v: string) => ef2Years.includes(v)).length;
  const emCount = values.filter((v: string) => emYears.includes(v)).length;
  
  if (values.length === GRADES.length) {
    return "Todos os Anos";
  }
  
  if (hasAllEF2 && ef2Count === values.length) {
    return "Fund. 2 (6º ao 9º)";
  }
  
  if (hasAllEM && emCount === values.length) {
    return "Ensino Médio (1º ao 3º)";
  }
  
  if (values.length === 1) {
    return values[0].replace(' Ano EF', '° EF').replace(' Ano EM', '° EM').replace('º', '°');
  }
  
  const formattedYears = values.map((v: string) => v.replace('º Ano EF', '°').replace('º Ano EM', '° EM').replace('1º', '1°').replace('2º', '2°').replace('3º', '3°'));
  return formattedYears.join(', ');
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
  const fillPercent = maxCap > 0 ? Math.min(100, Math.round((regCount / maxCap) * 100)) : 0;
  const remainingSpots = maxCap > 0 ? Math.max(0, maxCap - regCount) : null;
  const daysText = formatEventDays(event);
  const yearsText = formatYearRestrictions(event);

  const hasGenderLimit = event.limitar_vagas_genero === 1 && (Number(event.vagas_masculino) > 0 || Number(event.vagas_feminino) > 0);
  const hasYearLimit = event.limitar_vagas_por_ano === 1 && Boolean(event.vagas_por_ano);

  let yearLimitsFormatted = '';
  if (hasYearLimit) {
    try {
      const limits = typeof event.vagas_por_ano === 'string' ? JSON.parse(event.vagas_por_ano) : event.vagas_por_ano;
      const entries = Object.entries(limits || {});
      if (entries.length > 0) {
        yearLimitsFormatted = entries
          .map(([grade, val]) => `${grade.replace(' Ano', '').replace(' EF', '').replace(' EM', ' EM')}: ${val}`)
          .join(' • ');
      }
    } catch {}
  }

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
          <div className="absolute top-3.5 right-3.5 w-8 h-8 bg-slate-950/80 backdrop-blur-md rounded-xl flex items-center justify-center text-yellow-400 border border-yellow-400/30 z-20 shadow-md">
            <Lock size={14} />
          </div>
        )}

        {/* Esgotado Overlay */}
        {isFull && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <div className="bg-red-600 text-white px-6 py-2.5 rounded-2xl font-black uppercase text-base tracking-[0.2em] shadow-2xl border-2 border-white/20 rotate-[-4deg] animate-pulse">
              ESGOTADO
            </div>
          </div>
        )}

        {/* Badges Overlay Header */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 z-10">
          <div className="flex flex-wrap items-center gap-1.5 max-w-[80%]">
            <span className="px-2.5 py-1 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md">
              {category?.name || 'Evento'}
            </span>
            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md ${
              event.is_paid === 1 
                ? 'bg-red-500 text-white shadow-red-500/25' 
                : 'bg-emerald-500 text-white shadow-emerald-500/25'
            }`}>
              {event.is_paid === 1 ? 'Pago' : 'Gratuito'}
            </span>
          </div>

          {/* Vagas Badge */}
          {maxCap > 0 && !isFull && (
            <span className="px-2.5 py-1 bg-slate-950/80 border border-slate-700/60 text-yellow-400 text-[10px] font-black uppercase tracking-tight rounded-lg backdrop-blur-md">
              {remainingSpots} vagas
            </span>
          )}
        </div>

        {/* Days pill at bottom of image */}
        {daysText && (
          <div className="absolute bottom-3 left-3.5 z-10">
            <span className="px-3 py-1 bg-slate-950/90 border border-slate-700/80 text-white text-[11px] font-black uppercase tracking-wider rounded-xl backdrop-blur-md flex items-center gap-1.5 shadow-lg">
              <Calendar size={12} className="text-yellow-400" />
              {daysText}
            </span>
          </div>
        )}
      </div>

      {/* Card Content Body (Square, high-density structured layout) */}
      <div className="p-5 flex flex-col flex-grow justify-between gap-4">
        <div>
          {/* Event Title */}
          <h3 className="text-lg font-black text-white group-hover:text-yellow-400 transition-colors line-clamp-1 tracking-tight leading-snug mb-1.5">
            {event.name}
          </h3>

          {/* Description */}
          {event.description && (
            <p className="text-slate-400 text-xs font-semibold line-clamp-2 leading-relaxed mb-4">
              {event.description}
            </p>
          )}

          {/* Vagas Progress Bar */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 mb-3">
            <div className="flex items-center justify-between text-[11px] font-black mb-1.5">
              <span className="text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Users size={13} className="text-yellow-400" />
                Vagas Preenchidas
              </span>
              <span className={isFull ? 'text-red-400' : 'text-white'}>
                {regCount} {maxCap > 0 ? `/ ${maxCap}` : ''} {maxCap > 0 && `(${fillPercent}%)`}
              </span>
            </div>
            {maxCap > 0 && (
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isFull ? 'bg-red-500' : fillPercent >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} 
                  style={{ width: `${fillPercent}%` }}
                ></div>
              </div>
            )}
          </div>

          {/* Structured 2-Column Info Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
            {/* Ano / Público */}
            <div className="p-2.5 bg-slate-950/40 border border-slate-800/70 rounded-xl flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center flex-shrink-0">
                <Tag size={13} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Público</span>
                <span className="text-slate-200 truncate block font-black text-[10px]">{yearsText}</span>
              </div>
            </div>

            {/* Início / Data */}
            <div className="p-2.5 bg-slate-950/40 border border-slate-800/70 rounded-xl flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-yellow-400/10 text-yellow-400 flex items-center justify-center flex-shrink-0">
                <Clock size={13} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Horário</span>
                <span className="text-slate-200 truncate block font-black text-[10px]">
                  {event.start_time || safeFormatDate(event.start_date, 'dd/MM')}
                </span>
              </div>
            </div>

            {/* Gênero (se configurado) */}
            {hasGenderLimit && (
              <div className="col-span-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between text-[10px] font-black text-purple-300">
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Users size={12} className="text-purple-400" />
                  Divisão de Gênero:
                </span>
                <span className="text-white">
                  {Number(event.vagas_masculino) > 0 && `Masc: ${event.vagas_masculino}`}
                  {Number(event.vagas_masculino) > 0 && Number(event.vagas_feminino) > 0 && ' | '}
                  {Number(event.vagas_feminino) > 0 && `Fem: ${event.vagas_feminino}`}
                </span>
              </div>
            )}

            {/* Limites por Ano (se configurado) */}
            {hasYearLimit && yearLimitsFormatted && (
              <div className="col-span-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between text-[10px] font-black text-blue-300">
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck size={12} className="text-blue-400" />
                  Cotas:
                </span>
                <span className="text-white truncate max-w-[70%]">
                  {yearLimitsFormatted}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Button */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between mt-auto">
          <span className="text-slate-400 font-black text-[11px] uppercase tracking-wider flex items-center gap-1 group-hover:text-yellow-400 transition-colors">
            Detalhes <ChevronRight size={14} />
          </span>
          <div className="bg-yellow-400 text-black px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-yellow-300 transition-all shadow-md shadow-yellow-400/20 group-hover:scale-105">
            {isFull ? 'Ver Evento' : 'Inscrever-se'}
          </div>
        </div>
      </div>
    </Link>
  );
};
