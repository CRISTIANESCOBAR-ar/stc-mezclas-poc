import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5433,
    database: process.env.PG_DATABASE || 'stc_produccion',
    user: process.env.PG_USER || 'stc_user',
    password: process.env.PG_PASSWORD || 'stc_password_2026'
});

export const query = (text, params) => pool.query(text, params);
export default pool;
