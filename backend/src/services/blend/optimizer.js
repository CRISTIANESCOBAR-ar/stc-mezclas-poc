import { normalizeMixingRules } from '../../helpers/mixingRules.js';
import { optionalNumber, requiredNumber, weightedAverage, baleWeight } from '../../../../shared/numbers.js';

/**
 * optimizer.js — stc-mezclas-poc
 * Full port from stc-produccion-v2/backend/services/blendomat-optimizer.js
 * Includes quality optimization (hill climbing), remanentes, and complete plan rows.
 */

// =================================================================================================
// ENTRY POINT
// =================================================================================================

export function optimizeBlend(stock, rules, supervisionSettings, blendSize, algorithm = 'standard') {
    blendSize = requiredNumber(blendSize, 'Tamaño de mezcla', { integer: true, min: 1 });
    if (!Array.isArray(stock) || stock.length === 0 || !Array.isArray(rules)) {
        throw Object.assign(new Error('Se requieren stock y reglas válidos.'), { statusCode: 400 });
    }
    if (!['standard', 'stability', 'stability-strict'].includes(algorithm)) {
        throw Object.assign(new Error('Algoritmo desconocido.'), { statusCode: 400 });
    }
    supervisionSettings = supervisionSettings || {};
    rules = normalizeMixingRules(rules);
    stock = stock.map((lot, index) => {
        if (!lot || typeof lot !== 'object' || Array.isArray(lot)) {
            throw Object.assign(new Error(`Lote ${index + 1} inválido.`), { statusCode: 400 });
        }
        const normalized = { ...lot, _lotId: lot._lotId || `L${index}` };
        normalized.QTDE_ESTOQUE = requiredNumber(lot.QTDE_ESTOQUE ?? lot['QTDE ESTOQUE'] ?? lot.qtde_estoque, `Lote ${index + 1}: stock`, { integer: true });
        for (const field of ['PESO', 'PESO_MEDIO', 'MIC', 'STR', 'ELG', 'SCI', 'MST', 'MAT', 'UI', 'SF', 'RD', 'PLUS_B', 'TRASH', 'CG']) {
            normalized[field] = optionalNumber(lot[field]);
        }
        normalized.UHML = optionalNumber(lot.UHML ?? lot.LEN);
        normalized.PLUS_B = optionalNumber(lot.PLUS_B ?? lot['+b']);
        return normalized;
    });
    if (new Set(stock.map(lot => lot._lotId)).size !== stock.length) {
        throw Object.assign(new Error('Hay identificadores de lote duplicados.'), { statusCode: 400 });
    }

    let result;
    if (algorithm === 'stability') {
        result = optimizeBlendStability(stock, rules, supervisionSettings, blendSize, false);
    } else if (algorithm === 'stability-strict') {
        result = optimizeBlendStability(stock, rules, supervisionSettings, blendSize, true);
    } else {
        result = optimizeBlendStandard(stock, rules, supervisionSettings, blendSize);
    }

    assertFeasibleBlendPlan(result);
    return result;
}

// =================================================================================================
// HELPERS / UTILS
// =================================================================================================

const toOptionalNumber = optionalNumber;
const recipeAverage = (recipe, key) => weightedAverage(recipe, lot => lot[key], baleWeight);

// Relative distance lets replacements improve all enabled targets together,
// instead of fixing one parameter while silently breaking another.
function targetPenalty(recipe, rules, settings) {
    let score = 0;
    for (const rule of rules) {
        const key = rule.parametro === 'LEN' ? 'UHML' : rule.parametro === '+b' ? 'PLUS_B' : rule.parametro;
        if (!settings[key]?.target) continue;
        const average = recipeAverage(recipe, key);
        if (average === null) return Infinity;
        const min = toOptionalNumber(rule.valor_ideal_min);
        const max = toOptionalNumber(rule.promedio_objetivo_max);
        if (min !== null && average < min) score += (min - average) / Math.max(1, Math.abs(min));
        if (max !== null && average > max) score += (average - max) / Math.max(1, Math.abs(max));
    }
    return score;
}

function summarizeActiveRules(activeRules) {
    if (!Array.isArray(activeRules) || activeRules.length === 0) return 'Sin reglas activas';
    return activeRules.map(r => r.parametro).join(', ');
}

function buildNoFeasibleBlockDiagnostics(blendSize, activeRules, specificReason = '') {
    const details = [
        `Fardos solicitados por mezcla: ${blendSize}.`,
        `Reglas activas: ${summarizeActiveRules(activeRules)}.`
    ];
    if (specificReason) details.push(specificReason);
    return {
        code: 'NO_FEASIBLE_BLOCK',
        message: 'La búsqueda no encontró un bloque que cumpla el stock y las reglas activas.',
        details
    };
}

function getMixesFromBlockId(blockId) {
    if (!blockId || typeof blockId !== 'string') return 1;
    const singleMatch = blockId.match(/^M(\d+)$/);
    if (singleMatch) return 1;
    const rangeMatch = blockId.match(/^M(\d+)-M(\d+)$/);
    if (!rangeMatch) return 1;
    const start = Number(rangeMatch[1]);
    const end   = Number(rangeMatch[2]);
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1;
    return end - start + 1;
}

