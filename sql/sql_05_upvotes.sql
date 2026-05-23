-- =================================================================
-- VialRD — Upvotes system (Opción A) — CORREGIDO
-- Compatibilidad con reports.id = UUID
-- =================================================================

-- 1) Crear tabla de confirmaciones (votos)
CREATE TABLE IF NOT EXISTS public.report_confirmations (
  id BIGSERIAL PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  response TEXT CHECK (response IN ('yes', 'no')),
  user_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_report_confirmations_report_id 
  ON public.report_confirmations(report_id);
CREATE INDEX idx_report_confirmations_created_at 
  ON public.report_confirmations(created_at);

-- 2) Agregar columnas de status a reports (si no existen)
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS vote_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'archived'));

-- 3) Función: Contar votos "yes" para un reporte
CREATE OR REPLACE FUNCTION count_yes_votes(report_id_param UUID)
RETURNS INT AS $$
  SELECT COUNT(*) FROM public.report_confirmations 
  WHERE report_id = report_id_param AND response = 'yes';
$$ LANGUAGE SQL STABLE;

-- 4) Trigger: Auto-actualizar vote_count en reports cuando se inserta confirmación
CREATE OR REPLACE FUNCTION update_report_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.reports
  SET vote_count = count_yes_votes(NEW.report_id)
  WHERE id = NEW.report_id;
  
  -- Si llega a 3 votos, cambiar a verified
  IF (SELECT count_yes_votes(NEW.report_id)) >= 3 THEN
    UPDATE public.reports
    SET status = 'verified'
    WHERE id = NEW.report_id AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_report_votes ON public.report_confirmations;
CREATE TRIGGER trigger_update_report_votes
  AFTER INSERT ON public.report_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_report_vote_count();

-- 5) Función RPC: Registrar voto/confirmación desde frontend (anónimo)
CREATE OR REPLACE FUNCTION add_report_confirmation(
  p_report_id UUID,
  p_response TEXT
)
RETURNS JSON AS $$
DECLARE
  v_vote_count INT;
  v_status TEXT;
BEGIN
  -- Insertar confirmación
  INSERT INTO public.report_confirmations (report_id, response, user_session_id)
  VALUES (p_report_id, p_response, gen_random_uuid()::TEXT);
  
  -- Obtener conteo actualizado y status
  SELECT vote_count, status INTO v_vote_count, v_status
  FROM public.reports
  WHERE id = p_report_id;
  
  RETURN json_build_object(
    'success', true,
    'vote_count', COALESCE(v_vote_count, 0),
    'status', v_status,
    'message', CASE 
      WHEN v_status = 'verified' THEN 'Reporte verificado ✓'
      ELSE 'Voto registrado (' || COALESCE(v_vote_count, 0) || '/3)'
    END
  );
END;
$$ LANGUAGE plpgsql;

-- 6) Función RPC: Obtener datos del reporte con votos (para popup)
CREATE OR REPLACE FUNCTION get_report_details(p_report_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'id', id,
      'type', type,
      'severity', severity,
      'latitude', latitude,
      'longitude', longitude,
      'description', description,
      'created_at', created_at,
      'status', status,
      'vote_count', vote_count,
      'votes_needed', 3 - COALESCE(vote_count, 0)
    )
    FROM public.reports
    WHERE id = p_report_id
  );
END;
$$ LANGUAGE plpgsql;

-- 7) Habilitar RLS en report_confirmations
ALTER TABLE public.report_confirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_confirmations" ON public.report_confirmations;
CREATE POLICY "public_insert_confirmations"
  ON public.report_confirmations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_confirmations" ON public.report_confirmations;
CREATE POLICY "public_read_confirmations"
  ON public.report_confirmations
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 8) Actualizar RLS en reports para que anon pueda leer status/vote_count
DROP POLICY IF EXISTS "public_read_reports" ON public.reports;
CREATE POLICY "public_read_reports"
  ON public.reports
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "public_insert_reports" ON public.reports;
CREATE POLICY "public_insert_reports"
  ON public.reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 9) Verificación rápida
SELECT 
  COUNT(*) as total_reportes,
  SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verificados,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendientes
FROM public.reports;