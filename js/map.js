// ===========================================================
// VialRD — Lógica del mapa interactivo
// MapLibre GL JS + OpenStreetMap tiles + Supabase
// ===========================================================

// Datos mock para demo cuando Supabase está vacío.
// Coordenadas REALES en zonas de alta mortalidad vial (todas en tierra firme).
const MOCK_DEATHS = [
  // Distrito Nacional — Av. 27 de Febrero, Independencia, Kennedy, Máximo Gómez, Tiradentes
  { lng: -69.9312, lat: 18.4861, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Distrito Nacional' },
  { lng: -69.9404, lat: 18.4825, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Distrito Nacional' },
  { lng: -69.9189, lat: 18.4912, fatalities: 1, vehicle: 'motocicleta', year: 2024, province: 'Distrito Nacional' },
  { lng: -69.9215, lat: 18.4789, fatalities: 1, vehicle: 'motocicleta', year: 2024, province: 'Distrito Nacional' },
  { lng: -69.9533, lat: 18.4923, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Distrito Nacional' },
  { lng: -69.9176, lat: 18.5108, fatalities: 1, vehicle: 'peaton', year: 2025, province: 'Distrito Nacional' },
  { lng: -69.9001, lat: 18.4945, fatalities: 1, vehicle: 'automovil', year: 2025, province: 'Distrito Nacional' },
  { lng: -69.9456, lat: 18.4712, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Distrito Nacional' },
  // Santo Domingo Este — Autopista Las Américas, Av. España, San Vicente
  { lng: -69.8745, lat: 18.4920, fatalities: 2, vehicle: 'motocicleta', year: 2025, province: 'Santo Domingo' },
  { lng: -69.8567, lat: 18.5022, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Santo Domingo' },
  { lng: -69.8421, lat: 18.4985, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Santo Domingo' },
  { lng: -69.8123, lat: 18.5189, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Santo Domingo' },
  { lng: -69.7890, lat: 18.5212, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Santo Domingo' },
  { lng: -69.7641, lat: 18.5134, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Santo Domingo' },
  // Santo Domingo Norte — Av. Charles de Gaulle, Hainamosa
  { lng: -69.8923, lat: 18.5534, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Santo Domingo' },
  { lng: -69.9089, lat: 18.5489, fatalities: 1, vehicle: 'motocicleta', year: 2024, province: 'Santo Domingo' },
  { lng: -69.8623, lat: 18.5612, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Santo Domingo' },
  // Santiago
  { lng: -70.6970, lat: 19.4517, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Santiago' },
  { lng: -70.7124, lat: 19.4612, fatalities: 1, vehicle: 'motocicleta', year: 2024, province: 'Santiago' },
  { lng: -70.6855, lat: 19.4720, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Santiago' },
  { lng: -70.7223, lat: 19.4423, fatalities: 1, vehicle: 'automovil', year: 2025, province: 'Santiago' },
  { lng: -70.6788, lat: 19.4815, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Santiago' },
  // La Vega
  { lng: -70.5208, lat: 19.2226, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'La Vega' },
  { lng: -70.5331, lat: 19.2104, fatalities: 1, vehicle: 'motocicleta', year: 2024, province: 'La Vega' },
  // Puerto Plata
  { lng: -70.6970, lat: 19.7892, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Puerto Plata' },
  { lng: -70.6845, lat: 19.7755, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Puerto Plata' },
  // San Cristóbal
  { lng: -70.1042, lat: 18.4178, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'San Cristóbal' },
  { lng: -70.1234, lat: 18.4256, fatalities: 1, vehicle: 'motocicleta', year: 2024, province: 'San Cristóbal' },
  // La Romana
  { lng: -68.9728, lat: 18.4276, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'La Romana' },
  { lng: -68.9612, lat: 18.4189, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'La Romana' },
  // San Pedro
  { lng: -69.3066, lat: 18.4539, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'San Pedro de Macorís' },
  { lng: -69.3145, lat: 18.4602, fatalities: 1, vehicle: 'motocicleta', year: 2024, province: 'San Pedro de Macorís' },
  // Higüey
  { lng: -68.7058, lat: 18.6155, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'La Altagracia' },
  // Baní
  { lng: -70.3320, lat: 18.2810, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Peravia' },
  // Azua
  { lng: -70.7350, lat: 18.4534, fatalities: 1, vehicle: 'motocicleta', year: 2024, province: 'Azua' },
  // Barahona
  { lng: -71.1000, lat: 18.2117, fatalities: 1, vehicle: 'motocicleta', year: 2025, province: 'Barahona' },
];

const MOCK_HAZARDS = [
  // Policías acostados sin señalizar — todos en avenidas/calles reales en tierra firme
  { lng: -69.9320, lat: 18.4865, type: 'policia_acostado_no_senalizado', desc: 'Policía acostado sin pintar, casi invisible de noche', severity: 4 },
  { lng: -69.9105, lat: 18.4912, type: 'policia_acostado_no_senalizado', desc: 'Tres reductores seguidos sin advertencia previa', severity: 5 },
  { lng: -69.8745, lat: 18.4880, type: 'policia_acostado_no_senalizado', desc: 'Muy alto, daña suspensión', severity: 4 },
  { lng: -69.9510, lat: 18.4910, type: 'policia_acostado_no_senalizado', desc: 'Sin señalización ni pintura', severity: 3 },
  { lng: -70.6920, lat: 19.4520, type: 'policia_acostado_no_senalizado', desc: 'Cerca de escuela pero sin marcar', severity: 4 },
  { lng: -69.8590, lat: 18.5040, type: 'policia_acostado_no_senalizado', desc: 'En curva, peligroso de noche', severity: 5 },
  { lng: -69.9220, lat: 18.4830, type: 'policia_acostado_no_senalizado', desc: 'Improvisado con concreto', severity: 4 },
  // Baches
  { lng: -69.9180, lat: 18.4820, type: 'bache', desc: 'Hueco profundo en carril derecho', severity: 4 },
  { lng: -69.9402, lat: 18.4855, type: 'bache', desc: 'Bache grande, se ha tragado motoristas', severity: 5 },
  { lng: -69.8950, lat: 18.4956, type: 'bache', desc: 'Múltiples baches en cadena', severity: 3 },
  { lng: -70.7050, lat: 19.4580, type: 'bache', desc: 'Hueco que retiene agua, no se ve', severity: 4 },
  { lng: -69.8470, lat: 18.4910, type: 'bache', desc: 'Bache sobre tapa de alcantarilla', severity: 4 },
  { lng: -69.9085, lat: 18.4756, type: 'bache', desc: 'En avenida principal, sin reparar 6 meses', severity: 3 },
  // Otros
  { lng: -69.9012, lat: 18.4789, type: 'cruce_peligroso', desc: 'Cruce sin semáforo, alta mortalidad', severity: 5 },
  { lng: -69.8801, lat: 18.4912, type: 'semaforo_danado', desc: 'Solo parpadea amarillo desde hace semanas', severity: 3 },
  { lng: -69.9421, lat: 18.4823, type: 'zona_oscura', desc: 'Sin alumbrado en 200m', severity: 4 },
];

// ============ Estado global ============
const state = {
  map: null,
  deaths: [],
  hazards: [],
  provinces: [],
  filters: { year: '2025', vehicle: 'motocicleta', province: '' },
  visibleLayers: { provinces: true, deaths: false, bumps: true, potholes: true, other: false },
  pendingReportLocation: null,
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
      // Glyphs para etiquetas — usamos un servidor público gratuito
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    },
    center: [-70.16, 18.74], // Centro RD
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
  // ===== Source: provincias (datos oficiales DIGESETT) =====
  map.addSource('provinces', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  // Círculos proporcionales al número de muertes
  map.addLayer({
    id: 'provinces-circles',
    type: 'circle',
    source: 'provinces',
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['get', 'fatalities'],
        0, 6,
        50, 14,
        200, 24,
        500, 38,
        1000, 55,
        3000, 80
      ],
      'circle-color': [
        'interpolate', ['linear'], ['get', 'fatalities'],
        0, '#f4c430',     // amarillo
        100, '#ff8c42',   // naranja
        500, '#e63946',   // rojo
        2000, '#8b0000'   // rojo oscuro
      ],
      'circle-opacity': 0.65,
      'circle-stroke-color': '#0a0a0a',
      'circle-stroke-width': 1.5
    }
  });

  // Etiqueta numérica encima del círculo
  map.addLayer({
    id: 'provinces-labels',
    type: 'symbol',
    source: 'provinces',
    layout: {
      'text-field': ['to-string', ['get', 'fatalities']],
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
      'text-size': [
        'interpolate', ['linear'], ['get', 'fatalities'],
        0, 11,
        500, 14,
        2000, 18
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

  // ===== Source: muertes individuales (incidentes geo) =====
  map.addSource('deaths', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  // Heatmap layer (desactivado por defecto, opcional)
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
        0.2, 'rgba(244,196,48,0.4)',  // amarillo tenue
        0.5, 'rgba(255,140,66,0.7)',  // naranja
        0.8, 'rgba(230,57,70,0.85)',  // rojo
        1,   'rgba(184,35,47,1)'      // rojo oscuro
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 14, 50],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 12, 1, 14, 0.4]
    }
  });

  // Points individuales (visibles solo en zoom alto)
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

  // ===== Source: hazards ciudadanos =====
  map.addSource('hazards', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  // Pines diferenciados por tipo
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
    layout: { visibility: 'none' }, // off por defecto
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 3, 16, 10],
      'circle-color': '#888',
      'circle-stroke-color': '#0a0a0a',
      'circle-stroke-width': 2,
    }
  });
}

// ============ Cargar datos a las sources ============
function applyDataToMap() {
  // Provincias agregadas (DIGESETT)
  const yearNum = state.filters.year ? parseInt(state.filters.year, 10) : null;
  const provincesFiltered = state.provinces.filter(p => {
    if (yearNum && p.year && p.year !== yearNum) return false;
    return true;
  });

  // Agrupar por provincia si filtramos año, si no usamos los totales precomputados
  const provincesAgg = {};
  provincesFiltered.forEach(p => {
    if (!provincesAgg[p.province]) {
      provincesAgg[p.province] = { ...p, fatalities: 0 };
    }
    provincesAgg[p.province].fatalities += p.fatalities;
  });

  const provincesGeo = {
    type: 'FeatureCollection',
    features: Object.values(provincesAgg).map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: p
    }))
  };

  // Incidentes individuales
  const filteredDeaths = state.deaths.filter(d => {
    if (state.filters.year && String(d.year) !== state.filters.year) return false;
    if (state.filters.vehicle && d.vehicle !== state.filters.vehicle) return false;
    if (state.filters.province && d.province !== state.filters.province) return false;
    return true;
  });

  const deathsGeo = {
    type: 'FeatureCollection',
    features: filteredDeaths.map(d => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
      properties: { ...d, weight: d.fatalities || 1 }
    }))
  };

  const hazardsGeo = {
    type: 'FeatureCollection',
    features: state.hazards.map(h => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [h.lng, h.lat] },
      properties: h
    }))
  };

  if (state.map.getSource('provinces')) state.map.getSource('provinces').setData(provincesGeo);
  if (state.map.getSource('deaths')) state.map.getSource('deaths').setData(deathsGeo);
  if (state.map.getSource('hazards')) state.map.getSource('hazards').setData(hazardsGeo);

  // Contadores en sidebar
  const totalFatalitiesVisible = Object.values(provincesAgg).reduce((s, p) => s + p.fatalities, 0);
  document.getElementById('count-provinces').textContent = totalFatalitiesVisible.toLocaleString('es-DO');
  document.getElementById('count-deaths').textContent = filteredDeaths.length.toLocaleString('es-DO');
  document.getElementById('count-bumps').textContent =
    state.hazards.filter(h => h.type === 'policia_acostado_no_senalizado').length;
  document.getElementById('count-potholes').textContent =
    state.hazards.filter(h => h.type === 'bache').length;
  document.getElementById('count-other').textContent =
    state.hazards.filter(h => !['policia_acostado_no_senalizado','bache'].includes(h.type)).length;

  document.getElementById('stat-visible-deaths').textContent = totalFatalitiesVisible.toLocaleString('es-DO');
  document.getElementById('stat-visible-hazards').textContent = state.hazards.length;
}

// Mock provincial fallback (números aproximados basados en DIGESETT 2024)
const MOCK_PROVINCES = [
  { province: 'Distrito Nacional', year: 2025, lng: -69.9312, lat: 18.4861, fatalities: 168 },
  { province: 'Santo Domingo',     year: 2025, lng: -69.8571, lat: 18.5001, fatalities: 312 },
  { province: 'Santiago',          year: 2025, lng: -70.6970, lat: 19.4517, fatalities: 245 },
  { province: 'La Vega',           year: 2025, lng: -70.5331, lat: 19.2226, fatalities: 122 },
  { province: 'San Cristóbal',     year: 2025, lng: -70.1042, lat: 18.4178, fatalities: 105 },
  { province: 'Puerto Plata',      year: 2025, lng: -70.6970, lat: 19.7892, fatalities: 89 },
  { province: 'Duarte',            year: 2025, lng: -70.2547, lat: 19.2950, fatalities: 72 },
  { province: 'San Pedro de Macorís', year: 2025, lng: -69.3066, lat: 18.4539, fatalities: 78 },
  { province: 'La Romana',         year: 2025, lng: -68.9728, lat: 18.4276, fatalities: 64 },
  { province: 'La Altagracia',     year: 2025, lng: -68.7058, lat: 18.6155, fatalities: 81 },
  { province: 'Peravia',           year: 2025, lng: -70.3320, lat: 18.2810, fatalities: 51 },
  { province: 'Azua',              year: 2025, lng: -70.7350, lat: 18.4534, fatalities: 56 },
  { province: 'Barahona',          year: 2025, lng: -71.1000, lat: 18.2117, fatalities: 42 },
  { province: 'Monseñor Nouel',    year: 2025, lng: -70.4082, lat: 18.9347, fatalities: 48 },
  { province: 'Sánchez Ramírez',   year: 2025, lng: -70.0500, lat: 19.0670, fatalities: 38 },
  { province: 'San Juan',          year: 2025, lng: -71.2295, lat: 18.8074, fatalities: 47 },
  { province: 'Espaillat',         year: 2025, lng: -70.5152, lat: 19.5475, fatalities: 41 },
  { province: 'Hermanas Mirabal',  year: 2025, lng: -70.3678, lat: 19.3725, fatalities: 23 },
  { province: 'Valverde',          year: 2025, lng: -70.8950, lat: 19.5650, fatalities: 36 },
  { province: 'Monte Cristi',      year: 2025, lng: -71.6500, lat: 19.8500, fatalities: 28 },
  { province: 'Dajabón',           year: 2025, lng: -71.7000, lat: 19.5500, fatalities: 19 },
  { province: 'Santiago Rodríguez',year: 2025, lng: -71.3380, lat: 19.4625, fatalities: 14 },
  { province: 'Samaná',            year: 2025, lng: -69.3370, lat: 19.2070, fatalities: 32 },
  { province: 'María Trinidad Sánchez', year: 2025, lng: -69.8500, lat: 19.3917, fatalities: 29 },
  { province: 'Hato Mayor',        year: 2025, lng: -69.2536, lat: 18.7625, fatalities: 25 },
  { province: 'El Seibo',          year: 2025, lng: -69.0397, lat: 18.7647, fatalities: 24 },
  { province: 'Monte Plata',       year: 2025, lng: -69.7848, lat: 18.8074, fatalities: 36 },
  { province: 'San José de Ocoa',  year: 2025, lng: -70.5042, lat: 18.5447, fatalities: 18 },
  { province: 'Bahoruco',          year: 2025, lng: -71.4244, lat: 18.5099, fatalities: 21 },
  { province: 'Independencia',     year: 2025, lng: -71.7250, lat: 18.4942, fatalities: 13 },
  { province: 'Pedernales',        year: 2025, lng: -71.7497, lat: 17.9942, fatalities: 8 },
  { province: 'Elías Piña',        year: 2025, lng: -71.7036, lat: 18.8775, fatalities: 17 },
];

// ============ Cargar datos (Supabase o mock) ============
async function loadData() {
  // Intentar Supabase primero - provincias
  if (supabaseAPI) {
    try {
      const { data, error } = await supabaseAPI.supabase.rpc('get_province_heatmap', { year_filter: null });
      if (!error && data && data.length > 0) {
        state.provinces = data.map(d => ({
          province: d.province,
          year: null,
          lng: d.lng,
          lat: d.lat,
          fatalities: d.fatalities,
          years_count: d.years_count
        }));
        console.log(`[VialRD] ${data.length} provincias cargadas de Supabase`);
      }
    } catch (e) {
      console.warn('[VialRD] No se pudieron cargar provincias de Supabase:', e.message);
    }

    // Hazards crowdsourced
    try {
      const hazards = await supabaseAPI.getHazardsInBbox([-72.1, 17.4, -68.2, 20.1]);
      if (hazards && hazards.length > 0) {
        state.hazards = hazards.map(h => ({
          lng: h.lng, lat: h.lat, type: h.type, desc: h.description, severity: h.severity
        }));
      }
    } catch (e) {
      console.warn('[VialRD] Error cargando hazards:', e.message);
    }
  }

  // Fallback a mock
  if (state.provinces.length === 0) state.provinces = [...MOCK_PROVINCES];
  if (state.deaths.length === 0) state.deaths = [...MOCK_DEATHS];
  if (state.hazards.length === 0) state.hazards = [...MOCK_HAZARDS];

  applyDataToMap();
}

// ============ Popups al hacer click ============
function setupPopups(map) {
  // Popup en círculos de provincia
  map.on('click', 'provinces-circles', (e) => {
    const f = e.features[0];
    const p = f.properties;
    const yearTxt = state.filters.year ? `año ${state.filters.year}` : '2016-2026 (acumulado)';
    new maplibregl.Popup({ closeButton: true, maxWidth: '320px' })
      .setLngLat(e.lngLat)
      .setHTML(`
        <div class="popup-title">Provincia: ${p.province}</div>
        <div class="popup-meta">${yearTxt}</div>
        <div class="popup-stat">${Number(p.fatalities).toLocaleString('es-DO')} fallecidos</div>
        <div class="popup-desc" style="margin-top:6px">
          Total de muertes viales en <strong>toda la provincia</strong>,
          no en este punto específico. El círculo está ubicado en el centro geográfico.
        </div>
        <div class="popup-desc" style="margin-top:8px; font-size:0.75rem; opacity:0.65; border-top:1px solid #333; padding-top:6px">
          Fuente: DIGESETT / Opsevi · datos.gob.do
        </div>
      `)
      .addTo(map);
  });
  // Popup en muertes (zoom alto)
  map.on('click', 'deaths-points', (e) => {
    const f = e.features[0];
    const p = f.properties;
    new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
      .setLngLat(e.lngLat)
      .setHTML(`
        <div class="popup-title">Muerte vial</div>
        <div class="popup-meta">${p.province} · ${p.year}</div>
        <div class="popup-stat">${p.fatalities} ${p.fatalities === 1 ? 'fallecido' : 'fallecidos'}</div>
        <div class="popup-desc">Vehículo: <strong>${p.vehicle}</strong></div>
        <div class="popup-desc" style="margin-top:6px; font-size:0.78rem; opacity:0.7">Fuente: Opsevi / DIGESETT</div>
      `)
      .addTo(map);
  });

  // Popup en hazards
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

  // Cursor pointer al hover
  ['provinces-circles', 'deaths-points', ...hazardLayers].forEach(layerId => {
    map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
  });
}

// ============ "Reportar aquí" — click en mapa ============
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

    // Redirigir a /reportar.html con coords en query string
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
    document.getElementById(id).addEventListener('change', (e) => {
      const key = id.replace('filter-', '');
      state.filters[key] = e.target.value;
      applyDataToMap();
    });
  });
}

// ============ Panel collapse ============
function setupPanelToggle() {
  const panel = document.getElementById('mapPanel');
  document.getElementById('panelToggle').addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    setTimeout(() => state.map && state.map.resize(), 260);
  });
}

// ============ Toast helper ============
let toastTimeout = null;
function showToast(msg, duration = 3500) {
  const toast = document.getElementById('toast');
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
    showToast(`Mapa cargado · ${state.deaths.length} muertes · ${state.hazards.length} hazards`);
  });
})();
