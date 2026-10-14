-- Baseline additive migration: preserves existing tables and data.
CREATE TABLE IF NOT EXISTS tb_uster_par (
      testnr TEXT PRIMARY KEY,
      nomcount TEXT,
      maschnr TEXT,
      lote TEXT,
      laborant TEXT,
      time_stamp TEXT,
      matclass TEXT,
      estiraje TEXT,
      pasador TEXT,
      obs TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS tb_uster_tbl (
      id BIGSERIAL PRIMARY KEY,
      testnr TEXT NOT NULL REFERENCES tb_uster_par(testnr) ON DELETE CASCADE,
      seqno INTEGER,
      no_ TEXT,
      u_percent NUMERIC,
      cvm_percent NUMERIC,
      indice_percent NUMERIC,
      cvm_1m_percent NUMERIC,
      cvm_3m_percent NUMERIC,
      cvm_10m_percent NUMERIC,
      titulo NUMERIC,
      titulo_rel_perc NUMERIC,
      h NUMERIC,
      sh NUMERIC,
      sh_1m NUMERIC,
      sh_3m NUMERIC,
      sh_10m NUMERIC,
      delg_minus30_km NUMERIC,
      delg_minus40_km NUMERIC,
      delg_minus50_km NUMERIC,
      delg_minus60_km NUMERIC,
      grue_35_km NUMERIC,
      grue_50_km NUMERIC,
      grue_70_km NUMERIC,
      grue_100_km NUMERIC,
      neps_140_km NUMERIC,
      neps_200_km NUMERIC,
      neps_280_km NUMERIC,
      neps_400_km NUMERIC
    );

CREATE INDEX IF NOT EXISTS idx_uster_tbl_testnr ON tb_uster_tbl(testnr);

CREATE INDEX IF NOT EXISTS idx_uster_tbl_testnr_seqno ON tb_uster_tbl(testnr, seqno);

DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='tb_uster_par' AND column_name='estiraje'
      ) THEN
        ALTER TABLE tb_uster_par ADD COLUMN estiraje TEXT;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='tb_uster_par' AND column_name='pasador'
      ) THEN
        ALTER TABLE tb_uster_par ADD COLUMN pasador TEXT;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='tb_uster_par' AND column_name='obs'
      ) THEN
        ALTER TABLE tb_uster_par ADD COLUMN obs TEXT;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='tb_uster_par' AND column_name='created_at'
      ) THEN
        ALTER TABLE tb_uster_par ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='tb_uster_par' AND column_name='updated_at'
      ) THEN
        ALTER TABLE tb_uster_par ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
      END IF;
    END $$;

CREATE TABLE IF NOT EXISTS tb_uster_carda_par (
      testnr TEXT NOT NULL,
      source_prefix TEXT NOT NULL,
      catalog TEXT,
      sortiment TEXT,
      style TEXT,
      machine_family TEXT,
      nomcount NUMERIC,
      maschnr TEXT,
      lote TEXT,
      laborant TEXT,
      time_stamp TEXT,
      matclass TEXT,
      obs TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (testnr, source_prefix)
    );

