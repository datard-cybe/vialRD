// ===========================================================
// VialRD — Lógica del mapa interactivo (v2 — filtros reactivos)
// MapLibre GL JS + OpenStreetMap tiles + Supabase
// ===========================================================

// ============ Centroides de las 32 provincias ============
// (lng, lat aproximados del centro geográfico de cada provincia)
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

// ============ Mock fallback (si Supabase está vacío) ============
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
  provincesRaw: [],       // [{ province, year, fatalities, motorcycle_fatalities }, ...]
  hazards: [],
  filters: { year: '2025', vehicle: 'motocicleta', province: '' },
  pendingReportLocation: null,
  // Cache de últimos valores para animar contadores
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

// ============ Sources y layers ============
function setupLayers(map) {
  // Provincias
  map.addSource('provinces', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

  map.addLayer({
    id: 'provinces-circles',
    type: 'circle',
    source: 'provinces',
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['get', 'fatalities'],
        0, 6, 50, 14, 200, 24, 500, 38, 1000, 55, 3000, 80
      ],
      'circle-color': [
        'interpolate', ['linear'], ['get', 'fatalities'],
        0, '#f4c430', 100, '#ff8c42', 500, '#e63946', 2000, '#8b0000'
      ],
      'circle-opacity': 0.65,
      'circle-stroke-color': '#0a0a0a',
      'circle-stroke-width': 1.5,
      // Transición suave al cambiar radio/color cuando se actualiza la data
      'circle-radius-transition': { duration: 400 },
      'circle-color-transition': { duration: 400 },
    }
  });

  map.addLayer({
    id: 'provinces-labels',
    type: 'symbol',
    source: 'provinces',
    layout: {
      'text-field': ['to-string', ['get', 'fatalities']],
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
      'text-size': [
        'interpolate', ['linear'], ['get', 'fatalities'],
        0, 11, 500, 14, 2000, 18
      ],
      'text-allow-overlap': true,
      'text-ignore-placement': true
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#0a0a0a',
      'text-halo-width': 1.5
    }
  });

  // Incidentes individuales (placeholder, podría conectarse a tabla `accidents_official`)
  map.addSource('deaths', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'deaths-heat',
    type: 'heatmap',
    source: 'deaths',
    maxzoom: 14,
    layout: { visibility: 'none' },
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 6, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 14, 3],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.2, 'rgba(244,196,48,0.4)',
        0.5, 'rgba(255,140,66,0.7)',
        0.8, 'rgba(230,57,70,0.85)',
        1,   'rgba(184,35,47,1)'
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 14, 50],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 12, 1, 14, 0.4]
    }
  });
  map.addLayer({
    id: 'deaths-points',
    type: 'circle',
    source: 'deaths',
    minzoom: 11,
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 4, 18, 12],
      'circle-color': '#e63946',
      'circle-stroke-color': '#0a0a0a',
      'circle-stroke-width': 1.5,
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.5, 14, 1]
    }
  });

  // Hazards ciudadanos
  map.addSource('hazards', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'hazards-bumps',
    type: 'circle',
    source: 'hazards',
    filter: ['==', ['get', 'type'], 'policia_acostado_no_senalizado'],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 4, 16, 14],
      'circle-color': '#f4c430',
      'circle-stroke-color': '#0a0a0a',
      'circle-stroke-width': 2,
    }
  });
  map.addLayer({
    id: 'hazards-potholes',
    type: 'circle',
    source: 'hazards',
    filter: ['==', ['get', 'type'], 'bache'],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 4, 16, 12],
      'circle-color': '#ff8c42',
      'circle-stroke-color': '#0a0a0a',
      'circle-stroke-width': 2,
    }
  });
  map.addLayer({
    id: 'hazards-other',
    type: 'circle',
    source: 'hazards',
    filter: ['!in', 'type', 'policia_acostado_no_senalizado', 'bache'],
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 3, 16, 10],
      'circle-color': '#888',
      'circle-stroke-color': '#0a0a0a',
      'circle-stroke-width': 2,
    }
  });
}

// ============ Cargar datos (Supabase o mock) ============
async function loadData() {
  // Cargar TODAS las filas de province_yearly_stats sin agregar
  if (supabaseAPI) {
    try {
      const { data, error } = await supabaseAPI.supabase
        .from('province_yearly_stats')
        .select('province, year, fatalities, motorcycle_fatalities')
        .order('year', { ascending: false });

      if (!error && data && data.length > 0) {
        state.provincesRaw = data;
        console.log(`[VialRD] ${data.length} filas province×year cargadas`);
      }
    } catch (e) {
      console.warn('[VialRD] Error cargando province_yearly_stats:', e.message);
    }

    // Hazards crowdsourced
    try {
      const hazards = await supabaseAPI.getHazardsInBbox([-72.1, 17.4, -68.2, 20.1]);
      if (hazards && hazards.length > 0) {
        state.hazards = hazards.map(h => ({
          lng: h.lng, lat: h.lat, type: h.type, desc: h.description,
          severity: h.severity, province: h.province
        }));
      }
    } catch (e) {
      console.warn('[VialRD] Error cargando hazards:', e.message);
    }
  }

  // Fallback a mock si no hay nada
  if (state.provincesRaw.length === 0) state.provincesRaw = [...MOCK_PROVINCES_YEARLY];
  if (state.hazards.length === 0) state.hazards = [...MOCK_HAZARDS];

  applyDataToMap();
}

