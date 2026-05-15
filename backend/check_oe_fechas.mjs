import pool from './src/db/pg.js';

// 1) Últimas fechas en la tabla
const r1 = await pool.query(`
  SELECT DISTINCT data_producao
  FROM tb_produccion_oe
  ORDER BY 1 DESC
  LIMIT 25
`);
console.log('=== Últimas 25 fechas en data_producao ===');
r1.rows.forEach(r => console.log(' ', r.data_producao));

// 2) Total filas
const r2 = await pool.query(`SELECT COUNT(*) AS total FROM tb_produccion_oe`);
console.log('\nTotal filas en tb_produccion_oe:', r2.rows[0].total);

// 3) Buscar fecha 28/05/2026 (texto)
const r3 = await pool.query(`
  SELECT COUNT(*) AS cnt
  FROM tb_produccion_oe
  WHERE data_producao LIKE '%28/05/2026%'
     OR data_producao LIKE '%2026-05-28%'
`);
console.log('Filas con fecha exacta 28/05/2026:', r3.rows[0].cnt);

// 4) Rango de fechas parseadas
const r4 = await pool.query(`
  SELECT
    MIN(CASE
      WHEN split_part(btrim(data_producao), ' ', 1) ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$'
      THEN to_date(split_part(btrim(data_producao), ' ', 1), 'FMDD/FMMM/YYYY')
      WHEN data_producao ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
      THEN substring(data_producao from 1 for 10)::date
    END) AS fecha_min,
    MAX(CASE
      WHEN split_part(btrim(data_producao), ' ', 1) ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$'
      THEN to_date(split_part(btrim(data_producao), ' ', 1), 'FMDD/FMMM/YYYY')
      WHEN data_producao ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
      THEN substring(data_producao from 1 for 10)::date
    END) AS fecha_max
  FROM tb_produccion_oe
`);
console.log('\nRango de fechas parseadas:');
console.log('  Min:', r4.rows[0].fecha_min);
console.log('  Max:', r4.rows[0].fecha_max);

process.exit(0);