function assertFeasibleBlendPlan(result) {
    if (!result || !result.success) return;

    const planRows = Array.isArray(result.plan) ? result.plan : [];
    const blockIds = Array.isArray(result.columnasMezcla) ? result.columnasMezcla : [];

    if (planRows.length === 0 || blockIds.length === 0) return;

    const issues = [];

    planRows.forEach((row) => {
        const stock = Number(row?.Stock);
        if (Number.isNaN(stock)) return;

        let remaining = stock;
        let projectedUsed = 0;

        for (const blockId of blockIds) {
            const perMixCount = Number(row?.mezclas?.[blockId]) || 0;
            const mixesFromStats = Number(result?.estadisticas?.[blockId]?.mezclasBloque);
            const mixesCount = (!Number.isNaN(mixesFromStats) && mixesFromStats > 0)
                ? mixesFromStats
                : getMixesFromBlockId(blockId);

            const consumedInBlock = perMixCount * mixesCount;
            projectedUsed += consumedInBlock;
            remaining -= consumedInBlock;

            // Solo reportar sobreconsumo si realmente consumimos de este lote
            // (evita falsos positivos en filas de grupo con stock inicial negativo)
            if (remaining < 0 && projectedUsed > 0) {
                issues.push(`Sobreconsumo en ${row.PRODUTOR}/${row.LOTE} al bloque ${blockId} (S.Act=${remaining}).`);
                break;
            }
        }
        
        if (projectedUsed === 0 && stock < 0) {
            return; // Omitir inconsistencias para filas ignoradas (ej. cabeceras de grupo)
        }

        const reportedUsed = Number(row?.Usados);
        if (row.Categoria === 'C' && projectedUsed > 0) {
            issues.push(`Lote rechazado utilizado: ${row.PRODUTOR}/${row.LOTE}.`);
        }
        if (!Number.isNaN(reportedUsed) && Math.round(projectedUsed) !== Math.round(reportedUsed)) {
            issues.push(`Inconsistencia de usados en ${row.PRODUTOR}/${row.LOTE}: proyectado ${projectedUsed}, reportado ${reportedUsed}.`);
        }

        const reportedRemaining = Number(row?.Sobrante);
        if (!Number.isNaN(reportedRemaining) && Math.round(remaining) !== Math.round(reportedRemaining)) {
            issues.push(`Inconsistencia de sobrante en ${row.PRODUTOR}/${row.LOTE}: proyectado ${remaining}, reportado ${reportedRemaining}.`);
        }
    });

    if (issues.length > 0) {
        const details = issues.slice(0, 3).join(' | ');
        throw new Error(`Plan de mezcla no realizable. ${details}`);
    }
}

// =================================================================================================
// CLASIFICACIÓN DE STOCK
// =================================================================================================

function classifyStock(stock, rules, supervisionSettings = {}) {
    const safeSettings = supervisionSettings || {};
    const activeRules = rules.filter(r => {
        const uiKey = r.parametro === 'LEN' ? 'UHML' : (r.parametro === '+b' ? 'PLUS_B' : r.parametro);
        const s = safeSettings[uiKey];
        return s && (s.target || s.hardCap || s.tolerance);
    });

    return stock.map((bale, index) => {
        // There is no defensible mass-weighted average without a real mass.
        let isRejected = bale.QTDE_ESTOQUE > 0 && baleWeight(bale) === null;
        let rejectReason = isRejected ? 'Peso de lote/fardo ausente o inválido' : '';
        let isTolerance = false;
        const toleranceReasons = [];

        for (const rule of activeRules) {
            if (isRejected) break;
            const uiKey = rule.parametro === 'LEN' ? 'UHML' : (rule.parametro === '+b' ? 'PLUS_B' : rule.parametro);
            const settings = safeSettings[uiKey];
            if (!settings) continue;

            const val = toOptionalNumber(bale[uiKey]);
            if (val === null) {
                isRejected = true;
                rejectReason = `${rule.parametro}: medición ausente o inválida`;
                break;
            }

            if (settings.hardCap) {
                const maxAbs = toOptionalNumber(rule.limite_max_absoluto);
                const minAbs = toOptionalNumber(rule.limite_min_absoluto);
                if (maxAbs !== null && val > maxAbs) {
                    isRejected = true; rejectReason = `${rule.parametro} > Max ${maxAbs}`; break;
                }
                if (minAbs !== null && val < minAbs) {
                    isRejected = true; rejectReason = `${rule.parametro} < Min ${minAbs}`; break;
                }
            }

            if (settings.tolerance) {
                const tolMin = toOptionalNumber(rule.rango_tol_min);
                const tolMax = toOptionalNumber(rule.rango_tol_max);
                if (tolMin !== null && tolMax !== null && val >= tolMin && val <= tolMax) {
                    isTolerance = true;
                    toleranceReasons.push(rule.parametro);
                }
            }
        }

        return {
            ...bale,
            _category: isRejected ? 'C' : (isTolerance ? 'B' : 'A'),
            _rejectReason: rejectReason,
            _toleranceReasons: toleranceReasons,
            _usedCount: 0,
            _availableCount: Number(bale.QTDE_ESTOQUE) || 0,
            _lotId: bale._lotId || `L${index}`
        };
    });
}

