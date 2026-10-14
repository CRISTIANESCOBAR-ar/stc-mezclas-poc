import { requiredNumber } from './numbers.js';
import { parseDateFallback } from './dates.js';
export { parseDateFallback } from './dates.js';

/**
 * Calcula la distancia de Levenshtein entre dos cadenas.
 */
export function levenshteinDistance(a, b) {
  const matrix = [];
  let i, j;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  for (i = 0; i <= b.length; i++) matrix[i] = [i];
  for (j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // sustitucion
          Math.min(matrix[i][j - 1] + 1, // insercion
          matrix[i - 1][j] + 1) // borrado
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Encuentra el productor más similar dentro de la lista válida.
 */
export function fuzzyMatchProducer(rawName, validProducersList) {
  if (!validProducersList || validProducersList.length === 0) return rawName.trim().toUpperCase();
  const normalizedRaw = rawName.trim().toUpperCase();
  let bestMatch = normalizedRaw;
  let minDistance = Infinity;

  for (const valid of validProducersList) {
    const d = levenshteinDistance(normalizedRaw, valid.toUpperCase());
    if (d < minDistance) {
      minDistance = d;
      bestMatch = valid;
    }
  }

  if (minDistance > 4) {
    return normalizedRaw;
  }
  return bestMatch;
}

export function cleanLote(loteStr) {
  const match = String(loteStr).match(/\d+/);
  if (match) return match[0];
  return String(loteStr).trim();
}

export function cleanBaleId(baleStr) {
  return String(baleStr).trim().replace(/^\.+|\.+$/g, '');
}

const NUMERIC_FIELDS = ['SCI', 'Mst', 'Mic', 'Mat', 'UHML', 'UI', 'SF', 'Str', 'Elg', 'Rd', 'plus_b', 'TrCnt', 'TrAr', 'Amt'];
const COLUMN_NAMES = {
  fecha: 'Fecha', proveedor: 'Proveedor', lote: 'Lote', baleid: 'Bale_ID',
  sci: 'SCI', mst: 'Mst', mic: 'Mic', mat: 'Mat', uhml: 'UHML', ui: 'UI', sf: 'SF',
  str: 'Str', elg: 'Elg', rd: 'Rd', b: 'plus_b', cgrd: 'CGrd', trcnt: 'TrCnt',
  trar: 'TrAr', trid: 'TrID', amt: 'Amt'
};

function finishRow(row, line, producers) {
  row.Fecha = parseDateFallback(row.Fecha);
  if (!row.Fecha || !String(row.Lote || '').trim() || !String(row.Proveedor || '').trim()) {
    throw new Error(`HVI, línea ${line}: fecha, proveedor o lote ausente/inválido.`);
  }
  row.Lote = cleanLote(row.Lote);
  row.Bale_ID = cleanBaleId(row.Bale_ID);
  if (!row.Bale_ID) throw new Error(`HVI, línea ${line}: identificador de fardo requerido.`);
  row.Proveedor = fuzzyMatchProducer(String(row.Proveedor), producers);
  for (const field of NUMERIC_FIELDS) {
    row[field] = requiredNumber(row[field], `HVI, línea ${line}.${field}`, { optional: true });
  }
  if (!NUMERIC_FIELDS.some(field => row[field] !== null)) throw new Error(`HVI, línea ${line}: sin mediciones.`);
  return row;
}

// Supports tabular exports with named columns and equipment Lot ID blocks.
// Parsing returns both MUESTRA and ENTRADA; the importer chooses its scope.
export function parseHviText(rawText, validProducersList = [], fileName = '') {
  const lines = String(rawText).replace(/^\uFEFF/, '').split(/\r?\n/);
  const parsed = [];
  let metadata = {};
  const filenameMatch = fileName.match(/(\d{1,2}-\d{1,2}-\d{2,4})\s+(.*?)\s+(?:lote|entr\.)\s*(\d+)/i);
  if (filenameMatch) metadata = { Fecha: filenameMatch[1], Proveedor: filenameMatch[2], Lote: filenameMatch[3] };
  let columns = null;
  let inData = false;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line) continue;
    const lot = line.match(/Lot ID\s+(\S+)\s+(.*?)\s+(?:LOTE|ENTR\.)\s*(.*)/i);
    if (lot) {
      metadata = { Fecha: lot[1], Proveedor: lot[2], Lote: lot[3] };
      inData = false;
      columns = null;
      continue;
    }
    if (/Bale\s*ID/i.test(line) && /SCI/i.test(line)) {
      const cells = line.split('\t').map(cell => cell.trim());
      columns = cells.length > 1 && cells.some(cell => cell.toLowerCase() === 'fecha')
        ? cells.map(cell => COLUMN_NAMES[cell.toLowerCase().replace(/[^a-z0-9]/g, '')] || null)
        : null;
      inData = true;
      continue;
    }
    if (!inData || line.includes('[%]')) continue;
    if (/^(?:Average|Count|Std\s+Dev|---)/i.test(line)) { inData = false; continue; }
    let row;
    if (columns) {
      const cells = line.split('\t').map(cell => cell.trim());
      if (cells.length !== columns.length) throw new Error(`HVI, línea ${index + 1}: cantidad de columnas incorrecta.`);
      row = { ...metadata };
      columns.forEach((field, column) => { if (field) row[field] = cells[column]; });
    } else {
      const cells = line.split(/\s+/);
      if (!/^\.?\d+\.?$/.test(cells[0])) continue;
      if (![17, 18].includes(cells.length)) throw new Error(`HVI, línea ${index + 1}: se esperaban 17 o 18 columnas.`);
      // Raw equipment exports put optional Grade immediately after SCI.
      if (cells.length === 18) cells.splice(2, 1);
      const fields = ['Bale_ID', 'SCI', 'Mst', 'Mic', 'Mat', 'UHML', 'UI', 'SF', 'Str', 'Elg', 'Rd', 'plus_b', 'CGrd', 'TrCnt', 'TrAr', 'TrID', 'Amt'];
      row = { ...metadata };
      fields.forEach((field, column) => { row[field] = cells[column]; });
    }
    parsed.push(finishRow(row, index + 1, validProducersList));
  }
  const counts = new Map();
  const key = row => JSON.stringify([row.Fecha, row.Proveedor, row.Lote]);
  for (const row of parsed) counts.set(key(row), (counts.get(key(row)) || 0) + 1);
  const seen = new Set();
  for (const row of parsed) {
    const id = `${key(row)}|${row.Bale_ID}`;
    if (seen.has(id)) throw new Error(`HVI: fardo duplicado ${row.Bale_ID} del lote ${row.Lote}.`);
    seen.add(id);
    row.Tipo = counts.get(key(row)) > 25 ? 'ENTRADA' : 'MUESTRA';
  }
  return parsed;
}
