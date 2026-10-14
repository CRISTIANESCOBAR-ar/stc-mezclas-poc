import { requiredNumber } from '../../../shared/numbers.js';
import { parseDateFallback } from '../../../shared/dates.js';

function invalid(message) {
  throw Object.assign(new Error(message), { statusCode: 400 });
}

function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(`${label}: objeto requerido.`);
  return { ...value };
}

function text(value, label) {
  if (!['string', 'number'].includes(typeof value) || !String(value).trim()) invalid(`${label}: dato requerido.`);
  return String(value).trim();
}

function rows(value, label) {
  if (!Array.isArray(value) || !value.length) invalid(`${label}: se requiere al menos una fila; una carga vacía no reemplaza datos.`);
  return value.map((row, index) => record(row, `${label}, fila ${index + 1}`));
}

function numbers(row, fields, label) {
  for (const field of fields) row[field] = requiredNumber(row[field], `${label}.${field}`, { optional: true });
  if (fields.length && !fields.some(field => row[field] !== null)) invalid(`${label}: no contiene mediciones numéricas.`);
  return row;
}

export const USTER_FIELDS = ['U_PERCENT', 'CVM_PERCENT', 'INDICE_PERCENT', 'CVM_1M_PERCENT', 'CVM_3M_PERCENT', 'CVM_10M_PERCENT', 'TITULO', 'TITULO_REL_PERC', 'H', 'SH', 'SH_1M', 'SH_3M', 'SH_10M', 'DELG_MINUS30_KM', 'DELG_MINUS40_KM', 'DELG_MINUS50_KM', 'DELG_MINUS60_KM', 'GRUE_35_KM', 'GRUE_50_KM', 'GRUE_70_KM', 'GRUE_100_KM', 'NEPS_140_KM', 'NEPS_200_KM', 'NEPS_280_KM', 'NEPS_400_KM'];
const CARDA_FIELDS = ['U_PERCENT', 'CVM_PERCENT', 'CVM_1M_PERCENT', 'CVM_3M_PERCENT', 'CVM_10M_PERCENT', 'TITULO_MACHINE', 'TITULO_REL_PERC'];
const TENSO_FIELDS = ['TIEMPO_ROTURA', 'FUERZA_B', 'ELONGACION', 'TENACIDAD', 'TRABAJO'];
const HVI_FIELDS = ['sci', 'mst', 'mic', 'mat', 'uhml', 'ui', 'sf', 'str', 'elg', 'rd', 'plusB', 'trCnt', 'trAr', 'trid'];
const RAW_HVI_FIELDS = ['SCI', 'Mst', 'Mic', 'Mat', 'UHML', 'UI', 'SF', 'Str', 'Elg', 'Rd', 'plus_b', 'TrCnt', 'TrAr', 'Amt'];