// =================================================================================================
// ALGORITMO 2: ESTABILIDAD (GOLDEN BATCH)
// =================================================================================================

function optimizeBlendStability(stock, rules, supervisionSettings = {}, blendSize, enforceToleranceCap = false) {
    const safeSettings = supervisionSettings || {};
    const classifiedStock = classifyStock(stock, rules, safeSettings);
    const activeRules = rules.filter(r => {
        const uiKey = r.parametro === 'LEN' ? 'UHML' : (r.parametro === '+b' ? 'PLUS_B' : r.parametro);
        const s = safeSettings[uiKey];
        return s && (s.target || s.hardCap || s.tolerance);
    });

    const availableLots = classifiedStock.filter(b => b._category !== 'C' && b._availableCount > 0);

    if (availableLots.length === 0) {
        const diagnostics = {
            code: 'NO_VALID_STOCK',
            message: 'No hay stock válido disponible para armar mezclas.',
            details: ['Todos los lotes fueron rechazados por límites absolutos o no tienen disponibilidad.']
        };
        return generateEmptyResult(classifiedStock, 'No hay stock válido disponible.', diagnostics);
    }

    const blends = [];
    let blendIndex = 1;
    let iterations = 0;
    const MAX_ITERATIONS = 100;

    let remainingLots = [...availableLots];
    let stopReason = '';

    // Búsqueda binaria del horizonte máximo
    const findMaxHorizon = (lots) => {
        const total = lots.reduce((sum, l) => sum + l._availableCount, 0);
        let low = 1;
        let high = Math.floor(total / blendSize);
        let best = 0;

        const feasible = (h) => {
            const capacity = lots.reduce((sum, l) => sum + Math.floor(l._availableCount / h), 0);
            return capacity >= blendSize;
        };

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (feasible(mid)) { best = mid; low = mid + 1; }
            else high = mid - 1;
        }
        return best;
    };

    // Construye la receta proporcional para un horizonte dado
    // Between capacity breakpoints the recipe is identical. Skip repeated
    // failed attempts, especially for large stocks with an unattainable target.
    const nextHorizon = (lots, horizon) => Math.min(horizon - 1, Math.max(0, ...lots.map(lot =>
        Math.floor(lot._availableCount / (Math.floor(lot._availableCount / horizon) + 1))
    )));
    const buildRecipeForHorizon = (lots, horizon) => {
        const totalStock = lots.reduce((sum, l) => sum + l._availableCount, 0);

        const candidates = lots.map((lot) => {
            const ideal    = (lot._availableCount / totalStock) * blendSize;
            const capacity = Math.floor(lot._availableCount / horizon);
            return { lot, idealShare: ideal, capacity, assigned: 0, remainder: ideal - Math.floor(ideal) };
        });

        const capableLots = candidates.filter(c => c.capacity >= 1);
        const smallLots   = candidates.filter(c => c.capacity <  1);

        let assignedTotal = 0;
        capableLots.forEach(c => {
            const minAssign = (capableLots.length <= blendSize) ? 1 : 0;
            c.assigned = Math.min(Math.max(Math.floor(c.idealShare), minAssign), c.capacity);
            assignedTotal += c.assigned;
        });

        let needed = blendSize - assignedTotal;
        if (needed < 0) {
            for (const c of [...capableLots].sort((a, b) => b.assigned - a.assigned)) {
                const remove = Math.min(c.assigned, -needed);
                c.assigned -= remove;
                needed += remove;
                if (needed === 0) break;
            }
        }
        if (needed > 0) {
            capableLots.sort((a, b) => {
                const slackA = a.capacity - a.assigned;
                const slackB = b.capacity - b.assigned;
                if (slackB !== slackA) return slackB - slackA;
                return b.remainder - a.remainder;
            });
            for (const c of capableLots) {
                if (needed <= 0) break;
                const canAdd = Math.min(c.capacity - c.assigned, needed);
                c.assigned += canAdd; assignedTotal += canAdd;
                needed = blendSize - assignedTotal;
            }
        }

        const smallAssignments = [];
        if (needed > 0 && smallLots.length > 0) {
            const smallLotClones = smallLots.map(s => ({
                lot: s.lot,
                tempAvailable: s.lot._availableCount
            }));
            smallLotClones.sort((a, b) => b.tempAvailable - a.tempAvailable);

            let currentSmallLotIdx = 0;
            while (needed > 0 && currentSmallLotIdx < smallLotClones.length) {
                const slotFardos = [];
                let fardosInSlot = 0;
                while (fardosInSlot < horizon && currentSmallLotIdx < smallLotClones.length) {
                    const sLot = smallLotClones[currentSmallLotIdx];
                    const take = Math.min(sLot.tempAvailable, horizon - fardosInSlot);
                    for (let i = 0; i < take; i++) slotFardos.push({ ...sLot.lot });
                    fardosInSlot += take;
                    sLot.tempAvailable -= take;
                    if (sLot.tempAvailable <= 0) currentSmallLotIdx++;
                }
                if (fardosInSlot === horizon) {
                    smallAssignments.push(slotFardos);
                    needed--;
                } else {
                    break;
                }
            }
        }

        if (needed > 0) return null;
        return { rows: capableLots.filter(c => c.assigned > 0), smallAssignments };
    };

    // Aplica cupo de tolerancia redirigiendo slots B→A
    const capToleranceInRecipe = (candidates) => {
        const caps = candidates.map(c => ({ ...c }));
        for (const rule of activeRules) {
            const uiKey = rule.parametro === 'LEN' ? 'UHML' : (rule.parametro === '+b' ? 'PLUS_B' : rule.parametro);
            const settings = safeSettings[uiKey];
            if (!settings || !settings.tolerance) continue;
            const minIdealPct = toOptionalNumber(rule.porcentaje_min_ideal);
            if (minIdealPct === null) continue;

            const maxBCount = Math.floor(blendSize * ((100 - minIdealPct) / 100));
            const bCaps = caps.filter(c =>
                c.lot._category === 'B' &&
                Array.isArray(c.lot._toleranceReasons) &&
                c.lot._toleranceReasons.includes(rule.parametro)
            );
            const currentBCount = bCaps.reduce((sum, c) => sum + c.assigned, 0);
            if (currentBCount <= maxBCount) continue;

            let toFree = currentBCount - maxBCount;
            bCaps.sort((a, b) => b.assigned - a.assigned);
            for (const bc of bCaps) {
                if (toFree <= 0) break;
                const reduce = Math.min(bc.assigned - 1, toFree);
                if (reduce > 0) { bc.assigned -= reduce; toFree -= reduce; }
            }
            if (toFree > 0) {
                bCaps.sort((a, b) => a.assigned - b.assigned);
                for (const bc of bCaps) {
                    if (toFree <= 0) break;
                    const reduce = Math.min(bc.assigned, toFree);
                    bc.assigned -= reduce; toFree -= reduce;
                }
            }

            const freed = (currentBCount - maxBCount) - toFree;
            const aCaps = caps
                .filter(c => c.lot._category === 'A' && c.assigned < c.capacity)
                .sort((a, b) => (b.capacity - b.assigned) - (a.capacity - a.assigned));
            let toFill = freed;
            for (const ac of aCaps) {
                if (toFill <= 0) break;
                const canAdd = Math.min(ac.capacity - ac.assigned, toFill);
                ac.assigned += canAdd; toFill -= canAdd;
            }
            if (toFill > 0) return null;
        }
        const total = caps.reduce((sum, c) => sum + c.assigned, 0);
        return total === blendSize ? caps.filter(c => c.assigned > 0) : null;
    };

    while (remainingLots.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        const totalStock = remainingLots.reduce((sum, l) => sum + l._availableCount, 0);
        if (totalStock < blendSize) break;

        let blockDuration = findMaxHorizon(remainingLots);
        if (blockDuration <= 0) break;

        let activeRecipe = null;
        let recipeFardos = null;

        while (blockDuration > 0) {
            const rawRecipe = buildRecipeForHorizon(remainingLots, blockDuration);
            if (!rawRecipe) { blockDuration = nextHorizon(remainingLots, blockDuration); continue; }

            if (enforceToleranceCap) {
                const capped = capToleranceInRecipe(rawRecipe.rows);
                if (!capped) { blockDuration = nextHorizon(remainingLots, blockDuration); continue; }
                activeRecipe = { ...rawRecipe, rows: capped };
            } else {
                activeRecipe = rawRecipe;
            }

            recipeFardos = [];
            activeRecipe.rows.forEach(item => {
                for (let k = 0; k < item.assigned; k++) recipeFardos.push({ ...item.lot });
            });
            if (activeRecipe.smallAssignments) {
                activeRecipe.smallAssignments.forEach(slot => {
                    if (slot.length > 0) recipeFardos.push({ ...slot[0] });
                });
            }

            if (!activeRecipe.smallAssignments?.length) {
                recipeFardos = improveRecipe(recipeFardos, remainingLots,
                    lot => Math.floor(lot._availableCount / blockDuration),
                    activeRules, safeSettings, blendSize, !enforceToleranceCap);
                const counts = new Map();
                recipeFardos.forEach(lot => counts.set(lot._lotId, (counts.get(lot._lotId) || 0) + 1));
                activeRecipe.rows = remainingLots.filter(lot => counts.has(lot._lotId))
                    .map(lot => ({ lot, assigned: counts.get(lot._lotId) }));
            }

            const validationFailure = getRecipeValidationFailure(
                recipeFardos, activeRules, supervisionSettings, blendSize, !enforceToleranceCap
            );
            if (!validationFailure) break;
            stopReason = validationFailure;
            blockDuration = nextHorizon(remainingLots, blockDuration);
        }

        if (!activeRecipe || blockDuration <= 0) break;

        for (let i = 0; i < blockDuration; i++) {
            const mezclaFardos = [];
            activeRecipe.rows.forEach(item => {
                for (let k = 0; k < item.assigned; k++) mezclaFardos.push({ ...item.lot });
            });
            if (activeRecipe.smallAssignments) {
                activeRecipe.smallAssignments.forEach(slotFardos => {
                    if (slotFardos[i]) mezclaFardos.push({ ...slotFardos[i] });
                });
            }
            blends.push({ index: blendIndex++, fardos: mezclaFardos });
        }

        activeRecipe.rows.forEach(item => {
            const consumed = item.assigned * blockDuration;
            item.lot._availableCount -= consumed;
            item.lot._usedCount      += consumed;
        });
        if (activeRecipe.smallAssignments) {
            activeRecipe.smallAssignments.forEach(slotFardos => {
                slotFardos.forEach((f, i) => {
                    const originalLot = classifiedStock.find(l => l._lotId === f._lotId);
                    if (originalLot && i < blockDuration) {
                        originalLot._availableCount -= 1;
                        originalLot._usedCount += 1;
                    }
                });
            });
        }

        remainingLots = remainingLots.filter(l => l._availableCount > 0);
    }

    const groupedBlends = groupBlends(blends);
    if (groupedBlends.length === 0) {
        const diag = buildNoFeasibleBlockDiagnostics(blendSize, activeRules, stopReason);
        return generateEmptyResult(classifiedStock, diag.message, diag);
    }
    return generateResult(classifiedStock, groupedBlends, rules, supervisionSettings, null);
}

