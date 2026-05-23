// ===========================================================
// VialRD — Lógica del mapa interactivo (v2 — filtros reactivos + upvotes)
// MapLibre GL JS + OpenStreetMap tiles + Supabase
// ===========================================================

// ============ Centroides de las 32 provincias ============
const PROVINCE_CENTROIDS = {
  'Distrito Nacional':         { lng: -69.9312, lat: 18.4861 },
  'Santo Domingo':             { lng: -69.8571, lat: 18.5001 },
  'Santiago':                  { lng: -70.6970, lat: 19.4517 },
  'La Vega':                   { lng: -70.5331, lat: 19.2226 },
  'San Cristóbal':             { lng: -70.1042, lat: 18.4178 },
  'Puerto Plata':              { lng: -70.6970, lat: 19.7892 },
  'Duarte':                    { lng: -70.2547, lat: 19.2950 },
  'San Pedro de Macorís':      { lng: -69.3066, lat: 18.4539 },
  'La Romana':                 { lng: -68.9728, lat: 18.4276 },
  'La Altagracia':             { lng: -68.7058, lat: 18.6155 },
  'Peravia':                   { lng: -70.3320, lat: 18.2810 },
  'Azua':                      { lng: -70.7350, lat: 18.4534 },
  'Barahona':                  { lng: -71.1000, lat: 18.2117 },
  'Monseñor Nouel':            { lng: -70.4082, lat: 18.9347 },
  'Sánchez Ramírez':           { lng: -70.0500, lat: 19.0670 },
  'San Juan':                  { lng: -71.2295, lat: 18.8074 },
  'Espaillat':                 { lng: -70.5152, lat: 19.5475 },
  'Hermanas Mirabal':          { lng: -70.3678, lat: 19.3725 },
  'Valverde':                  { lng: -70.8950, lat: 19.5650 },
  'Monte Cristi':              { lng: -71.6500, lat: 19.8500 },
  'Dajabón':                   { lng: -71.7000, lat: 19.5500 },
  'Santiago Rodríguez':        { lng: -71.3380, lat: 19.4625 },
  'Samaná':                    { lng: -69.3370, lat: 19.2070 },
  'María Trinidad Sánchez':    { lng: -69.8500, lat: 19.3917 },
  'Hato Mayor':                { lng: -69.2536, lat: 18.7625 },
  'El Seibo':                  { lng: -69.0397, lat: 18.7647 },
  'Monte Plata':               { lng: -69.7848, lat: 18.8074 },
  'San José de Ocoa':          { lng: -70.5042, lat: 18.5447 },
  'Bahoruco':                  { lng: -71.4244, lat: 18.5099 },
  'Independencia':             { lng: -71.7250, lat: 18.4942 },
  'Pedernales':                { lng: -71.7497, lat: 17.9942 },
  'Elías Piña':                { lng: -71.7036, lat: 18.8775 },
};

// ============ Mock fallback ============
const MOCK_PROVINCES_YEARLY = (() => {
  const data = [];
  const baseShare = {
    'Distrito Nacional': 0.07, 'Santo Domingo': 0.13, 'Santiago': 0.10,
    'La Vega': 0.05, 'San Cristóbal': 0.045, 'Puerto Plata': 0.035,
    'Duarte': 0.03, 'San Pedro de Macorís': 0.032, 'La Romana': 0.027,
    'La Altagracia': 0.034, 'Peravia': 0.021, 'Azua': 0.023,
    'Barahona': 0.018, 'Monseñor Nouel': 0.02, 'Sánchez Ramírez': 0.016,
    'San Juan': 0.020, 'Espaillat': 0.017, 'Hermanas Mirabal': 0.010,
    'Valverde': 0.015, 'Monte Cristi': 0.012, 'Dajabón': 0.008,
    'Santiago Rodríguez': 0.006, 'Samaná': 0.013, 'María Trinidad Sánchez': 0.012,
    'Hato Mayor': 0.011, 'El Seibo': 0.010, 'Monte Plata': 0.015,
    'San José de Ocoa': 0.008, 'Bahoruco': 0.009, 'Independencia': 0.006,
    'Pedernales': 0.004, 'Elías Piña': 0.007
  };
  const yearTotals = { 2021: 2456, 2022: 2890, 2023: 3010, 2024: 2920, 2025: 2992, 2026: 640 };
  Object.entries(yearTotals).forEach(([year, total]) => {
    Object.entries(baseShare).forEach(([province, share]) => {
      const fat = Math.round(total * share);
      data.push({
        province,
        year: parseInt(year, 10),
        fatalities: fat,
        motorcycle_fatalities: Math.round(fat * 0.65)
      });
    });
  });
  return data;
})();

