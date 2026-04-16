import pool from '../db/pg.js';

/**
 * Repository to handle Stock data access.
 */
export class StockRepository {
    /**
     * Fetches all available stock for cotton bales.
     * In this PoC, it queries PostgreSQL verbatim so the original frontend can parse its native structure.
     */
    static async getAllAvailable() {
        // Query real database exactly as the original project did
        const queryText = `SELECT * FROM tb_est_mp ORDER BY id DESC LIMIT 5000`;
        
        try {
            const { rows } = await pool.query(queryText);
            return rows;
        } catch (error) {
            console.error('Error fetching stock from PostgreSQL. Details:', error.message, error.stack);
            throw new Error(`Database Error: Could not fetch stock. Details: ${error.message}`);
        }
    }
}