// =================================================================================================
// VALIDACIÓN DE RECETA
// =================================================================================================

function getRecipeValidationFailure(recipeFardos, activeRules, supervisionSettings = {}, blendSize, informationalTolerance = false) {
    const safeSettings = supervisionSettings || {};
    if (recipeFardos.length !== blendSize) return 'La receta no completa la cantidad de fardos solicitada.';
    if (recipeFardos.some(f => f._category === 'C' || baleWeight(f) === null)) return 'La receta contiene lotes rechazados o sin peso válido.';
    for (const rule of activeRules) {
        const uiKey = rule.parametro === 'LEN' ? 'UHML' : (rule.parametro === '+b' ? 'PLUS_B' : rule.parametro);
        const settings = safeSettings[uiKey];
        if (!settings) continue;

        const values = recipeFardos.map(f => toOptionalNumber(f[uiKey]));
        if (values.some(v => v === null)) return `${rule.parametro}: falta una medición válida.`;

        if (settings.target) {
            const average = recipeAverage(recipeFardos, uiKey);
            const min = toOptionalNumber(rule.valor_ideal_min);
            const max = toOptionalNumber(rule.promedio_objetivo_max);
            if ((min !== null && average < min - 1e-9) || (max !== null && average > max + 1e-9)) {
                return `El promedio ponderado de ${rule.parametro} (${average}) no cumple el objetivo.`;
            }
        }

        if (settings.hardCap) {
            const maxAbs = toOptionalNumber(rule.limite_max_absoluto);
            const minAbs = toOptionalNumber(rule.limite_min_absoluto);
            const violatesHardCap = values.some(v =>
                (maxAbs !== null && v > maxAbs) || (minAbs !== null && v < minAbs)
            );
            if (violatesHardCap) {
                return `La regla hard cap de ${rule.parametro} no se puede cumplir con la receta propuesta.`;
            }
        }

        if (!informationalTolerance && settings.tolerance) {
            const minIdealPct = toOptionalNumber(rule.porcentaje_min_ideal);
            if (minIdealPct !== null) {
                const maxTolerancePct   = 100 - minIdealPct;
                const maxToleranceCount = Math.floor(blendSize * (maxTolerancePct / 100));
                const toleranceCount    = recipeFardos.filter(f =>
                    f._category === 'B' &&
                    Array.isArray(f._toleranceReasons) &&
                    f._toleranceReasons.includes(rule.parametro)
                ).length;
                if (toleranceCount > maxToleranceCount) {
                    return `El cupo de tolerancia de ${rule.parametro} es insuficiente (${toleranceCount}/${maxToleranceCount}) para completar la mezcla.`;
                }
            }
        }
    }
    return null;
}

