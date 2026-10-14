import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

const pool = new Pool(config.pg);
pool.on('error', error => console.error(JSON.stringify({ event: 'db_pool_error', code: error.code || 'UNKNOWN' })));

export const query = (text, params) => pool.query(text, params);
export default pool;
