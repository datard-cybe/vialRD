-- ============================================================
-- VialRD — Schema principal
-- PostgreSQL 15+ con PostGIS
-- Ejecutar en Supabase SQL Editor en este orden:
--   1. 01_schema.sql   (este archivo)
--   2. 02_rls_policies.sql
--   3. 03_functions.sql
-- ============================================================

-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Tabla: reports
-- Reportes ciudadanos de hazards viales (baches, policías acostados, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            TEXT NOT NULL CHECK (type IN (
                    'bache',
                    'policia_acostado_no_senalizado',
                    'cruce_peligroso',
                    'zona_oscura',
                    'semaforo_danado',
                    'senal_caida',
                    'paso_peatonal_borrado',
                    'curva_peligrosa',
                    'otro'
                  )),
  location        GEOGRAPHY(POINT, 4326) NOT NULL,
  severity        SMALLINT CHECK (severity BETWEEN 1 AND 5),
  description     TEXT,
  photo_url       TEXT,
  reporter_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_ip_hash TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'verified', 'resolved', 'rejected')),
  upvotes         INT NOT NULL DEFAULT 0,
  downvotes       INT NOT NULL DEFAULT 0,
  province        TEXT,
  municipality    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_location ON public.reports USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_reports_type ON public.reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id);

COMMENT ON TABLE public.reports IS 'Reportes ciudadanos de hazards viales (crowdsourcing)';

-- ============================================================
-- Tabla: accidents_official
-- Accidentes y muertes oficiales del Opsevi/DIGESETT/ONE
-- Importados automáticamente via ETL semanal
-- ============================================================
CREATE TABLE IF NOT EXISTS public.accidents_official (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_date       DATE NOT NULL,
  hour_of_day         SMALLINT CHECK (hour_of_day BETWEEN 0 AND 23),
  day_of_week         SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),
  province            TEXT NOT NULL,
  municipality        TEXT,
  location            GEOGRAPHY(POINT, 4326),
  fatalities          INT NOT NULL DEFAULT 0,
  injured             INT NOT NULL DEFAULT 0,
  vehicle_type        TEXT CHECK (vehicle_type IN (
                        'motocicleta',
                        'automovil',
                        'vehiculo_pesado',
                        'transporte_publico',
                        'bicicleta',
                        'peaton',
                        'otro',
                        'desconocido'
                      )),
  victim_age_range    TEXT,
  victim_gender       TEXT CHECK (victim_gender IN ('masculino', 'femenino', 'desconocido')),
  accident_type       TEXT,
  source              TEXT NOT NULL CHECK (source IN ('DIGESETT', 'OPSEVI', 'ONE', 'INTRANT')),
  source_dataset_url  TEXT,
  raw_data            JSONB,
  imported_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accidents_date ON public.accidents_official(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_accidents_location ON public.accidents_official USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_accidents_vehicle ON public.accidents_official(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_accidents_province ON public.accidents_official(province);
CREATE INDEX IF NOT EXISTS idx_accidents_fatal ON public.accidents_official(incident_date) WHERE fatalities > 0;

COMMENT ON TABLE public.accidents_official IS 'Accidentes oficiales del Opsevi/DIGESETT/ONE — datos abiertos del Estado';

-- ============================================================
-- Tabla: report_votes
-- Votos comunitarios para verificar/disputar reportes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_votes (
  report_id   UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type   TEXT NOT NULL CHECK (vote_type IN ('confirm', 'dispute', 'resolved_by_authority')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (report_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_user ON public.report_votes(user_id);

-- ============================================================
-- Tabla: route_queries
-- Analytics: rutas calculadas para entender patrones de uso
-- ============================================================
CREATE TABLE IF NOT EXISTS public.route_queries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  origin          GEOGRAPHY(POINT, 4326),
  destination     GEOGRAPHY(POINT, 4326),
  route_geometry  GEOGRAPHY(LINESTRING, 4326),
  distance_meters NUMERIC,
  duration_sec    NUMERIC,
  risk_score      NUMERIC,
  hazards_count   JSONB,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_ip_hash    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routes_created ON public.route_queries(created_at DESC);

-- ============================================================
-- Tabla: user_profiles
-- Perfiles extendidos de usuarios (gamification: puntos, badges)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name      TEXT,
  province          TEXT,
  reports_submitted INT NOT NULL DEFAULT 0,
  reports_verified  INT NOT NULL DEFAULT 0,
  points            INT NOT NULL DEFAULT 0,
  badges            JSONB DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_points ON public.user_profiles(points DESC);

-- ============================================================
-- Trigger: actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Trigger: crear perfil automáticamente al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Trigger: incrementar contador de reportes en user_profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_report_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reporter_id IS NOT NULL THEN
    UPDATE public.user_profiles
    SET reports_submitted = reports_submitted + 1,
        points = points + 10
    WHERE user_id = NEW.reporter_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_report_created
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.increment_report_count();