const MOCK_HAZARDS = [
  { lng: -69.9320, lat: 18.4865, type: 'policia_acostado_no_senalizado', desc: 'Policía acostado sin pintar, casi invisible de noche', severity: 4, province: 'Distrito Nacional' },
  { lng: -69.9105, lat: 18.4912, type: 'policia_acostado_no_senalizado', desc: 'Tres reductores seguidos sin advertencia previa', severity: 5, province: 'Distrito Nacional' },
  { lng: -69.8745, lat: 18.4880, type: 'policia_acostado_no_senalizado', desc: 'Muy alto, daña suspensión', severity: 4, province: 'Santo Domingo' },
  { lng: -69.9510, lat: 18.4910, type: 'policia_acostado_no_senalizado', desc: 'Sin señalización ni pintura', severity: 3, province: 'Distrito Nacional' },
  { lng: -70.6920, lat: 19.4520, type: 'policia_acostado_no_senalizado', desc: 'Cerca de escuela pero sin marcar', severity: 4, province: 'Santiago' },
  { lng: -69.8590, lat: 18.5040, type: 'policia_acostado_no_senalizado', desc: 'En curva, peligroso de noche', severity: 5, province: 'Santo Domingo' },
  { lng: -69.9220, lat: 18.4830, type: 'policia_acostado_no_senalizado', desc: 'Improvisado con concreto', severity: 4, province: 'Distrito Nacional' },
  { lng: -69.9180, lat: 18.4820, type: 'bache', desc: 'Hueco profundo en carril derecho', severity: 4, province: 'Distrito Nacional' },
  { lng: -69.9402, lat: 18.4855, type: 'bache', desc: 'Bache grande, se ha tragado motoristas', severity: 5, province: 'Distrito Nacional' },
  { lng: -69.8950, lat: 18.4956, type: 'bache', desc: 'Múltiples baches en cadena', severity: 3, province: 'Santo Domingo' },
  { lng: -70.7050, lat: 19.4580, type: 'bache', desc: 'Hueco que retiene agua, no se ve', severity: 4, province: 'Santiago' },
  { lng: -69.8470, lat: 18.4910, type: 'bache', desc: 'Bache sobre tapa de alcantarilla', severity: 4, province: 'Santo Domingo' },
  { lng: -69.9085, lat: 18.4756, type: 'bache', desc: 'En avenida principal, sin reparar 6 meses', severity: 3, province: 'Distrito Nacional' },
  { lng: -69.9012, lat: 18.4789, type: 'cruce_peligroso', desc: 'Cruce sin semáforo, alta mortalidad', severity: 5, province: 'Distrito Nacional' },
  { lng: -69.8801, lat: 18.4912, type: 'semaforo_danado', desc: 'Solo parpadea amarillo desde hace semanas', severity: 3, province: 'Distrito Nacional' },
  { lng: -69.9421, lat: 18.4823, type: 'zona_oscura', desc: 'Sin alumbrado en 200m', severity: 4, province: 'Distrito Nacional' },
];

// ============ Estado global ============
const state = {
  map: null,
  provincesRaw: [],
  hazards: [],
  reports: [],  // ← NUEVO: reports ciudadanos con votos
  filters: { year: '2025', vehicle: 'motocicleta', province: '' },
  pendingReportLocation: null,
  lastValues: {},
};

// ============ Carga de Supabase opcional ============
let supabaseAPI = null;
async function loadSupabase() {
  try {
    supabaseAPI = await import('./api.js');
    return true;
  } catch (e) {
    console.warn('[VialRD] Supabase no disponible, usando datos mock:', e.message);
    return false;
  }
}