// =================================================================================================
// OPTIMIZACIÓN DE CALIDAD (HILL CLIMBING)
// =================================================================================================

function improveRecipe(recipe, lots, capacityOf, rules, settings, blendSize, informationalTolerance = false) {
    let score = targetPenalty(recipe, rules, settings);
    const structuralSettings = Object.fromEntries(Object.entries(settings)
        .map(([key, value]) => [key, { ...value, target: false }]));
    for (let iteration = 0; score > 1e-9 && iteration < blendSize * 2; iteration++) {
        const counts = new Map();
        recipe.forEach(lot => counts.set(lot._lotId, (counts.get(lot._lotId) || 0) + 1));
        let best = null;
        let bestScore = score;
        for (let index = 0; index < recipe.length; index++) {
            // Identical lots need only one replacement attempt.
            if (recipe.findIndex(lot => lot._lotId === recipe[index]._lotId) !== index) continue;
            for (const lot of lots) {
                if (lot._category === 'C' || lot._lotId === recipe[index]._lotId) continue;
                if ((counts.get(lot._lotId) || 0) >= capacityOf(lot)) continue;
                const next = [...recipe];
                next[index] = { ...lot };
                if (getRecipeValidationFailure(next, rules, structuralSettings, blendSize, informationalTolerance)) continue;
                const nextScore = targetPenalty(next, rules, settings);
                if (nextScore < bestScore - 1e-12) {
                    bestScore = nextScore;
                    best = next;
                }
            }
        }
        if (!best) break;
        recipe = best;
        score = bestScore;
    }
    return recipe;
}

