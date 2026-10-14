// A single separator is decimal; thousands separators require an explicit
// grouping format (1.234,56 / 1,234.56 / 1.234.567). Never parse numeric prefixes.
export function optionalNumber(value) {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  let text = value.trim();
  if (!text || text === '-') return null;
  if (/^[+-]?\d{1,3}(\.\d{3})+,\d+$/.test(text)) {
    text = text.replaceAll('.', '').replace(',', '.');
  } else if (/^[+-]?\d{1,3}(,\d{3})+\.\d+$/.test(text)) {
    text = text.replaceAll(',', '');
  } else if (/^[+-]?\d{1,3}(\.\d{3}){2,}$/.test(text)) {
    text = text.replaceAll('.', '');
  } else if (/^[+-]?\d{1,3}(,\d{3}){2,}$/.test(text)) {
    text = text.replaceAll(',', '');
  } else {
    text = text.replace(',', '.');
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

export function isMissingNumber(value) {
  return value == null || (typeof value === 'string' && ['', '-'].includes(value.trim()));
}

export function requiredNumber(value, label, { optional = false, integer = false, min = -Infinity, max = Infinity } = {}) {
  if (optional && isMissingNumber(value)) return null;
  const number = optionalNumber(value);
  if (number === null || (integer && !Number.isSafeInteger(number)) || number < min || number > max) {
    const error = new Error(`${label}: número ${integer ? 'entero ' : ''}inválido${min !== -Infinity ? ` (mínimo ${min})` : ''}.`);
    error.statusCode = 400;
    throw error;
  }
  return number;
}

export function weightedAverage(rows, valueOf, weightOf) {
  let sum = 0;
  let weight = 0;
  for (const row of rows) {
    const value = optionalNumber(valueOf(row));
    const mass = optionalNumber(weightOf(row));
    if (value === null || mass === null || mass <= 0) continue;
    sum += value * mass;
    weight += mass;
  }
  return weight > 0 ? sum / weight : null;
}

export function baleWeight(lot) {
  const mass = optionalNumber(lot.PESO);
  const quantity = optionalNumber(lot.QTDE_ESTOQUE);
  if (mass > 0 && quantity > 0) return mass / quantity;
  const unit = optionalNumber(lot.PESO_MEDIO);
  return unit > 0 ? unit : null;
}
