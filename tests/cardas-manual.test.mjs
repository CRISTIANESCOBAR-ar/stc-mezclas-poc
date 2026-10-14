import test from 'node:test';
import assert from 'node:assert/strict';
import router from '../backend/src/routes/usterCardasRoutes.js';
import pool from '../backend/src/db/pg.js';
import { minimumRole } from '../backend/src/security/access.js';

const handler=router.stack.find(layer=>layer.route?.path==='/tests/:prefix/:testnr/manual').route.stack[0].handle;
test('cardas corrections target the composite identity and preserve equipment measurements', async()=>{
  const calls=[];
  const original=pool.connect;
  pool.connect=async()=>({release(){},async query(sql,args){
    calls.push({sql,args});
    if(sql.startsWith('SELECT testnr')) return {rows:[{testnr:'001',source_prefix:'CB',version:'42'}]};
    if(sql.startsWith('UPDATE tb_uster_carda_par')) return {rows:[{version:'43'}]};
    return {rows:[]};
  }});
  let result, failure;
  try {
    await handler({params:{prefix:'CB',testnr:'001'},body:{version:'42',titulos:[1,2,3].map(REPNO=>({REPNO,TITULO:'1,25'}))}},
      {json(value){result=value;return this},status(){return this}},error=>{failure=error});
    assert.equal(failure,undefined);
    assert.equal(result.version,'43');
    assert.ok(!calls.some(call=>/DELETE FROM tb_uster_carda_tbl|UPDATE tb_uster_carda_tbl/.test(call.sql)));
    const inserts=calls.filter(call=>call.sql.startsWith('INSERT INTO tb_uster_carda_titulo_tbl'));
    assert.equal(inserts.length,3);
    assert.deepEqual(inserts[0].args,['001','CB',1,1.25]);
    assert.equal(calls.at(-1).sql,'COMMIT');
    assert.equal(minimumRole('PATCH','/uster-cardas/tests/CB/001/manual'),'operador');
  } finally {pool.connect=original}
});
