-- ============================================================
-- VialRD — Funciones PostGIS especializadas
-- Ejecutar DESPUÉS de 01_schema.sql y 02_rls_policies.sql
-- ============================================================

-- ============================================================
-- calculate_route_risk
-- Recibe la geometría de una ruta (LineString) y devuelve un JSONB
-- con el conteo de hazards y un risk_score 0-100.
--
-- Uso desde el cliente JS:
--   const { data } = await supabase.rpc('calculate_route_risk', {
--     route_geom: 'LINESTRING(...)'
--   });
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_route_risk(
  route_geom GEOGRAPHY,
  buffer_meters INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  hazards_json JSONB;
  deaths_count INT;
  raw_score NUMERIC;
BEGIN
  -- Contar hazards ciudadanos cerca de la ruta
  SELECT jsonb_build_object(
    'baches',
      COUNT(*) FILTER (WHERE type = 'bache'),
    'policias_acostados',
      COUNT(*) FILTER (WHERE type = 'policia_acostado_no_senalizado'),
    'cruces_peligrosos',
      COUNT(*) FILTER (WHERE type = 'cruce_peligroso'),
    'zonas_oscuras',
      COUNT(*) FILTER (WHERE type = 'zona_oscura'),
    'semaforos_danados',
      COUNT(*) FILTER (WHERE type = 'semaforo_danado'),
    'senales_caidas',
      COUNT(*) FILTER (WHERE type = 'senal_caida'),
    'pasos_peatonales_borrados',
      COUNT(*) FILTER (WHERE type = 'paso_peatonal_borrado'),
    'curvas_peligrosas',
      COUNT(*) FILTER (WHERE type = 'curva_peligrosa'),
    'otros',
      COUNT(*) FILTER (WHERE type = 'otro')
  )
  INTO hazards_json
  FROM public.reports
  WHERE status IN ('verified', 'pending')
    AND ST_DWithin(location, route_geom, buffer_meters);

  -- Contar muertes en últimos 2 años cerca de la ruta (radio mayor: 100m)
  SELECT COUNT(*)
  INTO deaths_count
  FROM public.accidents_official
  WHERE incident_date >= NOW() - INTERVAL '2 years'
    AND fatalities > 0
    AND location IS NOT NULL
    AND ST_DWithin(location, route_geom, 100);

  -- Calcular score ponderado
  raw_score := COALESCE((hazards_json->>'policias_acostados')::INT, 0) * 3
             + COALESCE((hazards_json->>'baches')::INT, 0) * 2
             + COALESCE((hazards_json->>'cruces_peligrosos')::INT, 0) * 5
             + COALESCE((hazards_json->>'zonas_oscuras')::INT, 0) * 3
             + COALESCE((hazards_json->>'semaforos_danados')::INT, 0) * 4
             + deaths_count * 10;

  RETURN hazards_json || jsonb_build_object(
    'muertes_recientes_cerca', deaths_count,
    'risk_score', LEAST(100, raw_score),
    'risk_level',
      CASE
        WHEN raw_score < 10 THEN 'bajo'
        WHEN raw_score < 30 THEN 'moderado'
        WHEN raw_score < 60 THEN 'alto'
        ELSE 'muy_alto'
      END,
    'buffer_meters', buffer_meters,
    'calculated_at', NOW()
  );
END;
$$;

-- ============================================================
-- get_hazards_in_bbox
-- Devuelve reportes dentro de un bounding box, para cargar el mapa
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_hazards_in_bbox(
  min_lng NUMERIC,
  min_lat NUMERIC,
  max_lng NUMERIC,
  max_lat NUMERIC,
  filter_types TEXT[] DEFAULT NULL,
  max_results INT DEFAULT 1000
)
RETURNS TABLE (
  id           UUID,
  type         TEXT,
  severity     SMALLINT,
  description  TEXT,
  photo_url    TEXT,
  status       TEXT,
  upvotes      INT,
  lng          DOUBLE PRECISION,
  lat          DOUBLE PRECISION,
  created_at   TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    r.id,
    r.type,
    r.severity,
    r.description,
    r.photo_url,
    r.status,
    r.upvotes,
    ST_X(r.location::geometry) AS lng,
    ST_Y(r.location::geometry) AS lat,
    r.created_at
  FROM public.reports r
  WHERE r.status IN ('pending', 'verified')
    AND ST_Within(
          r.location::geometry,
          ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
        )
    AND (filter_types IS NULL OR r.type = ANY(filter_types))
  ORDER BY r.upvotes DESC, r.created_at DESC
  LIMIT max_results;
$$;

-- ============================================================
-- get_heatmap_data
-- Devuelve puntos para el mapa de calor de accidentes oficiales
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_heatmap_data(
  year_filter INT DEFAULT NULL,
  vehicle_filter TEXT DEFAULT NULL,
  province_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  lng          DOUBLE PRECISION,
  lat          DOUBLE PRECISION,
  fatalities   INT,
  injured      INT,
  weight       NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    ST_X(location::geometry) AS lng,
    ST_Y(location::geometry) AS lat,
    fatalities,
    injured,
    (fatalities * 3 + injured)::NUMERIC AS weight
  FROM public.accidents_official
  WHERE location IS NOT NULL
    AND (year_filter IS NULL OR EXTRACT(YEAR FROM incident_date) = year_filter)
    AND (vehicle_filter IS NULL OR vehicle_type = vehicle_filter)
    AND (province_filter IS NULL OR province = province_filter);
$$;

-- ============================================================
-- get_national_stats
-- Devuelve estadísticas nacionales agregadas para el dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_national_stats()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'fatalities_current_year',
      (SELECT COALESCE(SUM(fatalities), 0)
       FROM public.accidents_official
       WHERE EXTRACT(YEAR FROM incident_date) = EXTRACT(YEAR FROM NOW())),
    'motorcycle_fatalities_current_year',
      (SELECT COALESCE(SUM(fatalities), 0)
       FROM public.accidents_official
       WHERE EXTRACT(YEAR FROM incident_date) = EXTRACT(YEAR FROM NOW())
         AND vehicle_type = 'motocicleta'),
    'total_reports',
      (SELECT COUNT(*) FROM public.reports WHERE status != 'rejected'),
    'reports_last_30_days',
      (SELECT COUNT(*) FROM public.reports
       WHERE created_at >= NOW() - INTERVAL '30 days'
         AND status != 'rejected'),
    'top_provinces_by_fatalities',
      (SELECT jsonb_agg(p) FROM (
        SELECT province, SUM(fatalities) AS fatalities
        FROM public.accidents_official
        WHERE incident_date >= NOW() - INTERVAL '1 year'
        GROUP BY province
        ORDER BY SUM(fatalities) DESC
        LIMIT 5
      ) p),
    'updated_at', NOW()
  );
$$;