export function validateTestImport(body, kind) {
  body = record(body, 'Carga');
  const par = record(body.par, 'PAR');
  par.TESTNR = text(par.TESTNR, 'PAR.TESTNR');
  const fields = kind === 'uster' ? USTER_FIELDS : kind === 'carda' ? CARDA_FIELDS : TENSO_FIELDS;
  const tbl = rows(body.tbl, 'TBL').map((row, index) => {
    const label = `TBL, fila ${index + 1}`;
    numbers(row, fields, label);
    const id = kind === 'tenso' ? 'HUSO_NUMBER' : 'NO_';
    row[id] = requiredNumber(row[id], `${label}.${id}`, { integer: true, min: 1 });
    if (kind === 'tenso') {
      // Equipment exports encode spindle/repetition count as "62/5".
      // PostgreSQL stores the repetition count in an INTEGER column.
      const combined = typeof row.HUSO_ENSAYOS === 'string' && row.HUSO_ENSAYOS.trim().match(/^(\d+)\/(\d+)$/);
      if (combined && Number(combined[1]) !== row.HUSO_NUMBER) invalid(`${label}: huso no coincide con HUSO_ENSAYOS.`);
      row.HUSO_ENSAYOS = requiredNumber(combined ? combined[2] : row.HUSO_ENSAYOS, `${label}.HUSO_ENSAYOS`, { optional: true, integer: true, min: 1 });
    }
    return row;
  });
  if (kind === 'tenso') {
    par.NE_TITULO = requiredNumber(par.NE_TITULO, 'PAR.NE_TITULO', { optional: true, min: 0 });
    par.LONG_PRUEBA = requiredNumber(par.LONG_PRUEBA, 'PAR.LONG_PRUEBA', { optional: true, min: 0 });
  }
  let titulos;
  if (kind === 'carda') {
    par.SOURCE_PREFIX = text(par.SOURCE_PREFIX || par.CATALOG, 'PAR.SOURCE_PREFIX/CATALOG').toUpperCase();
    par.NOMCOUNT = requiredNumber(par.NOMCOUNT, 'PAR.NOMCOUNT', { optional: true, min: 0 });
    // Omission preserves existing manual counts. An explicit [] clears them.
    if (body.titulos !== undefined) {
      if (!Array.isArray(body.titulos)) invalid('Títulos: arreglo requerido.');
      titulos = body.titulos.map((item, index) => {
        const row = record(item, `Título ${index + 1}`);
        row.REPNO = requiredNumber(row.REPNO, 'REPNO', { integer: true, min: 1 });
        row.TITULO = requiredNumber(row.TITULO, 'TITULO', { min: 0 });
        return row;
      });
      if (new Set(titulos.map(row => row.REPNO)).size !== titulos.length) invalid('Títulos: REPNO duplicado.');
    }
  }
  return { par, tbl, titulos };
}

export function validateHviFiles(body) {
  body = record(body, 'Carga HVI');
  const seen = new Set();
  return rows(body.files, 'Archivos').map((file, index) => {
    const metadata = record(file.metadata, `Archivo ${index + 1}: metadata`);
    for (const field of ['loteEntrada', 'proveedor', 'fileName']) metadata[field] = text(metadata[field], `Archivo ${index + 1}.${field}`);
    if (!parseDateFallback(metadata.fecha)) invalid(`Archivo ${index + 1}: fecha inválida.`);
    if (seen.has(metadata.fileName)) invalid(`Archivo duplicado en la carga: ${metadata.fileName}`);
    seen.add(metadata.fileName);
    for (const field of ['cantidad', 'cort']) metadata[field] = requiredNumber(metadata[field], `Archivo ${index + 1}.${field}`, { optional: true, integer: true, min: 0 });
    const details = rows(file.details, `Archivo ${index + 1}: detalles`).map((row, i) => {
      row.fardo = text(row.fardo, `Archivo ${index + 1}, fila ${i + 1}: fardo`);
      return numbers(row, HVI_FIELDS, `Archivo ${index + 1}, fila ${i + 1}`);
    });
    if (new Set(details.map(row => row.fardo)).size !== details.length) invalid(`Archivo ${metadata.fileName}: fardos duplicados.`);
    return { metadata, details };
  });
}

export function validateRawHvi(body) {
  body = record(body, 'Carga HVI crudo');
  const filename = text(body.filename, 'filename');
  const seen = new Set();
  const data = rows(body.data, 'Datos HVI crudo').map((row, index) => {
    for (const field of ['Lote', 'Bale_ID', 'Proveedor']) row[field] = text(row[field], `Fila ${index + 1}.${field}`);
    row.Fecha = parseDateFallback(row.Fecha);
    if (!row.Fecha) invalid(`Fila ${index + 1}: fecha inválida.`);
    const key = JSON.stringify([row.Proveedor, row.Lote, row.Bale_ID]);
    if (seen.has(key)) invalid(`Fila ${index + 1}: fardo duplicado.`);
    seen.add(key);
    return numbers(row, RAW_HVI_FIELDS, `Fila ${index + 1}`);
  });
  const calidad_fibra_id = requiredNumber(body.calidad_fibra_id, 'calidad_fibra_id', { optional: true, integer: true, min: 1 });
  return { filename, data, calidad_fibra_id };
}
