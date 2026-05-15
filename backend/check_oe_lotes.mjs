import pool from './src/db/pg.js';

const loteNums = [113, 114, 115, 116];
const result = await pool.query(`
  SELECT
    TRIM("LOTE PRODUC")::bigint AS lote,
    TRIM("TÍTULO") AS titulo,
    COUNT(*) AS filas,
    ROUND(AVG(CASE WHEN "EFIC CALCULADA" ~ '^[0-9]' THEN REPLACE("EFIC CALCULADA", ',', '.')::numeric END)::numeric, 1) AS efic_calc,
    ROUND(AVG(CASE WHEN "EFIC INFORMADA" ~ '^[0-9]' THEN REPLACE("EFIC INFORMADA", ',', '.')::numeric END)::numeric, 1) AS efic_inf,
    SUM(CASE WHEN n  ~ '^[0-9]' THEN REPLACE(n,  ',', '.')::numeric ELSE 0 END) AS n_total,
    SUM(CASE WHEN s  ~ '^[0-9]' THEN REPLACE(s,  ',', '.')::numeric ELSE 0 END) AS s_total,
    SUM(CASE WHEN l  ~ '^[0-9]' THEN REPLACE(l,  ',', '.')::numeric ELSE 0 END) AS l_total,
    SUM(CASE WHEN t  ~ '^[0-9]' THEN REPLACE(t,  ',', '.')::numeric ELSE 0 END) AS t_total,
    SUM(CASE WHEN mo ~ '^[0-9]' THEN REPLACE(mo, ',', '.')::numeric ELSE 0 END) AS mo_total,
    SUM(CASE WHEN "JP (P+)" ~ '^[0-9]' THEN REPLACE("JP (P+)", ',', '.')::numeric ELSE 0 END) AS jp_total,
    SUM(CASE WHEN "JM (P-)" ~ '^[0-9]' THEN REPLACE("JM (P-)", ',', '.')::numeric ELSE 0 END) AS jm_total
  FROM tb_produccion_oe
  WHERE TRIM("LOTE PRODUC") ~ '^[0-9]+$'
    AND TRIM("LOTE PRODUC")::bigint = ANY($1)
  GROUP BY 1, 2
  ORDER BY 1, 2
`, [loteNums]);

console.log('Filas agrupadas:', result.rows.length);
console.table(result.rows);
process.exit(0);
