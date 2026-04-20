/**
 * optimizer.js — stc-mezclas-poc
 * Full port from stc-produccion-v2/backend/services/blendomat-optimizer.js
 * Includes quality optimization (hill climbing), remanentes, and complete plan rows.
 */

// =================================================================================================
// ENTRY POINT
// =================================================================================================

export function optimizeBlend(stock, rules, supervisionSettings, blendSize, algorithm = 'standard') {
    if (!blendSize || blendSize <= 0) {
        throw new Error('El tamaño de la mezcla (fardos) debe ser mayor a 0.');
    }
    if (!stock || stock.length === 0) {
        throw new Error('No hay stock disponible para procesar.');
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
    if (specificReason) details.push(specificReason);
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

// =================================================================================================
// CLASIFICACIÓN DE STOCK
// =================================================================================================

function classifyStock(stock, rules, supervisionSettings) {
    const activeRules = rules.filter(r => {
        const uiKey = r.parametro === 'LEN' ? 'UHML' : (r.parametro === '+b' ? 'PLUS_B' : r.parametro);
        const s = supervisionSettings[uiKey];
        return s && (s.target || s.hardCap || s.tolerance);
    });

    return stock.map(bale => {
        let isRejected = false;
        let rejectReason = '';
        let isTolerance = false;
        const toleranceReasons = [];

        for (const rule of activeRules) {
            const uiKey = rule.parametro === 'LEN' ? 'UHML' : (rule.parametro === '+b' ? 'PLUS_B' : rule.parametro);
            const settings = supervisionSettings[uiKey];
            if (!settings) continue;

            const val = Number(bale[uiKey]);
            if (isNaN(val)) continue;

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
            _availableCount: Number(bale.QTDE_ESTOQUE) || 0
        };
    });
}

// =================================================================================================
// ALGORITMO 2: ESTABILIDAD (GOLDEN BATCH)
// =================================================================================================

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
            smallLots.sort((a, b) => b.lot._availableCount - a.lot._availableCount);
            let currentSmallLotIdx = 0;
            while (needed > 0 && currentSmallLotIdx < smallLots.length) {
                const slotFardos = [];
                let fardosInSlot = 0;
                while (fardosInSlot < horizon && currentSmallLotIdx < smallLots.length) {
                    const sLot = smallLots[currentSmallLotIdx];
                    const take = Math.min(sLot.lot._availableCount, horizon - fardosInSlot);
                    for (let i = 0; i < take; i++) slotFardos.push({ ...sLot.lot });
                    fardosInSlot += take;
                    if (sLot.lot._availableCount <= take) currentSmallLotIdx++;
                    else sLot.lot._availableCount -= take;
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

    // Aplica cupo de tolerancia redirigiendo slots B→A
    const capToleranceInRecipe = (candidates) => {
        const caps = candidates.map(c => ({ ...c }));
        for (const rule of activeRules) {
            const uiKey = rule.parametro === 'LEN' ? 'UHML' : (rule.parametro === '+b' ? 'PLUS_B' : rule.parametro);
            const settings = supervisionSettings[uiKey];
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
            if (!rawRecipe) { blockDuration--; continue; }

            if (enforceToleranceCap) {
                const capped = capToleranceInRecipe(rawRecipe.rows);
                if (!capped) { blockDuration--; continue; }
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

            const validationFailure = getRecipeValidationFailure(
                recipeFardos, activeRules, supervisionSettings, blendSize, !enforceToleranceCap
            );
            if (!validationFailure) break;
            stopReason = validationFailure;
            blockDuration--;
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
                    const originalLot = classifiedStock.find(l => l.LOTE === f.LOTE && l.PRODUTOR === f.PRODUTOR);
                    if (originalLot && i < blockDuration) originalLot._usedCount += 1;
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

function validateRecipeAgainstRules(recipeFardos, activeRules, supervisionSettings, blendSize, hardCapOnly = false) {
    return getRecipeValidationFailure(recipeFardos, activeRules, supervisionSettings, blendSize, hardCapOnly) === null;
}

function getRecipeValidationFailure(recipeFardos, activeRules, supervisionSettings, blendSize, hardCapOnly = false) {
    for (const rule of activeRules) {
        const uiKey = rule.parametro === 'LEN' ? 'UHML' : (rule.parametro === '+b' ? 'PLUS_B' : rule.parametro);
        const settings = supervisionSettings[uiKey];
        if (!settings) continue;

        const values = recipeFardos.map(f => Number(f[uiKey])).filter(v => !Number.isNaN(v));
        if (values.length === 0) continue;

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

        if (!hardCapOnly && settings.tolerance) {
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

function optimizeRecipeQuality(candidates, activeRules, supervisionSettings) {
    const paramAvg = (cands, uiKey) => {
        let sum = 0, count = 0;
        cands.forEach(c => {
            if (c.assigned <= 0) return;
            const v = Number(c.lot[uiKey]);
            if (!Number.isNaN(v)) { sum += v * c.assigned; count += c.assigned; }
        });
        return count > 0 ? sum / count : 0;
    };

    let improved = true;
    let maxIter = candidates.length * 5;

    while (improved && maxIter-- > 0) {
        improved = false;

        for (const rule of activeRules) {
            const uiKey = rule.parametro === 'LEN' ? 'UHML' : (rule.parametro === '+b' ? 'PLUS_B' : rule.parametro);
            const settings = supervisionSettings ? supervisionSettings[uiKey] : null;
            if (!settings || !settings.target) continue;

            const targetMin = toOptionalNumber(rule.valor_ideal_min);
            const targetMax = toOptionalNumber(rule.promedio_objetivo_max);

            const avg         = paramAvg(candidates, uiKey);
            const belowTarget = targetMin !== null && avg < targetMin;
            const aboveTarget = targetMax !== null && avg > targetMax;

            if (!belowTarget && !aboveTarget) continue;

            let worstIdx = -1;
            let worstVal = belowTarget ? Infinity : -Infinity;
            candidates.forEach((c, idx) => {
                if (c.assigned <= 0) return;
                const v = Number(c.lot[uiKey]);
                if (Number.isNaN(v)) return;
                if (belowTarget && v < worstVal) { worstVal = v; worstIdx = idx; }
                if (aboveTarget && v > worstVal) { worstVal = v; worstIdx = idx; }
            });
            if (worstIdx === -1) continue;

            let bestIdx = -1;
            let bestVal = belowTarget ? -Infinity : Infinity;
            candidates.forEach((c, idx) => {
                if (idx === worstIdx) return;
                if (c.assigned >= c.capacity) return;
                const v = Number(c.lot[uiKey]);
                if (Number.isNaN(v)) return;
                if (belowTarget && v > worstVal && v > bestVal) { bestVal = v; bestIdx = idx; }
                if (aboveTarget && v < worstVal && v < bestVal) { bestVal = v; bestIdx = idx; }
            });
            if (bestIdx === -1) continue;

            candidates[worstIdx].assigned -= 1;
            candidates[bestIdx].assigned  += 1;
            improved = true;
            break;
        }
    }

    return candidates.filter(c => c.assigned > 0);
}

// =================================================================================================
// FIRMA Y AGRUPACIÓN DE MEZCLAS
// =================================================================================================

function getBlendSignature(blendFardos) {
    const counts = {};
    blendFardos.forEach(f => {
        const key = `${f.PRODUTOR}_${f.LOTE}`;
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

function optimizeBlendStandard(stock, rules, supervisionSettings, blendSize) {
    const classifiedStock = classifyStock(stock, rules, supervisionSettings);
    const blends = [];
    let blendIndex = 1;

    const activeRules = rules.filter(r => {
        const uiKey = r.parametro === 'LEN' ? 'UHML' : (r.parametro === '+b' ? 'PLUS_B' : r.parametro);
        const s = supervisionSettings[uiKey];
        return s && (s.target || s.hardCap || s.tolerance);
    });

    const calculateRecipeAverage = (recipe, paramKey) => {
        let total = 0, count = 0;
        recipe.forEach(b => {
            const val = Number(b[paramKey]);
            if (!isNaN(val)) { total += val; count++; }
        });
        return count > 0 ? total / count : 0;
    };

    const canAddToleranceBaleToRecipe = (bale, currentRecipe) => {
        if (bale._category === 'A') return true;
        for (const param of bale._toleranceReasons) {
            const rule = activeRules.find(r => r.parametro === param);
            if (!rule) continue;
            const minIdealPct      = Number(rule.porcentaje_min_ideal) || 100;
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

        // Fase 2: optimización de promedios hacia targets (hill climbing)
        if (recipe.length === blendSize) {
            let improvementMade = true;
            let iterations = 0;
            const maxIterations = blendSize * 2;

            while (improvementMade && iterations < maxIterations) {
                improvementMade = false;
                iterations++;

                for (const rule of activeRules) {
                    const uiKey    = rule.parametro === 'LEN' ? 'UHML' : (rule.parametro === '+b' ? 'PLUS_B' : rule.parametro);
                    const targetMin = Number(rule.valor_ideal_min);
                    const targetMax = Number(rule.promedio_objetivo_max);
                    const currentAvg = calculateRecipeAverage(recipe, uiKey);

                    const failMin = !isNaN(targetMin) && currentAvg < targetMin;
                    const failMax = !isNaN(targetMax) && currentAvg > targetMax;

                    if (!failMin && !failMax) continue;

                    let worstBaleIndex = -1;
                    let worstValue     = failMin ? Infinity : -Infinity;
                    recipe.forEach((b, idx) => {
                        const val = Number(b[uiKey]);
                        if (failMin && val < worstValue) { worstValue = val; worstBaleIndex = idx; }
                        else if (failMax && val > worstValue) { worstValue = val; worstBaleIndex = idx; }
                    });
                    if (worstBaleIndex === -1) continue;

                    const candidates = availableLots.filter(l => {
                        const used = tempCounts.get(l) || 0;
                        if (used >= l._availableCount) return false;
                        const val = Number(l[uiKey]);
                        if (failMin && val <= worstValue) return false;
                        if (failMax && val >= worstValue) return false;
                        return true;
                    });

                    candidates.sort((a, b) => {
                        const valA = Number(a[uiKey]);
                        const valB = Number(b[uiKey]);
                        return failMin ? valB - valA : valA - valB;
                    });

                    for (const candidate of candidates) {
                        const tempRecipe = [...recipe];
                        tempRecipe.splice(worstBaleIndex, 1);

                        if (candidate._category === 'A' || canAddToleranceBaleToRecipe(candidate, tempRecipe)) {
                            const oldBale = recipe[worstBaleIndex];
                            tempCounts.set(oldBale, tempCounts.get(oldBale) - 1);
                            tempCounts.set(candidate, (tempCounts.get(candidate) || 0) + 1);
                            recipe[worstBaleIndex] = { ...candidate };
                            improvementMade = true;
                            break;
                        }
                    }
                    if (improvementMade) break;
                }
            }
        }

        return recipe.length === blendSize ? recipe : null;
    };

    let availableLots = classifiedStock.filter(b => b._availableCount > 0);
    let currentRecipe = buildRecipe(availableLots);

    while (currentRecipe) {
        const recipeCounts = new Map();
        currentRecipe.forEach(f => {
            const origLot = classifiedStock.find(l => l.LOTE === f.LOTE && l.PRODUTOR === f.PRODUTOR);
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

        availableLots = classifiedStock.filter(b => b._availableCount > 0);
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
        LEN: lot.UHML || lot.LEN,
        UHML: lot.UHML,
        PLUS_B: lot.PLUS_B,
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
                LEN:      b.UHML || b.LEN,
                Fardos:   b._category === 'C' ? Number(b.QTDE_ESTOQUE) : b._availableCount,
                Peso:     (Number(b.PESO) / (Number(b.QTDE_ESTOQUE) || 1)) *
                          (b._category === 'C' ? Number(b.QTDE_ESTOQUE) : b._availableCount),
                Motivo:   motivo
            });
        }
    });

    // Plan
    const planArray = buildFullStockPlanRows(classifiedStock);
    const planRowsMap = new Map();
    planArray.forEach(row => planRowsMap.set(`${row.PRODUTOR}_${row.LOTE}`, row));

    groupedBlends.forEach(blend => {
        const blendId    = blend.id;
        const loteCounts = {};
        blend.fardos.forEach(f => {
            const key = `${f.PRODUTOR}_${f.LOTE}`;
            if (!loteCounts[key]) loteCounts[key] = { count: 0, ref: f };
            loteCounts[key].count++;
        });
        Object.values(loteCounts).forEach(({ count, ref }) => {
            const row = planRowsMap.get(`${ref.PRODUTOR}_${ref.LOTE}`);
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

        const pesoUnitario = (f) => {
            const p = Number(f.PESO);
            const q = Number(f.QTDE_ESTOQUE) || 1;
            return p > 0 ? p / q : 1;
        };

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

            const sumPonderada = fardos.reduce(
                (s, f) => s + ((Number(f[vKey]) || 0) * pesoUnitario(f)), 0
            );
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
                const sumA     = fardosA.reduce((s, f) => s + ((Number(f[vKey]) || 0) * pesoUnitario(f)), 0);
                const sumB     = fardosB.reduce((s, f) => s + ((Number(f[vKey]) || 0) * pesoUnitario(f)), 0);

                stats[bId].variables[ruleParam].promedioIdeal      = sumPesoA > 0 ? sumA / sumPesoA : 0;
                stats[bId].variables[ruleParam].promedioTolerancia = sumPesoB > 0 ? sumB / sumPesoB : 0;
                stats[bId].variables[ruleParam].pctIdeal           = totalFardos > 0 ? (fardosA.length / totalFardos) * 100 : 0;
                stats[bId].variables[ruleParam].pctTolerancia      = totalFardos > 0 ? (fardosB.length / totalFardos) * 100 : 0;
            }
        });
    });

    return stats;
}