// ============ FILTROS REACTIVOS — corazón del refactor ============
function applyDataToMap() {
  const { year, vehicle, province } = state.filters;
  const yearNum = year ? parseInt(year, 10) : null;
  const isMotoOnly = vehicle === 'motocicleta';

  // 1) Filtrar filas raw por año y provincia
  let filtered = state.provincesRaw;
  if (yearNum) filtered = filtered.filter(p => p.year === yearNum);
  if (province) filtered = filtered.filter(p => p.province === province);

  // 2) Agrupar por provincia (sumar años si no hay filtro de año)
  const grouped = {};
  filtered.forEach(p => {
    if (!grouped[p.province]) {
      grouped[p.province] = {
        province: p.province,
        fatalities: 0,
        motorcycle_fatalities: 0,
        years_count: 0
      };
    }
    grouped[p.province].fatalities += p.fatalities || 0;
    grouped[p.province].motorcycle_fatalities += p.motorcycle_fatalities || 0;
    grouped[p.province].years_count += 1;
  });

  // 3) Decidir qué valor mostrar según filtro de vehículo
  const valueKey = isMotoOnly ? 'motorcycle_fatalities' : 'fatalities';

  // 4) Convertir a GeoJSON usando centroides
  const features = Object.values(grouped)
    .map(g => {
      const centroid = PROVINCE_CENTROIDS[g.province];
      if (!centroid) return null;
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [centroid.lng, centroid.lat] },
        properties: {
          province: g.province,
          fatalities: g[valueKey], // este es el que pinta el círculo
          fatalities_total: g.fatalities,
          motorcycle_fatalities: g.motorcycle_fatalities,
          moto_share: g.fatalities > 0 ? (g.motorcycle_fatalities / g.fatalities) : 0,
          years_count: g.years_count,
          year_filter: yearNum,
          vehicle_filter: vehicle || 'todos'
        }
      };
    })
    .filter(Boolean);

  const provincesGeo = { type: 'FeatureCollection', features };

  // 5) Hazards
  let hazardsFiltered = state.hazards;
  if (province) {
    hazardsFiltered = hazardsFiltered.filter(h => !h.province || h.province === province);
  }
  const hazardsGeo = {
    type: 'FeatureCollection',
    features: hazardsFiltered.map(h => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [h.lng, h.lat] },
      properties: h
    }))
  };

  // 6) Aplicar a sources
  if (state.map.getSource('provinces')) state.map.getSource('provinces').setData(provincesGeo);
  if (state.map.getSource('hazards')) state.map.getSource('hazards').setData(hazardsGeo);

  // 7) MÉTRICAS REACTIVAS ===============================
  const totalVisible = features.reduce((s, f) => s + (f.properties.fatalities || 0), 0);
  const totalFat = features.reduce((s, f) => s + (f.properties.fatalities_total || 0), 0);
  const totalMoto = features.reduce((s, f) => s + (f.properties.motorcycle_fatalities || 0), 0);

  // Provincia con más muertes (según el valueKey activo)
  const topProvince = features
    .slice()
    .sort((a, b) => b.properties.fatalities - a.properties.fatalities)[0];

  // % motoristas
  const motoPct = totalFat > 0 ? (totalMoto / totalFat * 100) : 0;

  // Hazards por tipo
  const bumpsCount = hazardsFiltered.filter(h => h.type === 'policia_acostado_no_senalizado').length;
  const potholesCount = hazardsFiltered.filter(h => h.type === 'bache').length;
  const otherCount = hazardsFiltered.filter(h => !['policia_acostado_no_senalizado', 'bache'].includes(h.type)).length;

  // Pintar sidebar
  animateNumber('count-provinces', totalVisible);
  animateNumber('count-deaths', 0); // futuro: cuando haya tabla accidents_official con coords
  setText('count-bumps', bumpsCount);
  setText('count-potholes', potholesCount);
  setText('count-other', otherCount);

  animateNumber('stat-visible-deaths', totalVisible);
  setText('stat-visible-hazards', hazardsFiltered.length);

  // Nuevas mini-stats reactivas (si existen en el DOM)
  setText('stat-top-province', topProvince ? topProvince.properties.province : '—');
  setText('stat-top-province-value', topProvince ? topProvince.properties.fatalities.toLocaleString('es-DO') : '—');
  setText('stat-moto-pct', totalFat > 0 ? motoPct.toFixed(1) + '%' : '—');

  // Contexto del filtro activo (texto legible)
  const filterCtx = [];
  if (yearNum) filterCtx.push(`año ${yearNum}`); else filterCtx.push('2016-2026');
  if (isMotoOnly) filterCtx.push('motoristas');
  else if (vehicle) filterCtx.push(vehicle);
  else filterCtx.push('todos los vehículos');
  if (province) filterCtx.push(province);
  setText('stat-filter-context', filterCtx.join(' · '));

  // Si filtra por provincia, hacer zoom a esa
  if (province && features.length === 1) {
    const c = features[0].geometry.coordinates;
    state.map.flyTo({ center: c, zoom: 9.5, duration: 800 });
  } else if (!province) {
    // Volver a vista nacional si quita filtro de provincia
    // (solo si estaba con zoom alto)
    if (state.map.getZoom() > 8.5) {
      state.map.flyTo({ center: [-70.16, 18.74], zoom: 7.4, duration: 800 });
    }
  }
}

// ============ Popups al hacer click ============
function setupPopups(map) {
  // Popup provincias — muestra info reactiva al filtro actual
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
    { input: 'layer-deaths', layers: ['deaths-heat', 'deaths-points'] },
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

// ============ Filtros (año, vehículo, provincia) ============
function setupFilters() {
  ['filter-year', 'filter-vehicle', 'filter-province'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
      const key = id.replace('filter-', '');
      state.filters[key] = e.target.value;
      // Flash visual en el panel para feedback
      const panel = document.getElementById('mapPanel');
      panel.classList.add('panel-updated');
      setTimeout(() => panel.classList.remove('panel-updated'), 350);
      applyDataToMap();
    });
  });

  // Botón "Limpiar filtros" si existe
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
