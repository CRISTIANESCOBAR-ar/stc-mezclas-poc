import express from 'express';
import { StandardsRepository } from '../repositories/standardsRepository.js';

const router = express.Router();

/**
 * GET /api/config/standards
 * Fetches the active mixing rules from PostgreSQL.
 */
router.get('/standards', async (req, res) => {
    try {
        const rules = await StandardsRepository.getActiveRules();
        res.json({ success: true, version_actual: 'Estándar 2026', tolerancias: rules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * PUT /api/config/standards
 * Saves (upsert) a list of tolerance rules back to PostgreSQL.
 * Body: { tolerancias: [...MixingRuleDTO] }
 */
router.put('/standards', async (req, res) => {
    try {
        const { tolerancias } = req.body;
        if (!Array.isArray(tolerancias) || tolerancias.length === 0) {
            return res.status(400).json({ success: false, message: 'No hay tolerancias para guardar.' });
        }
        await StandardsRepository.saveRules(tolerancias);
        res.json({ success: true, message: `${tolerancias.length} reglas guardadas correctamente.` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/config/audit
 * Audits a list of HVI bales against configured tolerance rules.
 * Body: { bales: [...], version_nombre: string }
 * Returns: { success, data: { overallStatus, details, parameterResults } }
 */
router.post('/audit', async (req, res) => {
  try {
    const { bales } = req.body;

    if (!Array.isArray(bales) || bales.length === 0) {
      return res.status(400).json({ success: false, message: 'No se enviaron fardos para auditar.' });
    }

    const rules = await StandardsRepository.getActiveRules();

    // Map bale field names to DB parametro values
    const PARAM_MAP = {
      MIC:    b => parseFloat(b.mic),
      SCI:    b => parseFloat(b.sci),
      STR:    b => parseFloat(b.str),
      UHML:   b => parseFloat(b.uhml),
      UI:     b => parseFloat(b.ui),
      SF:     b => parseFloat(b.sf),
      ELG:    b => parseFloat(b.elg),
      RD:     b => parseFloat(b.rd),
      PLUS_B: b => parseFloat(b.plusB ?? b.plus_b),
    };

    const details = [];
    const parameterResults = {};
    let overallStatus = 'APROBADO';

    for (const rule of rules) {
      const param = (rule.parametro || '').toUpperCase();
      const extractor = PARAM_MAP[param];
      if (!extractor) continue;

      const values = bales.map(extractor).filter(v => !isNaN(v) && v !== null);
      if (values.length === 0) continue;

      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      const limMin = parseFloat(rule.limite_min_absoluto);
      const limMax = parseFloat(rule.limite_max_absoluto);
      const tolMin = parseFloat(rule.rango_tol_min);
      const tolMax = parseFloat(rule.rango_tol_max);

      const failedBales = [];
      let paramStatus = 'APROBADO';

      // Hard cap check (any single bale exceeds absolute limits → RECHAZO)
      if (!isNaN(limMin) || !isNaN(limMax)) {
        for (const b of bales) {
          const v = extractor(b);
          if (isNaN(v)) continue;
          const failMin = !isNaN(limMin) && v < limMin;
          const failMax = !isNaN(limMax) && v > limMax;
          if (failMin || failMax) {
            failedBales.push({ fardo: b.fardo || b.LOTE, valor: v, tipo: failMin ? 'bajo_minimo' : 'sobre_maximo' });
          }
        }
        if (failedBales.length > 0) {
          paramStatus = 'RECHAZO';
          overallStatus = 'RECHAZO';
          details.push(`${param}: ${failedBales.length} fardo(s) fuera del límite absoluto (min=${limMin}, max=${limMax})`);
        }
      }

      // Average range check (promedio fuera de rango tolerancia → RECHAZO)
      if (paramStatus === 'APROBADO') {
        const avgFail = (!isNaN(tolMin) && average < tolMin) || (!isNaN(tolMax) && average > tolMax);
        if (avgFail) {
          paramStatus = 'RECHAZO';
          overallStatus = 'RECHAZO';
          details.push(`${param}: Promedio ${average.toFixed(2)} fuera del rango de tolerancia [${tolMin ?? '-'}, ${tolMax ?? '-'}]`);
        }
      }

      // Distribution check: if > 20% of bales are in tolerance zone → ADVERTENCIA
      if (paramStatus === 'APROBADO' && (!isNaN(tolMin) || !isNaN(tolMax))) {
        const inTolZone = values.filter(v =>
          (!isNaN(tolMin) && v < tolMin + (tolMin * 0.05)) ||
          (!isNaN(tolMax) && v > tolMax - (tolMax * 0.05))
        ).length;
        if (inTolZone / values.length > 0.20) {
          paramStatus = 'ADVERTENCIA';
          if (overallStatus === 'APROBADO') overallStatus = 'ADVERTENCIA';
          details.push(`${param}: Dispersión Alta – más del 20% de fardos cerca del límite (Dispersión Alta)`);
        }
      }

      parameterResults[param] = { status: paramStatus, average, min, max, failedBales };
    }

    res.json({ success: true, data: { overallStatus, details, parameterResults } });
  } catch (error) {
    console.error('Error en /api/config/audit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

