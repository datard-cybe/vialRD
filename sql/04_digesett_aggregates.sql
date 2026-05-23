-- ============================================================
-- VialRD — Schema agregados DIGESETT
-- Ejecutar DESPUÉS de 01-03 SQLs base
-- ============================================================

-- ============================================================
-- province_yearly_stats
-- Fallecidos por provincia x año (datos oficiales DIGESETT)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.province_yearly_stats (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  province        TEXT NOT NULL,
  year            INT NOT NULL,
  fatalities      INT NOT NULL DEFAULT 0,
  location        GEOGRAPHY(POINT, 4326),
  source          TEXT NOT NULL DEFAULT 'DIGESETT',
  source_url      TEXT,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (province, year, source)
);

CREATE INDEX IF NOT EXISTS idx_province_year ON public.province_yearly_stats(year);
CREATE INDEX IF NOT EXISTS idx_province_name ON public.province_yearly_stats(province);
CREATE INDEX IF NOT EXISTS idx_province_loc ON public.province_yearly_stats USING GIST (location);

ALTER TABLE public.province_yearly_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "province_stats_public_read" ON public.province_yearly_stats;
CREATE POLICY "province_stats_public_read"
  ON public.province_yearly_stats
  FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- aggregate_stats
-- Stats agregados (por mes, día semana, hora, vehículo, edad, género)
-- guardados como JSONB para flexibilidad
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aggregate_stats (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category        TEXT NOT NULL,  -- 'month', 'weekday', 'hour', 'vehicle', 'age', 'gender', 'accident_type', 'region'
  year            INT,            -- NULL = todos los años combinados
  data            JSONB NOT NULL,
  source          TEXT NOT NULL DEFAULT 'DIGESETT',
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category, year, source)
);

CREATE INDEX IF NOT EXISTS idx_agg_category ON public.aggregate_stats(category);
CREATE INDEX IF NOT EXISTS idx_agg_year ON public.aggregate_stats(year);

ALTER TABLE public.aggregate_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aggregate_stats_public_read" ON public.aggregate_stats;
CREATE POLICY "aggregate_stats_public_read"
  ON public.aggregate_stats
  FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- get_province_heatmap
-- Devuelve la lista de provincias con totales para el mapa
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_province_heatmap(year_filter INT DEFAULT NULL)
RETURNS TABLE (
  province     TEXT,
  fatalities   INT,
  lng          DOUBLE PRECISION,
  lat          DOUBLE PRECISION,
  years_count  INT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    province,
    SUM(fatalities)::INT AS fatalities,
    ST_X(location::geometry) AS lng,
    ST_Y(location::geometry) AS lat,
    COUNT(DISTINCT year)::INT AS years_count
  FROM public.province_yearly_stats
  WHERE location IS NOT NULL
    AND (year_filter IS NULL OR year = year_filter)
  GROUP BY province, location
  ORDER BY fatalities DESC;
$$;

-- ============================================================
-- get_aggregate_summary
-- Devuelve summary para el dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_aggregate_summary(year_filter INT DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT jsonb_build_object(
    'total_fatalities',
      COALESCE((SELECT SUM(fatalities) FROM public.province_yearly_stats
        WHERE year_filter IS NULL OR year = year_filter), 0),
    'years_covered',
      (SELECT COUNT(DISTINCT year) FROM public.province_yearly_stats
        WHERE year_filter IS NULL OR year = year_filter),
    'top_5_provinces',
      (SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT province, SUM(fatalities) AS fatalities
        FROM public.province_yearly_stats
        WHERE year_filter IS NULL OR year = year_filter
        GROUP BY province
        ORDER BY SUM(fatalities) DESC
        LIMIT 5
      ) t),
    'by_year',
      (SELECT jsonb_agg(row_to_json(y) ORDER BY y.year) FROM (
        SELECT year, SUM(fatalities) AS fatalities
        FROM public.province_yearly_stats
        GROUP BY year
        ORDER BY year
      ) y),
    'aggregates',
      (SELECT jsonb_object_agg(category, data)
        FROM public.aggregate_stats
        WHERE year_filter IS NULL OR year = year_filter OR year IS NULL)
  );
$$;
