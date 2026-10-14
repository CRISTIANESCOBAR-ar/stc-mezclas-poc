// Historical databases stored "02/5"; newer imports store only the count "5".
export function formatStoredSpindle(huso, repetitions) {
  const raw=String(repetitions ?? '').trim();
  const combined=raw.match(/^\d+\s*\/\s*(\d+)$/);
  const count=combined ? combined[1] : /^\d+$/.test(raw) ? raw : '';
  return `${huso ?? ''}/${count}`;
}
