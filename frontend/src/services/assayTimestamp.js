import { parseDateFallback } from '../../../shared/dates.js';

// Read equipment dates once during scanning; never sort localized display strings.
export function assayTimestamp(value) {
  const text=String(value ?? '').trim();
  if(!text) return null;
  if(/^-?\d+(?:\.\d+)?$/.test(text) && text.length!==8){
    const number=Number(text);
    const ms=Math.abs(number)<1e12 ? number*1000 : number;
    return Number.isFinite(new Date(ms).getTime()) ? ms : null;
  }
  const match=text.match(/^(\d{4}-\d{2}-\d{2}|\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}|\d{8})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if(!match) return null;
  const date=parseDateFallback(match[1].replaceAll('.','/'));
  const hour=Number(match[2] ?? 0),minute=Number(match[3] ?? 0),second=Number(match[4] ?? 0);
  if(!date || hour>23 || minute>59 || second>59) return null;
  return Date.parse(`${date}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')}Z`);
}
