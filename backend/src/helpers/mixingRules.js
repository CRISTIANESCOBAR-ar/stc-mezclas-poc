import { requiredNumber } from '../../../shared/numbers.js';

const FIELDS = ['limite_min_absoluto', 'limite_max_absoluto', 'rango_tol_min', 'rango_tol_max', 'porcentaje_min_ideal', 'valor_ideal_min', 'promedio_objetivo_max'];
export function normalizeMixingRules(rules) {
  if (!Array.isArray(rules)) throw Object.assign(new Error('Las reglas deben ser un arreglo.'), { statusCode: 400 });
  const seen = new Set();
  return rules.map(rule => {
    if (!rule || typeof rule.parametro !== 'string' || !rule.parametro.trim()) throw Object.assign(new Error('Parámetro de regla inválido.'), { statusCode: 400 });
    const normalized = { ...rule, parametro: rule.parametro.trim() };
    if (seen.has(normalized.parametro)) throw Object.assign(new Error(`Regla duplicada: ${normalized.parametro}`), { statusCode: 400 });
    seen.add(normalized.parametro);
    for (const field of FIELDS) normalized[field] = requiredNumber(rule[field], `${rule.parametro}.${field}`, {
      optional: true, ...(field === 'porcentaje_min_ideal' ? { min: 0, max: 100 } : {})
    });
    for (const [min, max] of [['limite_min_absoluto', 'limite_max_absoluto'], ['rango_tol_min', 'rango_tol_max'], ['valor_ideal_min', 'promedio_objetivo_max']]) {
      if (normalized[min] !== null && normalized[max] !== null && normalized[min] > normalized[max]) throw Object.assign(new Error(`${rule.parametro}: mínimo mayor que máximo.`), { statusCode: 400 });
    }
    return normalized;
  });
}
