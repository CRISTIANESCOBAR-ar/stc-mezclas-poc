import { requiredNumber } from '../../../shared/numbers.js';
import { withTransaction } from '../db/transaction.js';
import { recordBackupRequest } from './backupRequests.js';

const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
export function validateManual(body) {
  if (!body || !/^\d+$/.test(String(body.version || ''))) fail('Versión del ensayo requerida.');
  if (!['Si', 'No', '', null].includes(body.pasador)) fail('Pasador inválido.');
  if (!['Hilo', 'Hilo de fantasia'].includes(body.matclass)) fail('Tipo de material inválido.');
  if (!Array.isArray(body.titulos) || !body.titulos.length) fail('Títulos requeridos.');
  const titulos = body.titulos.map(row => ({
    huso: requiredNumber(row.huso, 'Huso', { integer: true, min: 1 }),
    titulo: requiredNumber(row.titulo, 'Título', { optional: true, min: 0.01, max: 99.99 }),
  }));
  if (new Set(titulos.map(row => row.huso)).size !== titulos.length) fail('Husos duplicados.');
  return { version: String(body.version), estiraje: requiredNumber(body.estiraje, 'Estiraje', { optional: true, min: 0 }),
    pasador: body.pasador || null, matclass: body.matclass, titulos };
}

export async function updateManual(pool, testnr, input) {
  const data = validateManual(input);
  return withTransaction(pool, async client => {
    const header = await client.query('SELECT xmin::text AS version FROM tb_uster_par WHERE testnr=$1 FOR UPDATE', [testnr]);
    if (!header.rows.length) fail('El ensayo ya no existe.', 404);
    if (header.rows[0].version !== data.version) fail('Otro guardado modificó este ensayo. Recarga antes de editarlo.', 409);
    const details = await client.query('SELECT no_ FROM tb_uster_tbl WHERE testnr=$1 ORDER BY seqno FOR UPDATE', [testnr]);
    if (details.rows.length !== data.titulos.length || details.rows.some((row, i) => Number(row.no_) !== data.titulos[i].huso)) fail('Los husos no coinciden con el ensayo guardado.', 409);
    const result = await client.query(`UPDATE tb_uster_par SET estiraje=$2, pasador=$3, matclass=$4, updated_at=NOW()
      WHERE testnr=$1 RETURNING xmin::text AS version`, [testnr, data.estiraje, data.pasador, data.matclass]);
    for (const row of data.titulos) await client.query('UPDATE tb_uster_tbl SET titulo=$3 WHERE testnr=$1 AND no_=$2', [testnr, row.huso, row.titulo]);
    await recordBackupRequest(client, 'uster-manual');
    return { success: true, version: result.rows[0].version, tblRows: data.titulos.length };
  });
}
