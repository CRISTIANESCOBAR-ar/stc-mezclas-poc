import { optionalNumber, baleWeight, weightedAverage } from './numbers.js';

// Changing total stock to available stock must scale mass by the same ratio.
export function withStockQuantity(lot, quantity) {
  const weight = baleWeight(lot);
  return { ...lot, QTDE_ESTOQUE: quantity, PESO: weight === null ? null : weight * quantity, PESO_MEDIO: weight };
}

export function aggregateStock(lots, fields) {
  const count = lots.reduce((sum, lot) => sum + (optionalNumber(lot.QTDE_ESTOQUE) ?? 0), 0);
  const mass = lots.every(lot => lot.QTDE_ESTOQUE <= 0 || baleWeight(lot) !== null)
    ? lots.reduce((sum, lot) => sum + (baleWeight(lot) ?? 0) * Math.max(0, lot.QTDE_ESTOQUE), 0)
    : null;
  const result = { QTDE_ESTOQUE: count, PESO: mass, PESO_MEDIO: mass !== null && count > 0 ? mass / count : null };
  for (const field of fields) {
    if (field === 'PESO_MEDIO') continue;
    result[field] = weightedAverage(lots, lot => lot[field], lot => (baleWeight(lot) ?? 0) * Math.max(0, lot.QTDE_ESTOQUE));
  }
  return result;
}

// A display group must never hide a rejected constituent from the optimizer.
export function expandStockGroups(rows) {
  return rows.flatMap(row => Array.isArray(row._sourceLots) ? expandStockGroups(row._sourceLots) : [row]);
}
