/**
 * Optimizer Service for the stc-mezclas-poc.
 * Ported from stc-produccion-v2/backend/services/blendomat-optimizer.js
 */

export function optimizeBlend(stock, rules, supervisionSettings, blendSize, algorithm = 'standard') {
    if (!blendSize || blendSize <= 0) {
        throw new Error("El tamaño de la mezcla (fardos) debe ser mayor a 0.");
    }
    if (!stock || stock.length === 0) {
        throw new Error("No hay stock disponible para procesar.");
    }

    // Despachador de algoritmos
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

function toOptionalNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
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

    if (specificReason) {
        details.push(specificReason);
    }

    return {
        code: 'NO_FEASIBLE_BLOCK',
        message: 'No se pudo armar ningún bloque con el stock y las reglas activas.',
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
    const end = Number(rangeMatch[2]);
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

            if (remaining < 0) {
                issues.push(`Sobreconsumo en ${row.PRODUTOR}/${row.LOTE} al bloque ${blockId} (S.Act=${remaining}).`);
                break;
            }
        }

        const reportedUsed = Number(row?.Usados);
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

function optimizeBlendStability(stock, rules, supervisionSettings, blendSize, enforceToleranceCap = false) {
    const classifiedStock = classifyStock(stock, rules, supervisionSettings);
    const activeRules = rules.filter(r => {
        const uiKey = r.parametro === 'LEN' ? 'UHML' : (r.parametro === '+b' ? 'PLUS_B' : r.parametro);
        const s = supervisionSettings[uiKey];
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
    
    let processedStock = [...availableLots];

    let remainingLots = [...processedStock];
    let stopReason = '';

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
            if (feasible(mid)) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return best;
    };

    const buildRecipeForHorizon = (lots, horizon) => {
        const totalStock = lots.reduce((sum, l) => sum + l._availableCount, 0);
        
        const candidates = lots.map((lot) => {
            const ideal = (lot._availableCount / totalStock) * blendSize;
            const capacity = Math.floor(lot._availableCount / horizon);
            return {
                lot,
                idealShare: ideal,
                capacity,
                assigned: 0, 
                remainder: ideal - Math.floor(ideal)
            };
        });

        const capableLots = candidates.filter(c => c.capacity >= 1);
        const smallLots = candidates.filter(c => c.capacity < 1);

        let assignedTotal = 0;
        capableLots.forEach(c => {
            const minAssign = (capableLots.length <= blendSize) ? 1 : 0;
            c.assigned = Math.min(Math.max(Math.floor(c.idealShare), minAssign), c.capacity);
            assignedTotal += c.assigned;
        });

        let needed = blendSize - assignedTotal;
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
                c.assigned += canAdd;
                assignedTotal += canAdd;
                needed = blendSize - assignedTotal;
            }
        }

        const smallAssignments = []; 
        if (needed > 0 && smallLots.length > 0) {
            smallLots.sort((a, b) => b.lot._availableCount - a.lot._availableCount);
            let currentSmallLotIdx = 0;
            while (needed > 0 && currentSmallLotIdx < smallLots.length) {
                const slotFardos = [];
                let fardosInSlot = 0;
                while (fardosInSlot < horizon && currentSmallLotIdx < smallLots.length) {
                    const sLot = smallLots[currentSmallLotIdx];
                    const take = Math.min(sLot.lot._availableCount, horizon - fardosInSlot);
                    for (let i = 0; i < take; i++) {
                        slotFardos.push({ ...sLot.lot });
                    }
                    fardosInSlot += take;
                    if (sLot.lot._availableCount <= take) {
                        currentSmallLotIdx++;
                    } else {
                        sLot.lot._availableCount -= take; 
                    }
                }
                if (fardosInSlot > 0) {
                    while (fardosInSlot < horizon && slotFardos.length > 0) {
                        slotFardos.push({ ...slotFardos[slotFardos.length - 1] });
                        fardosInSlot++;
                    }
                    smallAssignments.push(slotFardos);
                    needed--;
                }
            }
        }

        if (needed > 0) return null;
        return { rows: capableLots.filter(c => c.assigned > 0), smallAssignments };
    };

    const capToleranceInRecipe = (candidates) => {
        const caps = candidates.map(c => ({ ...c }));
        for (const rule of activeRules) {
            const uiKey = rule.parametro === 'LEN' ? 'UHML' : (rule.parametro === '+b' ? 'PLUS_B' : rule.parametro);
            const settings = supervisionSettings[uiKey];
            if (!settings || !settings.tolerance) continue;
            const minIdealPct = toOptionalNumber(rule.porcentaje_min_ideal);
            if (minIdealPct === null) continue;
            const maxBCount = Math.floor(blendSize * ((100 - minIdealPct) / 100));
            const bCaps = caps.filter(c => c.lot._category === 'B' && Array.isArray(c.lot._toleranceReasons) && c.lot._toleranceReasons.includes(rule.parametro));
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
            const aCaps = caps.filter(c => c.lot._category === 'A' && c.assigned < c.capacity).sort((a, b) => (b.capacity - b.assigned) - (a.capacity - a.assigned));
            let toFill = freed;
            for (const ac of aCaps) {
                if (toFill <= 0) break;
                const canAdd = Math.min(ac.capacity - ac.assigned, toFill);
                ac.assigned += canAdd;
                toFill -= canAdd;
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
            if (!rawRecipe) { blockDuration -= 1; continue; }
            if (enforceToleranceCap) {
                const capped = capToleranceInRecipe(rawRecipe.rows);
                if (!capped) { blockDuration -= 1; continue; }
                activeRecipe = { ...rawRecipe, rows: capped };
            } else { activeRecipe = rawRecipe; }
            recipeFardos = [];
            activeRecipe.rows.forEach(item => { for (let k = 0; k < item.assigned; k++) recipeFardos.push({ ...item.lot }); });
            if (activeRecipe.smallAssignments) activeRecipe.smallAssignments.forEach(slot => { if (slot.length > 0) recipeFardos.push({ ...slot[0] }); });
            const validationFailure = getRecipeValidationFailure(recipeFardos, activeRules, supervisionSettings, blendSize, !enforceToleranceCap);
            if (!validationFailure) break;
            stopReason = validationFailure;
            blockDuration -= 1;
        }
        if (!activeRecipe || blockDuration <= 0) break;
        for (let i = 0; i < blockDuration; i++) {
            const mezclaFardos = [];
            activeRecipe.rows.forEach(item => { for (let k = 0; k < item.assigned; k++) mezclaFardos.push({ ...item.lot }); });
            if (activeRecipe.smallAssignments) activeRecipe.smallAssignments.forEach(slot => { if (slot[i]) mezclaFardos.push({ ...slot[i] }); });
            blends.push({ index: blendIndex++, fardos: mezclaFardos });
        }
        activeRecipe.rows.forEach(item => { const consumed = item.assigned * blockDuration; item.lot._availableCount -= consumed; item.lot._usedCount += consumed; });
        if (activeRecipe.smallAssignments) activeRecipe.smallAssignments.forEach(slot => { slot.forEach((f, i) => { const originalLot = classifiedStock.find(l => l.LOTE === f.LOTE && l.PRODUTOR === f.PRODUTOR); if (originalLot && i < blockDuration) originalLot._usedCount += 1; }); });
        remainingLots = remainingLots.filter(l => l._availableCount > 0);
    }

    const groupedBlends = groupBlends(blends);
    if (groupedBlends.length === 0) {
        const diag = buildNoFeasibleBlockDiagnostics(blendSize, activeRules, stopReason);
        return generateEmptyResult(classifiedStock, diag.message, diag);
    }
    return generateResult(classifiedStock, groupedBlends, rules, supervisionSettings);
}

function groupBlends(blends) {
    if (blends.length === 0) return [];
    const results = [];
    let current = { start: blends[0].index, end: blends[0].index, sig: getBlendSignature(blends[0].fardos), fardos: blends[0].fardos };
    for (let i = 1; i < blends.length; i++) {
        const sig = getBlendSignature(blends[i].fardos);
        if (sig === current.sig) current.end = blends[i].index;
        else {
            results.push({ id: current.start === current.end ? `M${current.start}` : `M${current.start}-M${current.end}`, mezclasBloque: current.end - current.start + 1, fardos: current.fardos });
            current = { start: blends[i].index, end: blends[i].index, sig, fardos: blends[i].fardos };
        }
    }
    results.push({ id: current.start === current.end ? `M${current.start}` : `M${current.start}-M${current.end}`, mezclasBloque: current.end - current.start + 1, fardos: current.fardos });
    return results;
}

function getBlendSignature(fardos) {
    const counts = {};
    fardos.forEach(f => { const key = `${f.PRODUTOR}_${f.LOTE}`; counts[key] = (counts[key] || 0) + 1; });
    return Object.keys(counts).sort().map(k => `${k}:${counts[k]}`).join('|');
}

function getRecipeValidationFailure(recipeFardos, activeRules, supervisionSettings, blendSize, hardCapOnly = false) {
    for (const rule of activeRules) {
        const uiKey = rule.parametro === 'LEN' ? 'UHML' : (rule.parametro === '+b' ? 'PLUS_B' : rule.parametro);
        const settings = supervisionSettings[uiKey];
        if (!settings) continue;
        const values = recipeFardos.map(f => Number(f[uiKey])).filter(v => !Number.isNaN(v));
        if (values.length === 0) continue;
        if (settings.hardCap) {
            const maxAbs = toOptionalNumber(rule.limite_max_absoluto), minAbs = toOptionalNumber(rule.limite_min_absoluto);
            if (values.some(v => (maxAbs !== null && v > maxAbs) || (minAbs !== null && v < minAbs))) return `Hard cap ${rule.parametro} violated.`;
        }
        if (!hardCapOnly && settings.tolerance) {
            const minIdealPct = toOptionalNumber(rule.porcentaje_min_ideal);
            if (minIdealPct !== null) {
                const maxToleranceCount = Math.floor(blendSize * ((100 - minIdealPct) / 100));
                const toleranceCount = recipeFardos.filter(f => f._category === 'B' && Array.isArray(f._toleranceReasons) && f._toleranceReasons.includes(rule.parametro)).length;
                if (toleranceCount > maxToleranceCount) return `Tolerancia ${rule.parametro} exceeded.`;
            }
        }
    }
    return null;
}

function optimizeBlendStandard(stock, rules, supervisionSettings, blendSize) {
    const classifiedStock = classifyStock(stock, rules, supervisionSettings);
    const blends = [];
    let blendIndex = 1;
    const activeRules = rules.filter(r => {
        const uiKey = r.parametro === 'LEN' ? 'UHML' : (r.parametro === '+b' ? 'PLUS_B' : r.parametro);
        const s = supervisionSettings[uiKey];
        return s && (s.target || s.hardCap || s.tolerance);
    });

    const canAddTolerance = (bale, currentRecipe) => {
        if (bale._category === 'A') return true;
        for (const param of bale._toleranceReasons) {
            const rule = activeRules.find(r => r.parametro === param);
            if (!rule) continue;
            const maxToleranceCount = Math.floor(blendSize * ((100 - (Number(rule.porcentaje_min_ideal) || 100)) / 100));
            if (currentRecipe.filter(b => b._category === 'B' && b._toleranceReasons.includes(param)).length >= maxToleranceCount) return false;
        }
        return true;
    };

    const buildRecipe = (avail) => {
        if (avail.length === 0) return null;
        avail.sort((a, b) => b._availableCount - a._availableCount);
        let recipe = [], lotIdx = 0, attempts = 0, counts = new Map();
        while (recipe.length < blendSize && attempts < avail.length) {
            const lot = avail[lotIdx];
            const used = counts.get(lot) || 0;
            if (used < lot._availableCount && (lot._category === 'A' || canAddTolerance(lot, recipe))) {
                recipe.push({ ...lot });
                counts.set(lot, used + 1);
                attempts = 0;
            } else attempts++;
            lotIdx = (lotIdx + 1) % avail.length;
        }
        return recipe.length === blendSize ? recipe : null;
    };

    let avail = classifiedStock.filter(b => b._availableCount > 0);
    let recipe = buildRecipe(avail);
    while (recipe) {
        const rCounts = new Map();
        recipe.forEach(f => { const l = classifiedStock.find(x => x.LOTE === f.LOTE && x.PRODUTOR === f.PRODUTOR); rCounts.set(l, (rCounts.get(l) || 0) + 1); });
        let repeats = Infinity;
        for (const [l, c] of rCounts.entries()) repeats = Math.min(repeats, Math.floor(l._availableCount / c));
        if (repeats === 0 || repeats === Infinity) break;
        for (let i = 0; i < repeats; i++) blends.push({ index: blendIndex++, fardos: recipe.map(b => ({ ...b })) });
        for (const [l, c] of rCounts.entries()) { l._availableCount -= c * repeats; l._usedCount += c * repeats; }
        avail = classifiedStock.filter(b => b._availableCount > 0);
        recipe = buildRecipe(avail);
    }
    const grouped = groupBlends(blends);
    return grouped.length > 0 ? generateResult(classifiedStock, grouped, rules, supervisionSettings) : generateEmptyResult(classifiedStock, 'No standard recipe found.');
}

function classifyStock(stock, rules, supervisionSettings) {
    const active = rules.filter(r => {
        const k = r.parametro === 'LEN' ? 'UHML' : (r.parametro === '+b' ? 'PLUS_B' : r.parametro);
        const s = supervisionSettings[k];
        return s && (s.target || s.hardCap || s.tolerance);
    });
    return stock.map(bale => {
        let isRej = false, rejReas = '', isTol = false, tolReas = [];
        for (const r of active) {
            const k = r.parametro === 'LEN' ? 'UHML' : (r.parametro === '+b' ? 'PLUS_B' : r.parametro);
            const s = supervisionSettings[k];
            const val = Number(bale[k]);
            if (isNaN(val)) continue;
            if (s.hardCap) {
                const max = toOptionalNumber(r.limite_max_absoluto), min = toOptionalNumber(r.limite_min_absoluto);
                if ((max !== null && val > max) || (min !== null && val < min)) { isRej = true; rejReas = `${r.parametro} hardcap`; break; }
            }
            if (s.tolerance) {
                const min = toOptionalNumber(r.rango_tol_min), max = toOptionalNumber(r.rango_tol_max);
                if (min !== null && max !== null && val >= min && val <= max) { isTol = true; tolReas.push(r.parametro); }
            }
        }
        return { ...bale, _category: isRej ? 'C' : (isTol ? 'B' : 'A'), _rejectReason: rejReas, _toleranceReasons: tolReas, _usedCount: 0, _availableCount: Number(bale.QTDE_ESTOQUE) || 0 };
    });
}

function calcularEstadisticas(groupedBlends, rules, supervisionSettings) {
    const activeRules = rules.filter(r => {
        const k = r.parametro === 'LEN' ? 'UHML' : (r.parametro === '+b' ? 'PLUS_B' : r.parametro);
        const s = supervisionSettings[k];
        return s && (s.target || s.hardCap || s.tolerance);
    });

    const stats = {};

    groupedBlends.forEach(blend => {
        const bId = blend.id;
        const fardos = blend.fardos;
        const totalFardos = fardos.length;

        // Peso por fardo: usa PESO/QTDE_ESTOQUE si disponible, sino peso unitario = 1
        const pesoUnitario = (f) => {
            const p = Number(f.PESO);
            const q = Number(f.QTDE_ESTOQUE) || 1;
            return p > 0 ? p / q : 1;
        };
        const pesoPorMezcla = fardos.reduce((sum, f) => sum + pesoUnitario(f), 0);
        const mezclasBloque = Number(blend.mezclasBloque) || getMixesFromBlockId(bId);
        const pesoTotalBloque = pesoPorMezcla * mezclasBloque;

        stats[bId] = {
            totalFardos,
            mezclasBloque,
            pesoPorMezcla,
            pesoTotalBloque,
            pesoTotal: pesoPorMezcla,
            variables: {}
        };

        // Siempre calcular LEN, MIC, STR, ELG + parámetros de reglas activas
        const coreParams = ['LEN', 'MIC', 'STR', 'ELG'];
        const paramsToCompute = [...new Set([...coreParams, ...activeRules.map(r => r.parametro)])];

        paramsToCompute.forEach(ruleParam => {
            const vKey = ruleParam === 'LEN' ? 'UHML' : (ruleParam === '+b' ? 'PLUS_B' : ruleParam);
            const rule = activeRules.find(r => r.parametro === ruleParam);

            const sumPonderada = fardos.reduce((s, f) => s + ((Number(f[vKey]) || 0) * pesoUnitario(f)), 0);
            const prom = pesoPorMezcla > 0 ? sumPonderada / pesoPorMezcla : 0;

            stats[bId].variables[ruleParam] = { promedioGeneral: prom };

            if (rule) {
                const fardosA = fardos.filter(f => {
                    const reasons = Array.isArray(f._toleranceReasons) ? f._toleranceReasons : [];
                    return f._category === 'A' || !reasons.includes(ruleParam);
                });
                const fardosB = fardos.filter(f => {
                    const reasons = Array.isArray(f._toleranceReasons) ? f._toleranceReasons : [];
                    return f._category === 'B' && reasons.includes(ruleParam);
                });

                const sumPesoA = fardosA.reduce((s, f) => s + pesoUnitario(f), 0);
                const sumPesoB = fardosB.reduce((s, f) => s + pesoUnitario(f), 0);

                const sumA = fardosA.reduce((s, f) => s + ((Number(f[vKey]) || 0) * pesoUnitario(f)), 0);
                const sumB = fardosB.reduce((s, f) => s + ((Number(f[vKey]) || 0) * pesoUnitario(f)), 0);

                stats[bId].variables[ruleParam].promedioIdeal      = sumPesoA > 0 ? sumA / sumPesoA : 0;
                stats[bId].variables[ruleParam].promedioTolerancia = sumPesoB > 0 ? sumB / sumPesoB : 0;
                stats[bId].variables[ruleParam].pctIdeal           = totalFardos > 0 ? (fardosA.length / totalFardos) * 100 : 0;
                stats[bId].variables[ruleParam].pctTolerancia      = totalFardos > 0 ? (fardosB.length / totalFardos) * 100 : 0;
            }
        });
    });

    return stats;
}

function generateResult(stock, groupedBlends, rules, supervisionSettings) {
    const plan = buildFullStockPlanRows(stock, groupedBlends);
    const cols = groupedBlends.map(g => g.id);
    const estadisticas = calcularEstadisticas(groupedBlends, rules, supervisionSettings);
    return { success: true, plan, columnasMezcla: cols, estadisticas };
}

function buildFullStockPlanRows(stock, groupedBlends = []) {
    return stock.map(l => {
        const row = { PRODUTOR: l.PRODUTOR, LOTE: l.LOTE, Stock: l.QTDE_ESTOQUE, Categoria: l._category, MotivoC: l._rejectReason, Usados: l._usedCount, Sobrante: l._availableCount, mezclas: {} };
        ['UHML', 'STR', 'MIC', 'PLUS_B', 'CG', 'TRASH'].forEach(k => row[k] = l[k]);
        groupedBlends.forEach(g => {
            const count = g.fardos.filter(f => f.LOTE === l.LOTE && f.PRODUTOR === l.PRODUTOR).length;
            if (count > 0) row.mezclas[g.id] = count;
        });
        return row;
    });
}

function generateEmptyResult(stock, message, diagnostics = null) {
    return { success: true, plan: buildFullStockPlanRows(stock), columnasMezcla: [], estadisticas: {}, mensaje: message, diagnostico: diagnostics };
}
