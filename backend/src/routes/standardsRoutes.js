import express from 'express';
import { StandardsRepository } from '../repositories/standardsRepository.js';

const router = express.Router();

/**
 * GET /api/config/standards
 * Fetches the active mixing rules from PostgreSQL (will be swapped to Oracle later).
 */
router.get('/standards', async (req, res) => {
    try {
        const rules = await StandardsRepository.getActiveRules();
        res.json({ success: true, version_actual: 'Estándar 2026', tolerancias: rules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;

