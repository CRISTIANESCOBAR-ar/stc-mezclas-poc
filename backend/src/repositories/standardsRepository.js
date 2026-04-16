import pool from '../db/pg.js';

/**
 * Standard Rule DTO (Contract for Mixing Rules)
 */
export class MixingRuleDTO {
    constructor(data) {
        this.parametro = data.parametro || data.PARAMETRO;
        this.limite_min_absoluto = data.limite_min_absoluto || data.LIMITE_MIN_ABSOLUTO;
        this.limite_max_absoluto = data.limite_max_absoluto || data.LIMITE_MAX_ABSOLUTO;
        this.rango_tol_min = data.rango_tol_min || data.RANGO_TOL_MIN;
        this.rango_tol_max = data.rango_tol_max || data.RANGO_TOL_MAX;
        this.porcentaje_min_ideal = data.porcentaje_min_ideal || data.PORCENTAJE_MIN_IDEAL;
        this.valor_ideal_min = data.valor_ideal_min || data.VALOR_IDEAL_MIN;
        this.promedio_objetivo_max = data.promedio_objetivo_max || data.PROMEDIO_OBJETIVO_MAX;
        this.descricao = data.descricao || data.DESCRICAO || '';
    }
}

/**
 * Repository to handle Mixing Standards and Rules.
 */
export class StandardsRepository {
    /**
     * Fetches current mixing rules from the database.
     */
    static async getActiveRules() {
        const queryText = `
            SELECT
                parametro,
                limite_min_absoluto,
                limite_max_absoluto,
                rango_tol_min,
                rango_tol_max,
                porcentaje_min_ideal,
                valor_ideal_min,
                promedio_objetivo_max,
                'Config version: ' || version_nombre as descricao
            FROM tb_config_tolerancias
            ORDER BY parametro
        `;
        
        try {
            const { rows } = await pool.query(queryText);
            return rows.map(r => new MixingRuleDTO(r));
        } catch (error) {
            console.error('Error fetching rules from PostgreSQL. Details:', error.message);
            throw new Error(`Database Error: Could not fetch standards. Details: ${error.message}`);
        }
    }
}