// ============ Helper: animación de contadores ============
function animateNumber(elementId, target, duration = 600) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const start = state.lastValues[elementId] ?? 0;
  if (start === target) {
    el.textContent = target.toLocaleString('es-DO');
    return;
  }
  const t0 = performance.now();
  function frame(now) {
    const p = Math.min((now - t0) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = Math.round(start + (target - start) * eased);
    el.textContent = val.toLocaleString('es-DO');
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  state.lastValues[elementId] = target;
}

function setText(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = text ?? '—';
}

// ============ Inicialización del mapa ============
function initMap() {
  const map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        'osm-raster': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
        }
      },
      layers: [
        {
          id: 'osm-base',
          type: 'raster',
          source: 'osm-raster',
          paint: {
            'raster-saturation': -0.5,
            'raster-brightness-min': 0.15,
            'raster-brightness-max': 0.85,
            'raster-contrast': 0.1,
          }
        }
      ],
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    },
    center: [-70.16, 18.74],
    zoom: 7.4,
    minZoom: 6.5,
    maxZoom: 18,
    attributionControl: false,
  });

  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new maplibregl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: false,
    showAccuracyCircle: false,
  }), 'top-right');

  return map;
}

// ============ Cargar datos de Supabase ============
async function loadData() {
  if (supabaseAPI) {
    try {
      // Cargar datos provinciales
      const { data, error } = await supabaseAPI.supabase
        .from('province_yearly_stats')
        .select('*');
      if (!error && data) {
        state.provincesRaw = data;
        console.log(`[VialRD] ${data.length} filas province×year cargadas`);
      }
      
      // Cargar reportes con votos ← NUEVO
      const { data: reports, error: reportsErr } = await supabaseAPI.supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (!reportsErr && reports) {
        state.reports = reports;
        console.log(`[VialRD] ${reports.length} reportes cargados`);
      }
    } catch (err) {
      console.warn('[VialRD] Error cargando datos:', err.message);
      state.provincesRaw = MOCK_PROVINCES_YEARLY;
      state.hazards = MOCK_HAZARDS;
    }
  } else {
    state.provincesRaw = MOCK_PROVINCES_YEARLY;
    state.hazards = MOCK_HAZARDS;
  }

  applyDataToMap();
}

// ============ Renderizar datos en el mapa ============
function applyDataToMap() {
  const map = state.map;
  
  // Filtrar y agrupar por provincia
  let filtered = state.provincesRaw;
  
  // Filtro año
  if (state.filters.year && state.filters.year !== '') {
    filtered = filtered.filter(r => r.year.toString() === state.filters.year);
  }
  
  // Filtro provincia
  if (state.filters.province && state.filters.province !== '') {
    filtered = filtered.filter(r => r.province === state.filters.province);
  }
  
  // Agrupar por provincia
  const provinceGroups = {};
  filtered.forEach(row => {
    if (!provinceGroups[row.province]) {
      provinceGroups[row.province] = { fatalities: 0, motorcycle_fatalities: 0 };
    }
    provinceGroups[row.province].fatalities += row.fatalities || 0;
    provinceGroups[row.province].motorcycle_fatalities += row.motorcycle_fatalities || 0;
  });
  
  // Determinar si mostrar motos o todos
  const isMotoOnly = state.filters.vehicle === 'motocicleta';
  
  // Renderizar círculos
  const features = Object.entries(provinceGroups).map(([province, stats]) => {
    const centroid = PROVINCE_CENTROIDS[province] || { lng: -70, lat: 18.5 };
    const value = isMotoOnly ? stats.motorcycle_fatalities : stats.fatalities;
    const pct = stats.fatalities > 0 ? (stats.motorcycle_fatalities / stats.fatalities * 100).toFixed(1) : 0;
    
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [centroid.lng, centroid.lat]
      },
      properties: {
        province,
        fatalities: value,
        fatalities_total: stats.fatalities,
        motorcycle_fatalities: stats.motorcycle_fatalities,
        moto_share: (parseFloat(pct) / 100).toFixed(3),
        year_filter: state.filters.year || null,
        vehicle_filter: state.filters.vehicle || 'todos',
      }
    };
  });
  
  // Actualizar fuente GeoJSON
  const source = map.getSource('provinces-source');
  if (source) {
    source.setData({
      type: 'FeatureCollection',
      features
    });
  }
  
  // Actualizar stats en el panel
  const totalVal = Object.values(provinceGroups).reduce((sum, p) => sum + (isMotoOnly ? p.motorcycle_fatalities : p.fatalities), 0);
  animateNumber('stat-deaths', totalVal);
  
  // Renderizar reports con votos ← NUEVO
  state.reports.forEach(report => {
    if (report.latitude && report.longitude) {
      addReportMarker(map, report);
    }
  });
}

