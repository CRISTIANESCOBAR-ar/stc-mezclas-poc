import fs from 'fs';

const path = 'c:/stc-mezclas-poc/backend/src/routes/dashboardRoutes.js';
let content = fs.readFileSync(path, 'utf8');

const queryToReplace = `    const resumenDia = await pool.query(\`
      SELECT
        DATE(created_at) AS dia,
        COUNT(*)         AS llamadas,
        SUM(tokens_entrada) AS total_tokens_entrada,
        SUM(tokens_salida)  AS total_tokens_salida,
        SUM(tokens_total)   AS total_tokens,
        SUM(costo_usd)      AS costo_usd
      FROM tb_narrativa_log
      GROUP BY DATE(created_at)
      ORDER BY dia DESC
      LIMIT 90
    \`);`;

const queryNew = `    const resumenDia = await pool.query(\`
      SELECT
        DATE(created_at) AS dia,
        origen,
        COUNT(*)         AS llamadas,
        SUM(tokens_entrada) AS total_tokens_entrada,
        SUM(tokens_salida)  AS total_tokens_salida,
        SUM(tokens_total)   AS total_tokens,
        SUM(costo_usd)      AS costo_usd
      FROM tb_narrativa_log
      GROUP BY DATE(created_at), origen
      ORDER BY dia DESC
      LIMIT 90
    \`);

    const resumenOrigen = await pool.query(\`
      SELECT
        origen,
        COUNT(*)         AS llamadas,
        SUM(tokens_entrada) AS total_tokens_entrada,
        SUM(tokens_salida)  AS total_tokens_salida,
        SUM(tokens_total)   AS total_tokens,
        SUM(costo_usd)      AS costo_usd
      FROM tb_narrativa_log
      GROUP BY origen
      ORDER BY costo_usd DESC
    \`);`;

content = content.replace(queryToReplace, queryNew);

const detailQueryOld = `    const detalle = await pool.query(\`
      SELECT id, lotes, fecha_corte, formato, idioma, modelo,
             tokens_entrada, tokens_salida, tokens_total, costo_usd, fuente, desde_cache, created_at
      FROM tb_narrativa_log
      ORDER BY created_at DESC
      LIMIT 200
    \`);`;

const detailQueryNew = `    const detalle = await pool.query(\`
      SELECT id, lotes, fecha_corte, formato, idioma, modelo, origen,
             tokens_entrada, tokens_salida, tokens_total, costo_usd, fuente, desde_cache, created_at
      FROM tb_narrativa_log
      ORDER BY created_at DESC
      LIMIT 200
    \`);`;

content = content.replace(detailQueryOld, detailQueryNew);

const returnOld = `    res.json({
      totales: totales.rows[0],
      resumenPorDia: resumenDia.rows,
      resumenPorModelo: resumenModelo.rows,
      detalle: detalle.rows,
    });`;

const returnNew = `    res.json({
      totales: totales.rows[0],
      resumenPorDia: resumenDia.rows,
      resumenPorModelo: resumenModelo.rows,
      resumenPorOrigen: resumenOrigen.rows,
      detalle: detalle.rows,
    });`;

content = content.replace(returnOld, returnNew);

fs.writeFileSync(path, content, 'utf8');
console.log("Updated mezclas backend successfully!");