CREATE TABLE IF NOT EXISTS tb_uster_carda_tbl (
      id BIGSERIAL PRIMARY KEY,
      testnr TEXT NOT NULL,
      source_prefix TEXT NOT NULL,
      seqno INTEGER NOT NULL,
      no_ NUMERIC,
      u_percent NUMERIC,
      cvm_percent NUMERIC,
      cvm_1m_percent NUMERIC,
      cvm_3m_percent NUMERIC,
      cvm_10m_percent NUMERIC,
      titulo_machine NUMERIC,
      titulo_rel_perc NUMERIC,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(testnr, source_prefix, seqno),
      FOREIGN KEY (testnr, source_prefix)
        REFERENCES tb_uster_carda_par(testnr, source_prefix) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS tb_uster_carda_titulo_tbl (
      id BIGSERIAL PRIMARY KEY,
      testnr TEXT NOT NULL,
      source_prefix TEXT NOT NULL,
      repno INTEGER NOT NULL,
      titulo NUMERIC,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(testnr, source_prefix, repno),
      FOREIGN KEY (testnr, source_prefix)
        REFERENCES tb_uster_carda_par(testnr, source_prefix) ON DELETE CASCADE
    );

ALTER TABLE tb_uster_carda_par ALTER COLUMN source_prefix SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_uster_carda_par_time ON tb_uster_carda_par(time_stamp);

CREATE INDEX IF NOT EXISTS idx_uster_carda_tbl_testnr_prefix ON tb_uster_carda_tbl(testnr, source_prefix);

CREATE INDEX IF NOT EXISTS idx_uster_carda_titulo_testnr_prefix ON tb_uster_carda_titulo_tbl(testnr, source_prefix);

CREATE TABLE IF NOT EXISTS tb_tensorapid_par (
      testnr        TEXT PRIMARY KEY,
      ne_titulo     NUMERIC,
      titulo        TEXT,
      comment_text  TEXT,
      long_prueba   NUMERIC,
      time_stamp    TEXT,
      lote          TEXT,
      ne_titulo_type TEXT,
      uster_testnr  TEXT,
      laborant      TEXT
    );

CREATE TABLE IF NOT EXISTS tb_tensorapid_tbl (
      id            SERIAL PRIMARY KEY,
      testnr        TEXT REFERENCES tb_tensorapid_par(testnr) ON DELETE CASCADE,
      huso_number   INTEGER,
      tiempo_rotura NUMERIC,
      fuerza_b      NUMERIC,
      elongacion    NUMERIC,
      tenacidad     NUMERIC,
      trabajo       NUMERIC,
      huso_ensayos  INTEGER
    );

CREATE TABLE IF NOT EXISTS tb_hvi_crudo_archivos (
      filename TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS tb_hvi_crudo_datos (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL REFERENCES tb_hvi_crudo_archivos(filename) ON DELETE CASCADE,
      fecha TEXT,
      tipo TEXT,
      proveedor TEXT,
      lote TEXT,
      bale_id TEXT,
      sci NUMERIC,
      mst NUMERIC,
      mic NUMERIC,
      mat NUMERIC,
      uhml NUMERIC,
      ui NUMERIC,
      sf NUMERIC,
      str NUMERIC,
      elg NUMERIC,
      rd NUMERIC,
      plus_b NUMERIC,
      cgrd TEXT,
      trcnt NUMERIC,
      trar NUMERIC,
      trid TEXT,
      amt NUMERIC,
      calidad_fibra_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS tb_hvi_ensayos (
          id SERIAL PRIMARY KEY,
          lote TEXT NOT NULL,
          proveedor TEXT,
          grado TEXT,
          fecha TEXT,
          muestra TEXT,
          archivo_fuente TEXT,
          creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_hvi_ensayos' AND column_name='tipo') THEN
          ALTER TABLE tb_hvi_ensayos ADD COLUMN tipo TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_hvi_ensayos' AND column_name='cantidad') THEN
          ALTER TABLE tb_hvi_ensayos ADD COLUMN cantidad INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_hvi_ensayos' AND column_name='color') THEN
          ALTER TABLE tb_hvi_ensayos ADD COLUMN color TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_hvi_ensayos' AND column_name='cort') THEN
          ALTER TABLE tb_hvi_ensayos ADD COLUMN cort INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_hvi_ensayos' AND column_name='obs') THEN
          ALTER TABLE tb_hvi_ensayos ADD COLUMN obs TEXT;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS tb_hvi_detalles (
          id SERIAL PRIMARY KEY,
          ensayo_id INTEGER REFERENCES tb_hvi_ensayos(id) ON DELETE CASCADE,
          fardo TEXT,
          sci NUMERIC, mst NUMERIC, mic NUMERIC, mat NUMERIC, uhml NUMERIC,
          ui NUMERIC, sf NUMERIC, str NUMERIC, elg NUMERIC, rd NUMERIC,
          plus_b NUMERIC, tipo TEXT, tr_cnt NUMERIC, tr_ar NUMERIC, trid NUMERIC,
          estado_fardo TEXT DEFAULT 'OK'
      );

CREATE TABLE IF NOT EXISTS tb_narrativa_cache (
        cache_key   VARCHAR(64) PRIMARY KEY,
        lotes       TEXT NOT NULL,
        fecha       VARCHAR(20),
        formato     VARCHAR(32),
        modelo      VARCHAR(64),
        data_hash   VARCHAR(64) NOT NULL,
        narrativa   TEXT NOT NULL,
        json_analisis_ia JSONB,
        modelo_usado VARCHAR(64),
        token_info  JSONB,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        last_hit_at TIMESTAMPTZ DEFAULT NOW(),
        hits        INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_narrativa_cache_lotes ON tb_narrativa_cache(lotes, fecha);
      ALTER TABLE tb_narrativa_cache ADD COLUMN IF NOT EXISTS token_info JSONB;

      CREATE TABLE IF NOT EXISTS tb_narrativa_log (
        id            SERIAL PRIMARY KEY,
        lotes         TEXT NOT NULL,
        fecha_corte   VARCHAR(20),
        formato       VARCHAR(32),
        idioma        VARCHAR(10) DEFAULT 'es',
        modelo        VARCHAR(64),
        tokens_entrada  INTEGER DEFAULT 0,
        tokens_salida   INTEGER DEFAULT 0,
        tokens_total    INTEGER DEFAULT 0,
        costo_usd       NUMERIC(12,6) DEFAULT 0,
        fuente        VARCHAR(16) DEFAULT 'gemini',
        desde_cache   BOOLEAN DEFAULT FALSE,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_narrativa_log_created ON tb_narrativa_log(created_at DESC);