// ============ NUEVO: Agregar pin de reporte en el mapa ============
function addReportMarker(map, report) {
  // Color según status: gris=pending, rojo=verified
  const color = report.status === 'verified' ? '#e63946' : '#888888';
  const icon = report.type === 'bache' ? '🕳️' : '⚠️';
  
  const div = document.createElement('div');
  div.style.width = '32px';
  div.style.height = '32px';
  div.style.backgroundColor = color;
  div.style.borderRadius = '50%';
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.justifyContent = 'center';
  div.style.fontSize = '14px';
  div.style.cursor = 'pointer';
  div.style.border = '2px solid rgba(255,255,255,0.4)';
  div.style.opacity = '0.85';
  div.innerHTML = icon;
  
  const marker = new maplibregl.Marker(div)
    .setLngLat([report.longitude, report.latitude])
    .addTo(map);
  
  marker.getElement().addEventListener('click', () => {
    showReportPopup(map, report);
  });
}

// ============ NUEVO: Mostrar popup de reporte con botones de voto ============
function showReportPopup(map, report) {
  const voteProgress = `${report.vote_count || 0}/3`;
  const voteBar = '█'.repeat(report.vote_count || 0) + '░'.repeat(Math.max(0, 3 - (report.vote_count || 0)));
  
  let html = `
    <div class="popup-title">${report.type.toUpperCase()}</div>
    <div class="popup-meta">${report.status === 'verified' ? '✓ VERIFICADO' : '○ PENDIENTE'}</div>
    <div class="popup-stat">${voteBar}</div>
    <div class="popup-desc">${voteProgress} votos</div>
    <div class="popup-row">
      <span class="popup-row__label">Severidad:</span>
      <strong>${report.severity}/5</strong>
    </div>
    <div class="popup-row">
      <span class="popup-row__label">Reportado:</span>
      <strong>${new Date(report.created_at).toLocaleDateString('es-DO')}</strong>
    </div>
    ${report.description ? `<div class="popup-desc" style="margin-top:8px;">"${report.description}"</div>` : ''}
  `;
  
  // Botones de confirmación (solo si pending y <3 votos)
  if (report.status !== 'verified') {
    html += `
      <div style="margin-top:12px; display:flex; gap:8px;">
        <button data-report-id="${report.id}" data-response="yes" style="flex:1; padding:6px; background:#e63946; color:white; border:none; cursor:pointer; border-radius:2px; font-weight:600; font-size:0.78rem;">
          ✓ Sigue aquí
        </button>
        <button data-report-id="${report.id}" data-response="no" style="flex:1; padding:6px; background:#888; color:white; border:none; cursor:pointer; border-radius:2px; font-weight:600; font-size:0.78rem;">
          ✗ No está
        </button>
      </div>
    `;
  }
  
  const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
    .setLngLat([report.longitude, report.latitude])
    .setHTML(html)
    .addTo(map);
  
  // Event listeners
  setTimeout(() => {
    document.querySelectorAll(`button[data-report-id="${report.id}"]`).forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const response = btn.dataset.response;
        await submitConfirmation(report.id, response, popup);
      });
    });
  }, 100);
}

// ============ NUEVO: Enviar confirmación (voto) ============
async function submitConfirmation(reportId, response, popup) {
  if (!supabaseAPI) {
    showToast('Supabase no disponible');
    return;
  }
  
  try {
    const { data, error } = await supabaseAPI.supabase.rpc('add_report_confirmation', {
      p_report_id: reportId,
      p_response: response
    });
    
    if (error) {
      console.error('[VialRD] Error registrando confirmación:', error);
      showToast('Error al registrar voto');
      return;
    }
    
    // Recargar el reporte para mostrar votos actualizados
    const { data: updatedReport } = await supabaseAPI.supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();
    
    if (updatedReport) {
      // Actualizar en state
      const idx = state.reports.findIndex(r => r.id === reportId);
      if (idx >= 0) state.reports[idx] = updatedReport;
      
      // Cerrar popup y reabrirlo
      popup.remove();
      showReportPopup(state.map, updatedReport);
      showToast(data.message);
    }
  } catch (err) {
    console.error('[VialRD] Error en submitConfirmation:', err);
    showToast('Error al registrar voto');
  }
}