// =================================================================================================
// FIRMA Y AGRUPACIÓN DE MEZCLAS
// =================================================================================================

function getBlendSignature(blendFardos) {
    const counts = {};
    blendFardos.forEach(f => {
        const key = f._lotId;
        counts[key] = (counts[key] || 0) + 1;
    });
    return Object.keys(counts).sort().map(k => `${k}:${counts[k]}`).join('|');
}

function groupBlends(blends) {
    if (blends.length === 0) return [];
    const results = [];
    let current = {
        start: blends[0].index,
        end:   blends[0].index,
        sig:   getBlendSignature(blends[0].fardos),
        fardos: blends[0].fardos
    };
    for (let i = 1; i < blends.length; i++) {
        const sig = getBlendSignature(blends[i].fardos);
        if (sig === current.sig) {
            current.end = blends[i].index;
        } else {
            results.push({
                id: current.start === current.end
                    ? `M${current.start}`
                    : `M${current.start}-M${current.end}`,
                mezclasBloque: current.end - current.start + 1,
                fardos: current.fardos
            });
            current = { start: blends[i].index, end: blends[i].index, sig, fardos: blends[i].fardos };
        }
    }
    results.push({
        id: current.start === current.end
            ? `M${current.start}`
            : `M${current.start}-M${current.end}`,
        mezclasBloque: current.end - current.start + 1,
        fardos: current.fardos
    });
    return results;
}

// =================================================================================================
// ALGORITMO 1: ESTÁNDAR (ROUND ROBIN + QUALITY OPTIMIZATION)
// =================================================================================================

function optimizeBlendStandard(stock, rules, supervisionSettings = {}, blendSize) {
    const safeSettings = supervisionSettings || {};
    const classifiedStock = classifyStock(stock, rules, safeSettings);
    const blends = [];
    let blendIndex = 1;

    const activeRules = rules.filter(r => {
        const uiKey = r.parametro === 'LEN' ? 'UHML' : (r.parametro === '+b' ? 'PLUS_B' : r.parametro);
        const s = safeSettings[uiKey];
        return s && (s.target || s.hardCap || s.tolerance);
    });

    const canAddToleranceBaleToRecipe = (bale, currentRecipe) => {
        if (bale._category === 'C') return false;
        if (bale._category === 'A') return true;
        for (const param of bale._toleranceReasons) {
            const rule = activeRules.find(r => r.parametro === param);
            if (!rule) continue;
            const minIdealPct      = toOptionalNumber(rule.porcentaje_min_ideal);
            if (minIdealPct === null) continue;
            const maxTolerancePct  = 100 - minIdealPct;
            const maxToleranceCount = Math.floor(blendSize * (maxTolerancePct / 100));
            const currentTolCount  = currentRecipe.filter(b =>
                b._category === 'B' && b._toleranceReasons.includes(param)
            ).length;
            if (currentTolCount >= maxToleranceCount) return false;
        }
        return true;
    };

    const buildRecipe = (availableLots) => {
        if (availableLots.length === 0) return null;
        availableLots.sort((a, b) => b._availableCount - a._availableCount);

        let recipe   = [];
        let lotIndex = 0;
        let attempts = 0;
        const tempCounts = new Map();

        // Fase 1: round-robin básico
        while (recipe.length < blendSize && attempts < availableLots.length) {
            const lot  = availableLots[lotIndex];
            const used = tempCounts.get(lot) || 0;

            if (used < lot._availableCount) {
                if (lot._category === 'A' || canAddToleranceBaleToRecipe(lot, recipe)) {
                    recipe.push({ ...lot });
                    tempCounts.set(lot, used + 1);
                    attempts = 0;
                    lotIndex = (lotIndex + 1) % availableLots.length;
                    continue;
                }
            }
            attempts++;
            lotIndex = (lotIndex + 1) % availableLots.length;
        }

        if (recipe.length !== blendSize) return null;
        recipe = improveRecipe(recipe, availableLots, lot => lot._availableCount,
            activeRules, safeSettings, blendSize);
        return getRecipeValidationFailure(recipe, activeRules, safeSettings, blendSize) ? null : recipe;
    };

    let availableLots = classifiedStock.filter(b => b._category !== 'C' && b._availableCount > 0);
    let currentRecipe = buildRecipe(availableLots);

    while (currentRecipe) {
        const recipeCounts = new Map();
        currentRecipe.forEach(f => {
            const origLot = classifiedStock.find(l => l._lotId === f._lotId);
            recipeCounts.set(origLot, (recipeCounts.get(origLot) || 0) + 1);
        });

        let maxRepeats = Infinity;
        for (const [lot, countInRecipe] of recipeCounts.entries()) {
            const possibleRepeats = Math.floor(lot._availableCount / countInRecipe);
            if (possibleRepeats < maxRepeats) maxRepeats = possibleRepeats;
        }

        if (maxRepeats === 0 || maxRepeats === Infinity) break;

        for (let i = 0; i < maxRepeats; i++) {
            blends.push({ index: blendIndex++, fardos: currentRecipe.map(b => ({ ...b })) });
        }

        for (const [lot, countInRecipe] of recipeCounts.entries()) {
            const totalUsed = countInRecipe * maxRepeats;
            lot._availableCount -= totalUsed;
            lot._usedCount      += totalUsed;
        }

        availableLots = classifiedStock.filter(b => b._category !== 'C' && b._availableCount > 0);
        currentRecipe = buildRecipe(availableLots);
    }

    const groupedBlends = groupBlends(blends);
    if (groupedBlends.length === 0) {
        const diag = buildNoFeasibleBlockDiagnostics(
            blendSize,
            activeRules,
            'No se encontró una receta Round Robin que cumpla simultáneamente disponibilidad y límites activos.'
        );
        return generateEmptyResult(classifiedStock, diag.message, diag);
    }
    return generateResult(classifiedStock, groupedBlends, rules, supervisionSettings, null);
}

