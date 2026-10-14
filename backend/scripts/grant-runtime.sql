-- Run as database/schema owner AFTER migrations. First create the role:
-- CREATE ROLE stc_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
-- Set its password interactively with psql \password stc_app.
-- The public schema must not grant CREATE through PUBLIC in production.
BEGIN;
DO $$ BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO stc_app', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO stc_app;
GRANT SELECT ON tb_est_mp, tb_config_tolerancias, tb_calidad_fibra,
  tb_produccion_oe, tb_produccion_carda, tb_residuos_por_sector TO stc_app;
GRANT UPDATE ON tb_config_tolerancias TO stc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  tb_uster_par, tb_uster_tbl, tb_tensorapid_par, tb_tensorapid_tbl,
  tb_uster_carda_par, tb_uster_carda_tbl, tb_uster_carda_titulo_tbl,
  tb_hvi_ensayos, tb_hvi_detalles, tb_hvi_crudo_archivos, tb_hvi_crudo_datos,
  tb_narrativa_cache, tb_narrativa_log,
  stc_users, stc_sessions, stc_rate_limits, stc_backup_state TO stc_app;
GRANT SELECT, INSERT ON stc_audit_log TO stc_app;
GRANT SELECT ON stc_schema_migrations TO stc_app;
-- Only sequences attached to tables the application can insert into.
DO $$ DECLARE item RECORD; BEGIN
  FOR item IN
    SELECT DISTINCT sequence_ns.nspname AS schema_name, sequence.relname AS sequence_name
    FROM pg_class sequence
    JOIN pg_namespace sequence_ns ON sequence_ns.oid = sequence.relnamespace
    JOIN pg_depend dependency ON dependency.objid = sequence.oid AND dependency.deptype IN ('a', 'i')
    JOIN pg_class parent ON parent.oid = dependency.refobjid
    WHERE sequence.relkind = 'S' AND sequence_ns.nspname = 'public'
      AND dependency.classid = 'pg_class'::regclass AND dependency.refclassid = 'pg_class'::regclass
      AND parent.relname = ANY(ARRAY['tb_uster_par','tb_uster_tbl','tb_tensorapid_par','tb_tensorapid_tbl',
        'tb_uster_carda_par','tb_uster_carda_tbl','tb_uster_carda_titulo_tbl','tb_hvi_ensayos','tb_hvi_detalles',
        'tb_hvi_crudo_archivos','tb_hvi_crudo_datos','tb_narrativa_cache','tb_narrativa_log','stc_users','stc_audit_log'])
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I.%I TO stc_app', item.schema_name, item.sequence_name);
  END LOOP;
END $$;
COMMIT;