// ============ Setup de capas (PARTE ORIGINAL COMPLETA) ============
function setupLayers(map) {
  // Sources
  map.addSource('provinces-source', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });
  
  map.addSource('hazards-source', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: state.hazards.map(h => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [h.lng, h.lat] },
        properties: h
      }))
    }
  });

  // Layers (mantenidos íntegros)
  map.addLayer({
    id: 'provinces-circles',
    type: 'circle',
    source: 'provinces-source',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['get', 'fatalities'],
        0, 8,
        5000, 60
      ],
      'circle-color': [
        'interpolate',
        ['linear'],
        ['get', 'fatalities'],
        0, '#e8a0a0',
        1000, '#d9534f',
        5000, '#8b0000'
      ],
      'circle-opacity': 0.7,
      'circle-stroke-width': 2,
      'circle-stroke-color': 'rgba(255,255,255,0.4)',
    }
  });

  map.addLayer({
    id: 'provinces-labels',
    type: 'symbol',
    source: 'provinces-source',
    layout: {
      'text-field': '{fatalities}',
      'text-size': 13,
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-offset': [0, 0],
      'text-allow-overlap': true,
      'icon-allow-overlap': true,
    },
    paint: {
      'text-color': '#fff',
      'text-halo-color': '#000',
      'text-halo-width': 1.5,
    }
  });

  // Hazards (bumps, potholes, other)
  const hazardStyles = {
    'hazards-bumps': { icon: '🚓', color: '#f4c430', desc: 'Policías acostados' },
    'hazards-potholes': { icon: '🕳️', color: '#ff8c00', desc: 'Baches' },
    'hazards-other': { icon: '⚠️', color: '#ff69b4', desc: 'Otros hazards' },
  };

  Object.entries(hazardStyles).forEach(([layerId, { icon, color, desc }]) => {
    const typeFilter = layerId === 'hazards-bumps'
      ? 'policia_acostado_no_senalizado'
      : layerId === 'hazards-potholes'
        ? 'bache'
        : 'otros';

    map.addLayer({
      id: layerId,
      type: 'symbol',
      source: 'hazards-source',
      filter: layerId === 'hazards-bumps'
        ? ['==', ['get', 'type'], 'policia_acostado_no_senalizado']
        : layerId === 'hazards-potholes'
          ? ['==', ['get', 'type'], 'bache']
          : ['!in', ['get', 'type'], 'policia_acostado_no_senalizado', 'bache'],
      layout: {
        'icon-image': 'marker-15',
        'icon-size': 1.5,
        'icon-allow-overlap': true,
      },
      paint: {}
    });
  });
}

