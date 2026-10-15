import { optionalNumber } from '../../../shared/numbers.js';
import { normalizeYarnLot } from '../../../shared/yarnLot.js';
const text=value=>String(value ?? '').trim().toUpperCase();
const machine=value=>/^\d+$/.test(text(value)) ? String(Number(text(value))) : text(value);
export function compareEnsayos(tenso,uster,tensoHusos,usterHusos){
  const row=(label,a,b,normalize=text)=>{
    const left=normalize(a),right=normalize(b);
    const missing=left===null || right===null || left==='' || right==='';
    return {label,tenso:a ?? '',uster:b ?? '',status:missing?'Sin dato':left===right?'Coincide':'Difiere'};
  };
  const valid=value=>Number.isInteger(value) && value>0;
  const a=[...new Set(tensoHusos.map(Number).filter(valid))].sort((a,b)=>a-b);
  const b=[...new Set(usterHusos.map(Number).filter(valid))].sort((a,b)=>a-b);
  return [row('Título (Ne)',tenso.NOMCOUNT === '' || tenso.NOMCOUNT == null ? tenso.NE_TITULO : tenso.NOMCOUNT,uster.NOMCOUNT,optionalNumber),
    row('Lote',tenso.LOTE,uster.LOTE,value=>text(normalizeYarnLot(value))),row('Máquina',tenso.MASCHNR,uster.MASCHNR,machine),
    row('Husos',a.join(', '),b.join(', '))];
}
