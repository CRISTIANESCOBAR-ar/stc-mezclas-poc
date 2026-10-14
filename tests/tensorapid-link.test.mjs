import test from 'node:test';
import assert from 'node:assert/strict';
import { updateTensorapidLink } from '../backend/src/services/tensorapidLink.js';
import { minimumRole } from '../backend/src/security/access.js';
function database(version='42',husos=[101,102]){
  const calls=[];
  return {calls,pool:{connect:async()=>({release(){},async query(sql,args){
    calls.push({sql,args});
    if(sql.startsWith('SELECT xmin')) return {rows:[{version}]};
    if(sql.startsWith('SELECT testnr')) return {rows:[{testnr:'00260'}]};
    if(sql.startsWith('SELECT huso_number')) return {rows:[{huso_number:101},{huso_number:102}]};
    if(sql.startsWith('SELECT no_')) return {rows:husos.map(no_=>({no_}))};
    if(sql.startsWith('UPDATE tb_tensorapid_par')) return {rows:[{version:'43'}]};
    return {rows:[]};
  }})}};
}
test('correcting the Uster link updates only the association and queues backup',async()=>{
  const {pool,calls}=database();
  assert.equal((await updateTensorapidLink(pool,'100001',{version:'42',usterTestnr:'00260'})).version,'43');
  assert.deepEqual(calls.find(call=>call.sql.startsWith('UPDATE tb_tensorapid_par')).args,['100001','00260']);
  assert.ok(!calls.some(call=>/DELETE|INSERT INTO tb_tensorapid|UPDATE tb_tensorapid_tbl/.test(call.sql)));
  assert.equal(calls.at(-1).sql,'COMMIT');
  assert.equal(minimumRole('PATCH','/tensorapid/tests/100001/link'),'operador');
});
test('conflicting versions and mismatched spindles cannot replace the link',async()=>{
  for(const setup of [database('99'),database('42',[101,999])]){
    await assert.rejects(updateTensorapidLink(setup.pool,'100001',{version:'42',usterTestnr:'00260'}),error=>error.statusCode===409);
    assert.ok(!setup.calls.some(call=>call.sql.startsWith('UPDATE')));
    assert.equal(setup.calls.at(-1).sql,'ROLLBACK');
  }
});
