import express from 'express';
import { StockRepository } from '../repositories/stockRepository.js';
import { StandardsRepository } from '../repositories/standardsRepository.js';
import { optimizeBlend } from '../services/blend/optimizer.js';

const router = express.Router();

/**
 * 1. GET /api/inventory/cotton-bales - Available stock from DB
 */
router.get('/cotton-bales', async (req, res) => {
    try {
        const stock = await StockRepository.getAllAvailable();
        res.json(stock);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 2. POST /api/inventory/blendomat - The Core Business Logic (Optimizer Engine)
 */
router.post('/blendomat', async (req, res) => {
    try {
        const { 
            blendSize, 
            algorithm, 
            supervisionSettings,
            rules: uiRules = [], 
            stock: selectedLots = [] 
        } = req.body;

        if (!blendSize || blendSize <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid blendSize' });
        }

        // Logic decoupling via Repository pattern
        const stock = selectedLots.length > 0 
            ? selectedLots 
            : await StockRepository.getAllAvailable();
            
        // Use UI rules if provided, otherwise fetch from DB
        const rules = uiRules.length > 0 
            ? uiRules 
            : await StandardsRepository.getActiveRules();

        // Execution of the business logic engine
        const result = optimizeBlend(stock, rules, supervisionSettings, blendSize, algorithm);

        res.json(result);
    } catch (error) {
        console.error('Core Logic failure:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error en el cálculo estratégico: ' + error.message 
        });
    }
});

/**
 * Mocks for non-critical features in PoC
 */
router.get('/lote-fiac-reference-summary', (req, res) => {
    res.json([]);
});

router.get('/residuos-lote-blendomar', (req, res) => {
    res.json({ success: true, count: 0, residuos: [] });
});

export default router;

