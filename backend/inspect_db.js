const { Client } = require('pg');
const client = new Client({
    host: '127.0.0.1',
    port: 5433,
    database: 'stc_produccion',
    user: 'stc_user',
    password: 'stc_password_2026'
});
async function run() {
    try {
        await client.connect();
        const resCols = await client.query(\"SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_produccion_oe' ORDER BY ordinal_position;\");
        console.log('COLUMNS_START');
        resCols.rows.forEach(r => console.log(r.column_name));
        console.log('COLUMNS_END');
        const resRow = await client.query('SELECT * FROM public.tb_produccion_oe LIMIT 1');
        console.log('SAMPLE_START');
        console.log(JSON.stringify(resRow.rows[0]));
        console.log('SAMPLE_END');
    } catch (e) {
        console.error('ERROR_START');
        console.error(e.message);
        console.error('ERROR_END');
    } finally {
        await client.end();
    }
}
run();