// ============ Popups (PARTE ORIGINAL COMPLETA) ============
function setupPopups(map) {
  map.on('click', 'provinces-circles', (e) => {
    const p = e.features[0].properties;
    const yearTxt = p.year_filter ? `año ${p.year_filter}` : '2016-2026 (acumulado)';
    const vehicleTxt = p.vehicle_filter === 'motocicleta' ? 'motoristas' : 'todos los vehículos';
    const motoSharePct = (parseFloat(p.moto_share) * 100).toFixed(1);

    new maplibregl.Popup({ closeButton: true, maxWidth: '340px' })
      .setLngLat(e.lngLat)
      .setHTML(`
        <div class="popup-title">Provincia de ${p.province}</div>
        <div class="popup-meta">${yearTxt} · ${vehicleTxt}</div>
        <div class="popup-stat">${Number(p.fatalities).toLocaleString('es-DO')} fallecidos</div>
        <div class="popup-row">
          <span class="popup-row__label">Total (todos los vehículos)</span>
          <strong>${Number(p.fatalities_total).toLocaleString('es-DO')}</strong>
        </div>
        <div class="popup-row">
          <span class="popup-row__label">Motoristas</span>
          <strong>${Number(p.motorcycle_fatalities).toLocaleString('es-DO')} (${motoSharePct}%)</strong>
        </div>
        <div class="popup-desc" style="margin-top:8px">
          Total en <strong>toda la provincia</strong>, ubicado en el centro geográfico.
        </div>
        <div class="popup-desc" style="margin-top:8px; font-size:0.75rem; opacity:0.65; border-top:1px solid #333; padding-top:6px">
          Fuente: DIGESETT / Opsevi · datos.gob.do
        </div>
      `)
      .addTo(map);
  });

  // Popups hazards
  const hazardLayers = ['hazards-bumps', 'hazards-potholes', 'hazards-other'];
  hazardLayers.forEach(layerId => {
    map.on('click', layerId, (e) => {
      const f = e.features[0];
      const p = f.properties;
      const typeLabels = {
        bache: 'Bache',
        policia_acostado_no_senalizado: 'Policía acostado sin señalizar',
        cruce_peligroso: 'Cruce peligroso',
        zona_oscura: 'Zona oscura',
        semaforo_danado: 'Semáforo dañado',
        senal_caida: 'Señal caída',
        paso_peatonal_borrado: 'Paso peatonal borrado',
        curva_peligrosa: 'Curva peligrosa',
        otro: 'Otro hazard'
      };
      const severityStars = '★'.repeat(p.severity || 1) + '☆'.repeat(5 - (p.severity || 1));
      new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="popup-title">${typeLabels[p.type] || p.type}</div>
          <div class="popup-meta">Severidad: ${severityStars}</div>
          <div class="popup-desc">${p.desc || 'Sin descripción'}</div>
          <div class="popup-desc" style="margin-top:8px; font-size:0.78rem; opacity:0.7">Reporte ciudadano</div>
        `)
        .addTo(map);
    });
  });

  // Cursor pointer
  ['provinces-circles', 'deaths-points', ...hazardLayers].forEach(layerId => {
    map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
  });
}

// ============ Click "Reportar aquí" ============
function setupReportClick(map) {
  let pinMarker = null;
  let armed = false;

  document.getElementById('btn-report-here').addEventListener('click', () => {
    armed = !armed;
    if (armed) {
      showToast('Click en el mapa para fijar la ubicación del reporte');
      map.getCanvas().style.cursor = 'crosshair';
    } else {
      map.getCanvas().style.cursor = '';
      if (pinMarker) { pinMarker.remove(); pinMarker = null; }
    }
  });

  map.on('click', (e) => {
    if (!armed) return;
    if (pinMarker) pinMarker.remove();
    pinMarker = new maplibregl.Marker({ color: '#e63946' })
      .setLngLat(e.lngLat)
      .addTo(map);
    armed = false;
    map.getCanvas().style.cursor = '';
    state.pendingReportLocation = { lng: e.lngLat.lng, lat: e.lngLat.lat };

    setTimeout(() => {
      window.location.href = `/reportar.html?lng=${e.lngLat.lng.toFixed(6)}&lat=${e.lngLat.lat.toFixed(6)}`;
    }, 600);
  });
}

// ============ Toggle de capas ============
function setupLayerToggles(map) {
  const bindings = [
    { input: 'layer-provinces', layers: ['provinces-circles', 'provinces-labels'] },
    { input: 'layer-bumps', layers: ['hazards-bumps'] },
    { input: 'layer-potholes', layers: ['hazards-potholes'] },
    { input: 'layer-other', layers: ['hazards-other'] },
  ];
  bindings.forEach(({ input, layers }) => {
    const el = document.getElementById(input);
    if (!el) return;
    el.addEventListener('change', () => {
      const visibility = el.checked ? 'visible' : 'none';
      layers.forEach(l => {
        if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', visibility);
      });
    });
  });
}

// ============ Filtros ============
function setupFilters() {
  ['filter-year', 'filter-vehicle', 'filter-province'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
      const key = id.replace('filter-', '');
      state.filters[key] = e.target.value;
      const panel = document.getElementById('mapPanel');
      panel.classList.add('panel-updated');
      setTimeout(() => panel.classList.remove('panel-updated'), 350);
      applyDataToMap();
    });
  });

  const resetBtn = document.getElementById('filter-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.filters = { year: '', vehicle: '', province: '' };
      document.getElementById('filter-year').value = '';
      document.getElementById('filter-vehicle').value = '';
      document.getElementById('filter-province').value = '';
      applyDataToMap();
    });
  }
}

// ============ Panel collapse ============
function setupPanelToggle() {
  const panel = document.getElementById('mapPanel');
  const toggle = document.getElementById('panelToggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    setTimeout(() => state.map && state.map.resize(), 260);
  });
}

// ============ Toast ============
let toastTimeout = null;
function showToast(msg, duration = 3500) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.hidden = true; }, duration);
}

// ============ Bootstrap ============
(async function bootstrap() {
  await loadSupabase();
  state.map = initMap();

  state.map.on('load', async () => {
    setupLayers(state.map);
    await loadData();
    setupPopups(state.map);
    setupReportClick(state.map);
    setupLayerToggles(state.map);
    setupFilters();
    setupPanelToggle();
    const rowCount = state.provincesRaw.length;
    showToast(`Mapa cargado · ${rowCount} filas · 32 provincias`);
  });
})();