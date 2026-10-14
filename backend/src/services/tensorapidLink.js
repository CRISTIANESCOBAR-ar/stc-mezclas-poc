import { withTransaction } from '../db/transaction.js';
import { recordBackupRequest } from './backupRequests.js';
const fail=(message,statusCode)=>{throw Object.assign(new Error(message),{statusCode})};
export async function updateTensorapidLink(pool,testnr,body) {
  if (!/^\d+$/.test(String(body?.version || '')) || !/^\d{5}$/.test(String(body?.usterTestnr || ''))) fail('Versión y número Uster de cinco dígitos requeridos.',400);
  return withTransaction(pool,async client=>{
    const found=await client.query('SELECT xmin::text AS version FROM tb_tensorapid_par WHERE testnr=$1 FOR UPDATE',[testnr]);
    if(!found.rows.length) fail('El ensayo ya no existe.',404);
    if(found.rows[0].version!==String(body.version)) fail('El ensayo cambió. Recarga antes de guardar.',409);
    const target=await client.query('SELECT testnr FROM tb_uster_par WHERE testnr=$1 FOR SHARE',[body.usterTestnr]);
    if(!target.rows.length) fail('El ensayo Uster indicado no existe.',400);
    const tenso=await client.query('SELECT huso_number FROM tb_tensorapid_tbl WHERE testnr=$1',[testnr]);
    const uster=await client.query('SELECT no_ FROM tb_uster_tbl WHERE testnr=$1',[body.usterTestnr]);
    const a=new Set(tenso.rows.map(row=>Number(row.huso_number))), b=new Set(uster.rows.map(row=>Number(row.no_)));
    if(!a.size || a.size!==b.size || [...a].some(huso=>!b.has(huso))) fail('Los husos guardados no coinciden con el ensayo Uster indicado.',409);
    const updated=await client.query('UPDATE tb_tensorapid_par SET uster_testnr=$2 WHERE testnr=$1 RETURNING xmin::text AS version',[testnr,body.usterTestnr]);
    await recordBackupRequest(client,'tensorapid-link');
    return {success:true,version:updated.rows[0].version};
  });
}
