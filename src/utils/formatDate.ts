import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function safeFormatDate(dateVal: any, formatStr: string, options?: any): string {
  if (!dateVal) return '-';
  try {
    let d: Date;
    if (dateVal instanceof Date) {
      d = dateVal;
    } else if (typeof dateVal === 'string') {
      if (dateVal.includes('T')) {
        d = new Date(dateVal);
      } else if (dateVal.length === 10 && dateVal.includes('-')) {
        d = new Date(dateVal + 'T00:00:00');
      } else {
        d = new Date(dateVal);
      }
    } else if (typeof dateVal === 'number') {
      d = new Date(dateVal);
    } else {
      return '-';
    }

    if (!isValid(d) || isNaN(d.getTime())) {
      return '-';
    }

    return format(d, formatStr, { locale: ptBR, ...options });
  } catch {
    return '-';
  }
}