// =================================================================================================
// HELPERS DE ESTADO Y MOTIVO
// =================================================================================================

function getEstadoLabelFromLot(lot) {
    if (lot._category === 'C') return 'RECH.';
    if (Number(lot._usedCount) > 0) return lot._category === 'B' ? 'TOLER.' : 'USO';
    return 'NO USO';
}

function getMotivoLogisticoFromLot(lot) {
    if (lot._category === 'C') return lot._rejectReason || 'Rechazado por límites absolutos';
    if (Number(lot._usedCount) > 0) return '';
    if (lot._category === 'B') return 'No usado (tolerancia/exceso)';
    return 'No usado en ninguna mezcla';
}

// =================================================================================================
// PLAN DE STOCK
// =================================================================================================

function buildFullStockPlanRows(classifiedStock) {
    return classifiedStock.map(lot => ({
        PRODUTOR: lot.PRODUTOR,
        _lotId: lot._lotId,
        Estado: getEstadoLabelFromLot(lot),
        // Categoria se mantiene para compatibilidad con frontend (deriveEstadoFromCategoria)
        Categoria: lot._category,
        LOTE: lot.LOTE,
        TAM: lot.TAM,
        TP: lot.TP,
        CLASSIF: lot.CLASSIF,
        Stock: Number(lot.QTDE_ESTOQUE) || 0,
        Usados: Number(lot._usedCount) || 0,
        Sobrante: Number(lot._availableCount) || 0,
        MIC: lot.MIC,
        STR: lot.STR,
        ELG: lot.ELG,
        LEN: lot.UHML ?? lot.LEN,
        UHML: lot.UHML,
        PLUS_B: lot.PLUS_B,
        PESO: lot.PESO,
        PESO_MEDIO: baleWeight(lot),
        CG: lot.CG,
        TRASH: lot.TRASH,
        MotivoLogistico: getMotivoLogisticoFromLot(lot),
        MotivoC: lot._rejectReason || '',
        mezclas: {}
    }));
}

// =================================================================================================
// GENERACIÓN DE RESULTADOS
// =================================================================================================

function generateResult(classifiedStock, groupedBlends, rules, supervisionSettings, diagnostics = null) {
    const activeRules = rules.filter(r => {
        const uiKey = r.parametro === 'LEN' ? 'UHML' : (r.parametro === '+b' ? 'PLUS_B' : r.parametro);
        const s = supervisionSettings[uiKey];
        return s && (s.target || s.hardCap || s.tolerance);
    });

    // Remanentes (rechazados + sobrantes)
    const remanentes = [];
    classifiedStock.forEach(b => {
        let motivo = '';
        if (b._category === 'C') motivo = b._rejectReason;
        else if (b._availableCount > 0) {
            motivo = b._category === 'B' ? 'Sobrante (Tolerancia/Exceso)' : 'Sobrante';
        }
        if (b._category === 'C' || b._availableCount > 0) {
            remanentes.push({
                PRODUTOR: b.PRODUTOR,
                LOTE:     b.LOTE,
                TAM:      b.TAM,
                TP:       b.TP,
                CLASSIF:  b.CLASSIF,
                MIC:      b.MIC,
                STR:      b.STR,
                ELG:      b.ELG,
                LEN:      b.UHML ?? b.LEN,
                Fardos:   b._category === 'C' ? Number(b.QTDE_ESTOQUE) : b._availableCount,
                Peso:     baleWeight(b) === null ? null : baleWeight(b) *
                          (b._category === 'C' ? Number(b.QTDE_ESTOQUE) : b._availableCount),
                Motivo:   motivo
            });
        }
    });

    // Plan
    const planArray = buildFullStockPlanRows(classifiedStock);
    const planRowsMap = new Map();
    planArray.forEach(row => planRowsMap.set(row._lotId, row));

    groupedBlends.forEach(blend => {
        const blendId    = blend.id;
        const loteCounts = {};
        blend.fardos.forEach(f => {
            const key = f._lotId;
            if (!loteCounts[key]) loteCounts[key] = { count: 0, ref: f };
            loteCounts[key].count++;
        });
        Object.values(loteCounts).forEach(({ count, ref }) => {
            const row = planRowsMap.get(ref._lotId);
            if (row) row.mezclas[blendId] = count;
        });
    });

    // Ordenar por Productor y Lote
    planArray.sort((a, b) => {
        const pc = `${a.PRODUTOR || ''}`.localeCompare(`${b.PRODUTOR || ''}`, 'es', { sensitivity: 'base', numeric: true });
        if (pc !== 0) return pc;
        return `${a.LOTE || ''}`.localeCompare(`${b.LOTE || ''}`, 'es', { sensitivity: 'base', numeric: true });
    });

    return {
        success: true,
        plan: planArray,
        columnasMezcla: groupedBlends.map(b => b.id),
        remanentes,
        estadisticas: calcularEstadisticas(groupedBlends, activeRules),
        diagnostics
    };
}

