-- ============================================================
-- VialRD — Row Level Security Policies
-- Ejecutar DESPUÉS de 01_schema.sql
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accidents_official ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- reports: lectura pública, escritura controlada
-- ============================================================

-- Cualquiera (incluso sin login) puede LEER reportes
CREATE POLICY "reports_public_read"
  ON public.reports
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Usuarios autenticados pueden CREAR reportes asociados a su ID
CREATE POLICY "reports_authenticated_insert"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Anónimos pueden crear reportes SIN reporter_id (rate limit via IP hash)
CREATE POLICY "reports_anonymous_insert"
  ON public.reports
  FOR INSERT
  TO anon
  WITH CHECK (
    reporter_id IS NULL
    AND reporter_ip_hash IS NOT NULL
    AND length(reporter_ip_hash) > 20
  );

-- Solo el autor puede actualizar su reporte
CREATE POLICY "reports_owner_update"
  ON public.reports
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = reporter_id)
  WITH CHECK (auth.uid() = reporter_id);

-- Solo el autor puede borrar su reporte
CREATE POLICY "reports_owner_delete"
  ON public.reports
  FOR DELETE
  TO authenticated
  USING (auth.uid() = reporter_id);

-- ============================================================
-- accidents_official: solo lectura pública
-- (escritura solo via service role del ETL)
-- ============================================================

CREATE POLICY "accidents_public_read"
  ON public.accidents_official
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- report_votes: usuarios autenticados pueden votar
-- ============================================================

CREATE POLICY "votes_public_read"
  ON public.report_votes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "votes_authenticated_insert"
  ON public.report_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "votes_owner_delete"
  ON public.report_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- route_queries: lectura pública agregada, escritura libre
-- (sin PII, son analytics)
-- ============================================================

CREATE POLICY "routes_public_read"
  ON public.route_queries
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "routes_anyone_insert"
  ON public.route_queries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================================
-- user_profiles: lectura pública (display_name, points, badges)
-- ============================================================

CREATE POLICY "profiles_public_read"
  ON public.user_profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "profiles_owner_update"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
