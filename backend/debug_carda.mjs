import { query } from './src/db/pg.js';
const r = await query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'tb_produccion_carda' ORDER BY ordinal_position`, [], 'cols');
console.log('COLUMNAS tb_produccion_carda:', r.rows.map(r => r.column_name).join(' | '));
const r2 = await query(`SELECT count(*) FROM tb_produccion_carda`, [], 'cnt');
console.log('TOTAL FILAS:', r2.rows[0].count);
process.exit(0);
