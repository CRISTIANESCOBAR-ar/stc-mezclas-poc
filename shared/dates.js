// Equipment exports use day/month/year. Validate the actual calendar date.
export function parseDateFallback(value) {
  if (typeof value !== 'string') return null;
  let text = value.trim();
  if (/^\d{8}$/.test(text)) text = `${text.slice(0, 2)}/${text.slice(2, 4)}/${text.slice(4)}`;
  let year, month, day;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const local = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (iso) [, year, month, day] = iso.map(Number);
  else if (local) {
    day = Number(local[1]); month = Number(local[2]); year = Number(local[3]);
    if (local[3].length === 2) year += 2000;
  } else return null;
  if (year < 1000 || month < 1 || month > 12 || day < 1) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
