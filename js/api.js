// ===========================================================
// VialRD — Cliente Supabase y API helpers
// ===========================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Estas variables se inyectan vía build/env. Para desarrollo local
// puedes hardcodear temporalmente (NUNCA pushear claves reales al repo)
const SUPABASE_URL = window.__ENV?.SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = window.__ENV?.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// ============================================================
// Stats nacionales (para hero counters + dashboard)
// ============================================================
export async function getNationalStats() {
  const { data, error } = await supabase.rpc('get_national_stats');
  if (error) throw error;
  return data;
}

// ============================================================
// Reportes en un bounding box (para cargar pines visibles en mapa)
// ============================================================
export async function getHazardsInBbox(bbox, filterTypes = null) {
  const { data, error } = await supabase.rpc('get_hazards_in_bbox', {
    min_lng: bbox[0],
    min_lat: bbox[1],
    max_lng: bbox[2],
    max_lat: bbox[3],
    filter_types: filterTypes,
    max_results: 1000
  });
  if (error) throw error;
  return data;
}

// ============================================================
// Datos para el heatmap de accidentes oficiales
// ============================================================
export async function getHeatmapData({ year, vehicleType, province } = {}) {
  const { data, error } = await supabase.rpc('get_heatmap_data', {
    year_filter: year || null,
    vehicle_filter: vehicleType || null,
    province_filter: province || null
  });
  if (error) throw error;
  return data;
}

// ============================================================
// Calcular score de riesgo de una ruta
// route_geom debe ser un LINESTRING en formato WKT o GeoJSON
// ============================================================
export async function calculateRouteRisk(routeGeomWKT, bufferMeters = 50) {
  const { data, error } = await supabase.rpc('calculate_route_risk', {
    route_geom: routeGeomWKT,
    buffer_meters: bufferMeters
  });
  if (error) throw error;
  return data;
}

// ============================================================
// Crear un reporte ciudadano (autenticado o anónimo)
// ============================================================
export async function createReport({
  type,
  lng,
  lat,
  severity,
  description,
  photoFile,
  province,
  municipality
}) {
  let photoUrl = null;

  // 1. Subir foto si la hay
  if (photoFile) {
    const ext = photoFile.name.split('.').pop();
    const filename = `${crypto.randomUUID()}.${ext}`;
    const { data: uploadData, error: uploadErr } = await supabase
      .storage
      .from('report-photos')
      .upload(filename, photoFile);
    if (uploadErr) throw uploadErr;
    const { data: urlData } = supabase.storage
      .from('report-photos')
      .getPublicUrl(uploadData.path);
    photoUrl = urlData.publicUrl;
  }

  // 2. Insertar reporte
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id || null;

  const insertPayload = {
    type,
    location: `POINT(${lng} ${lat})`,
    severity,
    description,
    photo_url: photoUrl,
    province,
    municipality,
    reporter_id: userId
  };

  // Si es anónimo, generar hash de IP placeholder (en producción esto lo hace el backend)
  if (!userId) {
    insertPayload.reporter_ip_hash = await hashClientFingerprint();
  }

  const { data, error } = await supabase
    .from('reports')
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Fingerprint simple para rate-limit de anónimos
async function hashClientFingerprint() {
  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().toDateString()
  ].join('|');
  const buf = new TextEncoder().encode(raw);
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================================
// Total de reportes (para counter de hero)
// ============================================================
export async function getReportsCount() {
  const { count, error } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'rejected');
  if (error) throw error;
  return count || 0;
}

// ============================================================
// Auth helpers
// ============================================================
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/app.html'
    }
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