function generateEmptyResult(stock, message, diagnostics = null) {
    const plan = buildFullStockPlanRows(stock);
    return {
        success: true,
        plan,
        columnasMezcla: [],
        remanentes: stock.map(b => ({
            PRODUTOR: b.PRODUTOR,
            LOTE:     b.LOTE,
            TP:       b.TP,
            CLASSIF:  b.CLASSIF,
            Fardos:   b._availableCount,
            Motivo:   b._rejectReason || message
        })),
        estadisticas: {},
        diagnostics,
        mensaje: message
    };
}

// =================================================================================================
// ESTADÍSTICAS POR MEZCLA
// =================================================================================================

function calcularEstadisticas(blends, activeRules) {
    const stats = {};

    blends.forEach(blend => {
        const bId    = blend.id;
        const fardos = blend.fardos;
        const totalFardos = fardos.length;

        const pesoUnitario = baleWeight;

        const pesoPorMezcla   = fardos.reduce((sum, f) => sum + pesoUnitario(f), 0);
        const mezclasBloque   = Number(blend.mezclasBloque) || getMixesFromBlockId(bId);
        const pesoTotalBloque = pesoPorMezcla * mezclasBloque;

        // Clasificación ponderada (TP + CLASSIF → valor numérico)
        const classifNumeric = (f) => {
            const tp = String(f.TP || '').trim();
            const cl = String(f.CLASSIF || f.CLASSIFIC || '').trim();
            if (!tp) return null;
            if (tp === 'C') {
                if (cl === '1/4') return 2.25; if (cl === '1/2') return 2.50;
                if (cl === '3/4') return 2.75; return 2.00;
            }
            if (tp === 'D') {
                if (cl === '1/4') return 3.25; if (cl === '1/2') return 3.50;
                if (cl === '3/4') return 3.75; return 3.00;
            }
            return null;
        };
        let sumClassifPeso = 0, sumPesoClassif = 0;
        fardos.forEach(f => {
            const cv = classifNumeric(f);
            if (cv !== null) {
                const pw = pesoUnitario(f);
                sumClassifPeso += cv * pw; sumPesoClassif += pw;
            }
        });
        const clasificacionProm = sumPesoClassif > 0
            ? Math.round((sumClassifPeso / sumPesoClassif) * 100) / 100
            : null;

        stats[bId] = {
            totalFardos,
            mezclasBloque,
            pesoPorMezcla,
            pesoTotalBloque,
            pesoTotal: pesoPorMezcla,
            pesoPromedio: totalFardos > 0 ? pesoPorMezcla / totalFardos : 0,
            clasificacionProm,
            variables: {}
        };

        const coreParams      = ['LEN', 'MIC', 'STR', 'ELG'];
        const paramsToCompute = [...new Set([
            ...coreParams,
            ...(activeRules || []).map(r => r?.parametro).filter(Boolean)
        ])];

        paramsToCompute.forEach(ruleParam => {
            const vKey = ruleParam === 'LEN' ? 'UHML' : (ruleParam === '+b' ? 'PLUS_B' : ruleParam);
            const rule = (activeRules || []).find(r => r.parametro === ruleParam);

            stats[bId].variables[ruleParam] = { promedioGeneral: recipeAverage(fardos, vKey) };

            if (rule) {
                const fardosA = fardos.filter(f => {
                    const reasons = Array.isArray(f._toleranceReasons) ? f._toleranceReasons : [];
                    return f._category === 'A' || !reasons.includes(ruleParam);
                });
                const fardosB = fardos.filter(f => {
                    const reasons = Array.isArray(f._toleranceReasons) ? f._toleranceReasons : [];
                    return f._category === 'B' && reasons.includes(ruleParam);
                });

                stats[bId].variables[ruleParam].promedioIdeal = recipeAverage(fardosA, vKey);
                stats[bId].variables[ruleParam].promedioTolerancia = recipeAverage(fardosB, vKey);
                stats[bId].variables[ruleParam].pctIdeal           = totalFardos > 0 ? (fardosA.length / totalFardos) * 100 : 0;
                stats[bId].variables[ruleParam].pctTolerancia      = totalFardos > 0 ? (fardosB.length / totalFardos) * 100 : 0;
            }
        });
    });

    return stats;
}
