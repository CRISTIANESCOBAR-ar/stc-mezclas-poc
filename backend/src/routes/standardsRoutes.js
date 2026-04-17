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

export default router;

