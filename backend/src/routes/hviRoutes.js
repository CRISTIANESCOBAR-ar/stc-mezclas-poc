import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pool, { query } from '../db/pg.js';

const router = express.Router();

// =====================================================
// POST /save
// Guarda datos de archivos HVI en la base de datos
// =====================================================
router.post('/save', async (req, res) => {
  const { files } = req.body;

  if (!files || !Array.isArray(files)) {
    return res.status(400).json({ success: false, error: 'No se enviaron datos de archivos' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS tb_hvi_ensayos (
          id SERIAL PRIMARY KEY,
          lote TEXT NOT NULL,
          proveedor TEXT,
          grado TEXT,
          fecha TEXT,
          muestra TEXT,
          archivo_fuente TEXT,
          creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_hvi_ensayos' AND column_name='tipo') THEN
          ALTER TABLE tb_hvi_ensayos ADD COLUMN tipo TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_hvi_ensayos' AND column_name='cantidad') THEN
          ALTER TABLE tb_hvi_ensayos ADD COLUMN cantidad INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_hvi_ensayos' AND column_name='color') THEN
          ALTER TABLE tb_hvi_ensayos ADD COLUMN color TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_hvi_ensayos' AND column_name='cort') THEN
          ALTER TABLE tb_hvi_ensayos ADD COLUMN cort INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_hvi_ensayos' AND column_name='obs') THEN
          ALTER TABLE tb_hvi_ensayos ADD COLUMN obs TEXT;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS tb_hvi_detalles (
          id SERIAL PRIMARY KEY,
          ensayo_id INTEGER REFERENCES tb_hvi_ensayos(id) ON DELETE CASCADE,
          fardo TEXT,
          sci NUMERIC, mst NUMERIC, mic NUMERIC, mat NUMERIC, uhml NUMERIC,
          ui NUMERIC, sf NUMERIC, str NUMERIC, elg NUMERIC, rd NUMERIC,
          plus_b NUMERIC, tipo TEXT, tr_cnt NUMERIC, tr_ar NUMERIC, trid NUMERIC,
          estado_fardo TEXT DEFAULT 'OK'
      );
    `);

    for (const file of files) {
      const { metadata, details } = file;

      const existing = await client.query(
        `SELECT id FROM tb_hvi_ensayos
         WHERE lote = $1 AND proveedor = $2 AND fecha = $3 AND archivo_fuente = $4`,
        [metadata.loteEntrada, metadata.proveedor, metadata.fecha, metadata.fileName]
      );

      if (existing.rows.length > 0) {
        await client.query('DELETE FROM tb_hvi_ensayos WHERE id = $1', [existing.rows[0].id]);
      }

      const headerRes = await client.query(
        `INSERT INTO tb_hvi_ensayos (tipo, lote, proveedor, grado, fecha, muestra, cantidad, color, cort, obs, archivo_fuente)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [
          metadata.tipo, metadata.loteEntrada, metadata.proveedor, metadata.grado,
          metadata.fecha, metadata.muestra, metadata.cantidad || null,
          metadata.color || null, metadata.cort || null, metadata.obs || null,
          metadata.fileName
        ]
      );

      const ensayoId = headerRes.rows[0].id;

      for (const row of details) {
        const toNum = (v) => {
          if (v === null || v === undefined || v === '-' || v === '') return null;
          const n = parseFloat(String(v).replace(',', '.'));
          return isNaN(n) ? null : n;
        };

        await client.query(
          `INSERT INTO tb_hvi_detalles (
            ensayo_id, fardo, sci, mst, mic, mat, uhml, ui, sf,
            str, elg, rd, plus_b, tipo, tr_cnt, tr_ar, trid
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          )`,
          [
            ensayoId, row.fardo,
            toNum(row.sci), toNum(row.mst), toNum(row.mic), toNum(row.mat),
            toNum(row.uhml), toNum(row.ui), toNum(row.sf), toNum(row.str),
            toNum(row.elg), toNum(row.rd), toNum(row.plusB),
            row.tipo,
            toNum(row.trCnt), toNum(row.trAr), toNum(row.trid)
          ]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Se han guardado los datos correctamente.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error guardando datos HVI:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// =====================================================
// POST /check-files
// Verifica qué nombres de archivo ya existen en la DB
// =====================================================
router.post('/check-files', async (req, res) => {
  const { fileNames } = req.body;
  if (!fileNames || !Array.isArray(fileNames)) {
    return res.status(400).json({ success: false, error: 'Lista de archivos inválida' });
  }

  try {
    const tableCheck = await query(`SELECT to_regclass('public.tb_hvi_ensayos') as exists`);
    if (!tableCheck.rows[0].exists) {
      return res.json({ success: true, existingNames: [] });
    }

    const result = await query(
      `SELECT archivo_fuente FROM tb_hvi_ensayos WHERE archivo_fuente = ANY($1)`,
      [fileNames]
    );
    res.json({ success: true, existingNames: result.rows.map(r => r.archivo_fuente) });
  } catch (err) {
    console.error('Error checking HVI files:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// POST /get-metadata
// Devuelve metadatos guardados para una lista de archivos
// =====================================================
router.post('/get-metadata', async (req, res) => {
  const { fileNames } = req.body;
  if (!fileNames || !Array.isArray(fileNames)) {
    return res.status(400).json({ success: false, error: 'Lista de archivos inválida' });
  }

  try {
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_hvi_ensayos' AND column_name='cantidad') THEN
          ALTER TABLE tb_hvi_ensayos ADD COLUMN cantidad INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_hvi_ensayos' AND column_name='color') THEN
          ALTER TABLE tb_hvi_ensayos ADD COLUMN color TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_hvi_ensayos' AND column_name='cort') THEN
          ALTER TABLE tb_hvi_ensayos ADD COLUMN cort INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_hvi_ensayos' AND column_name='obs') THEN
          ALTER TABLE tb_hvi_ensayos ADD COLUMN obs TEXT;
        END IF;
      END $$;
    `);

    const result = await query(
      `SELECT archivo_fuente, tipo, lote, proveedor, grado, fecha, muestra, cantidad, color, cort, obs
       FROM tb_hvi_ensayos WHERE archivo_fuente = ANY($1)`,
      [fileNames]
    );

    const map = {};
    result.rows.forEach(r => {
      map[r.archivo_fuente] = {
        tipo: r.tipo,
        loteEntrada: r.lote,
        proveedor: r.proveedor,
        grado: r.grado,
        fecha: r.fecha,
        muestra: r.muestra,
        cantidad: r.cantidad,
        color: r.color,
        cort: r.cort,
        obs: r.obs
      };
    });

    res.json({ success: true, metadata: map });
  } catch (err) {
    console.error('Error getting HVI metadata:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// GET /comparacion-muestra
// Compara lotes Entrada vs Muestra
// =====================================================
router.get('/comparacion-muestra', async (req, res) => {
  try {
    const tableCheck = await query(`SELECT to_regclass('public.tb_hvi_ensayos') as exists`);
    if (!tableCheck.rows[0].exists) {
      return res.json({ success: true, data: [] });
    }

    const sql = `
      WITH promedios_lote AS (
          SELECT
              e.id AS ensayo_id,
              e.lote,
              e.tipo,
              e.muestra,
              AVG(d.sci) as sci_avg,
              AVG(d.str) as str_avg,
              AVG(d.sf) as sf_avg,
              COUNT(d.id) as fardos
          FROM tb_hvi_ensayos e
          JOIN tb_hvi_detalles d ON e.id = d.ensayo_id
          GROUP BY e.id, e.lote, e.tipo, e.muestra
      )
      SELECT
          ent.lote as lote_ent,
          mue.lote as lote_mue,
          ent.sci_avg as sci_ent, mue.sci_avg as sci_mue,
          ent.str_avg as str_ent, mue.str_avg as str_mue,
          ent.sf_avg as sf_ent,  mue.sf_avg as sf_mue
      FROM promedios_lote ent
      LEFT JOIN promedios_lote mue ON ent.muestra = mue.lote
      WHERE ent.tipo = 'Ent' AND (mue.tipo = 'Mue' OR mue.tipo IS NULL)
      ORDER BY ent.lote ASC
    `;

    const result = await query(sql, []);

    const formatted = result.rows.map(r => {
      const sci_mue = r.sci_mue || 0;
      const sci_ent = r.sci_ent || 0;
      const str_mue = r.str_mue || 0;
      const str_ent = r.str_ent || 0;
      const sf_mue  = r.sf_mue  || 0;
      const sf_ent  = r.sf_ent  || 0;

      const var_sci = sci_mue > 0 ? ((sci_ent / sci_mue) - 1) * 100 : 0;
      const var_str = str_mue > 0 ? ((str_ent / str_mue) - 1) * 100 : 0;
      const var_sf  = sf_mue  > 0 ? ((sf_ent  / sf_mue)  - 1) * 100 : 0;

      let alerta = '';
      let critico = false;
      if (sci_mue > 0 && (var_str < -5 || var_sci < -5 || var_sf > 5)) {
        alerta = '⚠️ ALERTA DE RECLAMO: Calidad inferior a la muestra aprobada';
        critico = true;
      }

      return {
        lote: r.lote_ent,
        muestra: r.lote_mue || 'No vinculada',
        sci_mue: sci_mue > 0 ? parseFloat(sci_mue).toFixed(1) : '---',
        sci_ent: parseFloat(sci_ent).toFixed(1),
        var_sci: sci_mue > 0 ? var_sci.toFixed(1) + '%' : '---',
        str_mue: str_mue > 0 ? parseFloat(str_mue).toFixed(1) : '---',
        str_ent: parseFloat(str_ent).toFixed(1),
        var_str: str_mue > 0 ? var_str.toFixed(1) + '%' : '---',
        sf_mue: sf_mue > 0 ? parseFloat(sf_mue).toFixed(1) : '---',
        sf_ent: parseFloat(sf_ent).toFixed(1),
        var_sf: sf_mue > 0 ? var_sf.toFixed(1) + '%' : '---',
        alerta,
        critico,
        estado: sci_mue === 0 ? 'SIN MUESTRA' : (critico ? 'RECHAZADO' : 'ACEPTADO')
      };
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('Error en comparación HVI:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// POST /predecir-hilatura
// Proxy al modelo Gemini para análisis de IA
// =====================================================
router.post('/predecir-hilatura', async (req, res) => {
  try {
    const { lote, pacas, metadata, contexto } = req.body;
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'GOOGLE_API_KEY no configurada' });
    }

    const modelName = req.body.model || 'gemini-2.0-flash';

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const muestras = pacas.filter(p => p.tipo === 'Mue' || p.Tipo === 'Mue');
    const entradas = pacas.filter(p => p.tipo === 'Ent' || p.Tipo === 'Ent');

    const calcularPromedios = (items) => {
      if (!items.length) return {};
      const sum = items.reduce((acc, curr) => ({
        sci:    acc.sci    + (parseFloat(curr.sci    || curr.SCI)    || 0),
        str:    acc.str    + (parseFloat(curr.str    || curr.STR)    || 0),
        sf:     acc.sf     + (parseFloat(curr.sf     || curr.SF)     || 0),
        rd:     acc.rd     + (parseFloat(curr.rd     || curr.RD)     || 0),
        plus_b: acc.plus_b + (parseFloat(curr.plusb  || curr['+b'])  || 0),
        mic:    acc.mic    + (parseFloat(curr.mic    || curr.MIC)    || 0),
        trash:  acc.trash  + (parseFloat(curr.trash  || curr.Trash)  || 0),
      }), { sci: 0, str: 0, sf: 0, rd: 0, plus_b: 0, mic: 0, trash: 0 });
      return {
        sci:    parseFloat((sum.sci    / items.length).toFixed(1)),
        str:    parseFloat((sum.str    / items.length).toFixed(1)),
        sf:     parseFloat((sum.sf     / items.length).toFixed(1)),
        rd:     parseFloat((sum.rd     / items.length).toFixed(1)),
        plus_b: parseFloat((sum.plus_b / items.length).toFixed(1)),
        mic:    parseFloat((sum.mic    / items.length).toFixed(2)),
        trash:  parseFloat((sum.trash  / items.length).toFixed(2)),
      };
    };

    const datosPromedioMue = calcularPromedios(muestras);
    const datosPromedioEnt = calcularPromedios(entradas);

    const datosParaPrompt = {
      referencia_muestra: muestras.length > 0 ? {
        lote: muestras[0].lote || muestras[0].Lote || 'Desconocido',
        tot: muestras.length,
        prom: datosPromedioMue
      } : null,
      lote_recibido: entradas.length > 0 ? {
        lote: entradas[0].lote || entradas[0].Lote || lote,
        tot: entradas.length,
        prom: datosPromedioEnt
      } : {
        lote,
        tot: pacas.length,
        prom: calcularPromedios(pacas)
      },
      fardos_criticos: (entradas.length > 0 ? entradas : pacas)
        .sort((a, b) => (parseFloat(a.sci) || 0) - (parseFloat(b.sci) || 0))
        .slice(0, 30)
        .map(f => ({
          id:  f.fardo,
          sci: Math.round(f.sci || f.SCI),
          str: parseFloat(f.str || f.STR).toFixed(1),
          mic: parseFloat(f.mic || f.MIC).toFixed(2),
        }))
    };

    const prompt = `Actúa como un Ingeniero Senior de Planta de Denim. Tu misión principal es la Auditoría de Cumplimiento de Compra.
IMPORTANTE: Responde de manera EJECUTIVA y RÁPIDA.

LÓGICA DE RELACIÓN (CRUCE DE DATOS):
Te estoy enviando dos conjuntos de datos o uno según disponibilidad: la Muestra (Tipo: 'Mue') y la Entrada (Tipo: 'Ent').
Debes usar el valor de la columna lote de la Muestra para compararlo con el valor de la columna muestra de la Entrada (si existen).
Es obligatorio calcular la variación porcentual entre ambos: ((Promedio_Ent / Promedio_Mue) - 1) * 100.

REGLAS DE EVALUACIÓN TÉCNICA:
1. Foco en Denim: Analiza aptitud para 7/1 a 10/1 (Trama), 10/1 Flame y 12.5/1 a 16/1 (Urdimbre).
2. Penalización por Desviación: Si el STR o el SCI caen más de un 5% respecto a la muestra, califica el lote como 'No Conforme/Reclamo Directo'.
3. Análisis de Color (Rd y +b): Si la entrada es más amarilla (+b mayor) que la muestra, advierte sobre 'Variación de Tono en el Lote Final'.

ESTRUCTURA DEL REPORTE:
1. Tabla Comparativa de Desviación: (Mue vs Ent) para SCI, STR, MIC, SF y Trash. Columnas: Muestra, Entrada, Var %, Estado.
2. Diagnóstico de Procesabilidad: Impacto en paros de rotor y cortes en telar.
3. Conclusión de Compra: Dictamen final (Aceptar, Aceptar con descuento, o Rechazar).

DATOS DE ENTRADA (JSON):
${JSON.stringify(datosParaPrompt, null, 2)}

NOTA: Si solo recibes 'lote_recibido' sin 'referencia_muestra', realiza la evaluación técnica absoluta basada en estándares de Denim (SCI > 130, STR > 28, etc.) pero indica que falta la muestra para la comparativa contractual.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({ success: true, insight: text });
  } catch (error) {
    console.error('Error Gemini:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
