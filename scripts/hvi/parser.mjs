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

/**
 * Intenta parsear fechas mal formadas a YYYY-MM-DD.
 */
export function parseDateFallback(rawDate) {
  let str = rawDate.trim();
  
  if (/^\d{8}$/.test(str)) {
    str = str.slice(0, 2) + '/' + str.slice(2, 4) + '/' + str.slice(4);
  }
  str = str.replace(/-/g, '/');
  
  // DD/MM/YYYY o DD/MM/YY
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    let [_, d, m, y] = match;
    d = d.padStart(2, '0');
    m = m.padStart(2, '0');
    if (y.length === 2) {
      y = '20' + y;
    }
    if (parseInt(m, 10) > 12 && parseInt(d, 10) <= 12) {
      const temp = d; d = m; m = temp;
    } else if (parseInt(m, 10) > 12) {
      return str; 
    }
    return `${y}-${m}-${d}`;
  }
  
  return str;
}

export function cleanLote(loteStr) {
  const match = String(loteStr).match(/\d+/);
  if (match) return match[0];
  return String(loteStr).trim();
}

export function cleanBaleId(baleStr) {
  return String(baleStr).trim().replace(/^\.+|\.+$/g, '');
}

/**
 * Parsea el texto del archivo HVI Crudo. (Soporta TXT raw de Uster)
 */
export function parseHviText(rawText, validProducersList, fileName = '') {
  const lines = rawText.split(/\r?\n/);
  if (lines.length === 0) return [];

  const parsedRows = [];
  let currentFecha = '';
  let currentProveedor = '';
  let currentLote = '';
  let loteCounts = {};

  let inDataSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\t/g, ' ').trimEnd();
    if (!line.trim()) continue;

    // Detect Lot ID header to extract Date, Supplier, Lote
    // Example: Lot ID   01-07-26  CARAM LOTE  6578
    const lotMatch = line.match(/Lot ID\s+(\S+)\s+(.*?)\s+(LOTE|ENTR\.)\s*(.*)/i);
    if (lotMatch) {
      currentFecha = parseDateFallback(lotMatch[1]) || lotMatch[1];
      currentProveedor = fuzzyMatchProducer(lotMatch[2], validProducersList);
      currentLote = cleanLote(lotMatch[4]);
      continue;
    }

    // Detect start of data
    if (line.includes('Bale ID') && line.includes('SCI')) {
      inDataSection = true;
      continue; // Skip header line 1
    }
    // Skip second header line "[%] [mm]" etc
    if (inDataSection && line.includes('[%]')) {
      continue;
    }

    // Parse Data Rows
    if (inDataSection) {
      // Data lines start with numbers (Bale ID)
      const cols = line.trim().split(/\s+/);
      
      // Stop condition: if we hit a summary line like "Average", "Std Dev", or empty section
      if (!/^\.?\d+\.?$/.test(cols[0])) {
        if (cols[0].toLowerCase() === 'average' || cols[0].toLowerCase() === 'count' || cols[0].includes('---')) {
          inDataSection = false; 
        }
        continue;
      }

      if (cols.length < 16) continue;

      let bId = cols[0];
      let sci, mst, mic, mat, uhml, ui, sf, str, elg, rd, plus_b, cgrd, trcnt, trar, trid, amt;

      if (cols.length === 17) {
        // Grade is missing
        sci = cols[1];
        mst = cols[2];
        mic = cols[3];
        mat = cols[4];
        uhml = cols[5];
        ui = cols[6];
        sf = cols[7];
        str = cols[8];
        elg = cols[9];
        rd = cols[10];
        plus_b = cols[11];
        cgrd = cols[12];
        trcnt = cols[13];
        trar = cols[14];
        trid = cols[15];
        amt = cols[16];
      } else if (cols.length >= 18) {
        // Grade is present (cols[2])
        sci = cols[1];
        mst = cols[3];
        mic = cols[4];
        mat = cols[5];
        uhml = cols[6];
        ui = cols[7];
        sf = cols[8];
        str = cols[9];
        elg = cols[10];
        rd = cols[11];
        plus_b = cols[12];
        cgrd = cols[13];
        trcnt = cols[14];
        trar = cols[15];
        trid = cols[16];
        amt = cols[17];
      }

      const rowObj = {
        Fecha: currentFecha,
        Proveedor: currentProveedor,
        Lote: currentLote,
        Bale_ID: cleanBaleId(bId),
        SCI: parseFloat(sci) || 0,
        Mst: parseFloat(mst) || 0,
        Mic: parseFloat(mic) || 0,
        Mat: parseFloat(mat) || 0,
        UHML: parseFloat(uhml) || 0,
        UI: parseFloat(ui) || 0,
        SF: parseFloat(sf) || 0,
        Str: parseFloat(str) || 0,
        Elg: parseFloat(elg) || 0,
        Rd: parseFloat(rd) || 0,
        plus_b: parseFloat(plus_b) || 0,
        CGrd: cgrd || '',
        TrCnt: parseFloat(trcnt) || 0,
        TrAr: parseFloat(trar) || 0,
        TrID: trid || '',
        Amt: parseFloat(amt) || 0
      };

      if (rowObj.Lote && rowObj.Bale_ID) {
        parsedRows.push(rowObj);
        loteCounts[rowObj.Lote] = (loteCounts[rowObj.Lote] || 0) + 1;
      }
    }
  }

  // Fallback if Lot ID header was not matched but filename is provided
  if (parsedRows.length > 0 && !currentFecha && fileName) {
    const fnMatch = fileName.match(/(\d{1,2}-\d{1,2}-\d{2,4})\s+(.*?)\s+(lote|entr\.)\s*(\d+)/i);
    if (fnMatch) {
      const fbFecha = parseDateFallback(fnMatch[1]);
      const fbProv = fuzzyMatchProducer(fnMatch[2], validProducersList);
      const fbLote = cleanLote(fnMatch[4]);
      for (const r of parsedRows) {
        if (!r.Fecha) r.Fecha = fbFecha;
        if (!r.Proveedor) r.Proveedor = fbProv;
        if (!r.Lote) r.Lote = fbLote;
      }
    }
  }

  // Asignar Tipo
  for (const r of parsedRows) {
    const count = loteCounts[r.Lote] || 0;
    r.Tipo = count > 25 ? 'ENTRADA' : 'MUESTRA';
  }

  // Pre-filtrar: retornar únicamente los registros que son ENTRADA
  return parsedRows.filter(r => r.Tipo === 'ENTRADA');
}
