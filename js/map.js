// =================================================================
// VialRD Map — Interactive map with hazards, reports, filters
// =================================================================

const PROVINCE_CENTROIDS = {
  'Azcona': [19.8862, -70.3023],
  'Baoruco': [18.0333, -71.6667],
  'Barahona': [18.2333, -71.1667],
  'Dajabon': [19.5667, -71.7],
  'Distrito Nacional': [18.4861, -69.9312],
  'Duarte': [19.2542, -70.3028],
  'Elias Pina': [19.0667, -71.6667],
  'Espaillat': [19.2742, -70.2647],
  'Hato Mayor': [18.9167, -69.2667],
  'Hermanas Mirabal': [19.1667, -70.35],
  'Independencia': [18.3167, -71.85],
  'La Altagracia': [18.5667, -68.4167],
  'La Romana': [18.4233, -68.9739],
  'La Vega': [19.2167, -70.5],
  'Maria Trinidad Sanchez': [19.35, -69.4167],
  'Monsenor Nouel': [19.1333, -70.4333],
  'Monte Cristi': [19.8642, -71.6453],
  'Monte Plata': [18.8167, -69.35],
  'Pedernales': [17.65, -71.7667],
  'Peravia': [18.85, -70.35],
  'Puerto Plata': [19.7939, -70.1636],
  'Samana': [19.2044, -69.3331],
  'San Cristobal': [18.4167, -70.1],
  'San Juan': [18.7833, -71.2333],
  'San Pedro de Macoris': [18.4667, -69.3],
  'Sanchez Ramirez': [19.1667, -70.15],
  'Santiago': [19.4517, -70.6961],
  'Santiago Rodriguez': [19.45, -71.3167],
  'Santo Domingo': [18.5, -69.9667],
  'Sese': [18.7667, -70.35],
  'Valverde': [19.6667, -71.6167],
  'Seibo': [18.75, -68.7]
};

let map;
let reportsLayer = null;
let pendingReports = [];
let activeFilters = {
  year: 'todos',
  vehicle: 'todos'
};

// =================================================================
// INIT
// =================================================================
async function initMap() {
  maplibregl.accessToken = window.__ENV.MAPBOX_TOKEN;
  
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [-69.9312, 18.4861],
    zoom: 8,
    pitch: 0,
    bearing: 0
  });

  map.on('load', async () => {
    console.log('[VialRD] Mapa cargado');
    await loadProvinceData();
    await loadReports();
    setupLayerToggles();
    setupFilters();
  });

  map.on('style.load', () => {
    // Agregar layers de hazards después de que el estilo carga
    addHazardLayers();
  });
}

// =================================================================
// LOAD PROVINCE DATA (DIGESETT)
// =================================================================
async function loadProvinceData() {
  try {
    // SELECT province × year con fatalities + motorcycle_fatalities
    const { data, error } = await window.supabaseClient
      .from('province_yearly_stats')
      .select('*')
      .order('province');

    if (error) {
      console.error('[VialRD] Error cargando province_yearly_stats:', error);
      useProvinceDataMock();
      return;
    }

    console.log(`[VialRD] ${data.length} filas province×year cargadas de Supabase`);
    
    // Agrupar por provincia y renderizar círculos
    const provinceStats = {};
    data.forEach(row => {
      if (!provinceStats[row.province]) {
        provinceStats[row.province] = { fatalities: 0, motorcycle_fatalities: 0 };
      }
      provinceStats[row.province].fatalities += row.fatalities || 0;
      provinceStats[row.province].motorcycle_fatalities += row.motorcycle_fatalities || 0;
    });

    // Renderizar círculos provinciales
    renderProvinceCircles(provinceStats);
  } catch (err) {
    console.error('[VialRD] Error en loadProvinceData:', err);
    useProvinceDataMock();
  }
}

function renderProvinceCircles(provinceStats) {
  Object.entries(provinceStats).forEach(([province, stats]) => {
    const centroid = PROVINCE_CENTROIDS[province] || [-69.9, 18.5];
    const isMotoOnly = activeFilters.vehicle === 'motocicleta';
    const value = isMotoOnly ? stats.motorcycle_fatalities : stats.fatalities;
    
    if (value > 0) {
      const radius = Math.sqrt(value) * 3;
      const color = value > 500 ? '#8b0000' : value > 250 ? '#d9534f' : '#e8a0a0';
      
      const div = document.createElement('div');
      div.style.width = (radius * 2) + 'px';
      div.style.height = (radius * 2) + 'px';
      div.style.backgroundColor = color;
      div.style.borderRadius = '50%';
      div.style.border = '2px solid rgba(255,255,255,0.3)';
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.justifyContent = 'center';
      div.style.fontSize = '12px';
      div.style.fontWeight = 'bold';
      div.style.color = '#fff';
      div.style.cursor = 'pointer';
      div.style.textShadow = '0 1px 3px rgba(0,0,0,0.7)';
      div.style.opacity = '0.85'; // Reducir opacity para que no tapen
      div.innerHTML = value.toLocaleString();
      
      const marker = new maplibregl.Marker(div)
        .setLngLat([centroid[1], centroid[0]])
        .addTo(map);
      
      marker.getElement().addEventListener('click', () => {
        showProvinceStats(province, stats);
      });
    }
  });
}

function showProvinceStats(province, stats) {
  const html = `
    <div class="popup-title">${province}</div>
    <div class="popup-meta">DIGESETT 2016-2026</div>
    <div class="popup-stat">${(activeFilters.vehicle === 'motocicleta' ? stats.motorcycle_fatalities : stats.fatalities).toLocaleString()}</div>
    <div class="popup-row">
      <span class="popup-row__label">Muertes totales:</span>
      <strong>${stats.fatalities.toLocaleString()}</strong>
    </div>
    <div class="popup-row">
      <span class="popup-row__label">Motoristas:</span>
      <strong>${stats.motorcycle_fatalities.toLocaleString()} (${(100 * stats.motorcycle_fatalities / stats.fatalities).toFixed(1)}%)</strong>
    </div>
  `;
  
  new maplibregl.Popup()
    .setHTML(html)
    .setLngLat([PROVINCE_CENTROIDS[province][1], PROVINCE_CENTROIDS[province][0]])
    .addTo(map);
}

function useProvinceDataMock() {
  console.warn('[VialRD] Usando datos mock de provincia');
  // Implementar fallback si es necesario
}

// =================================================================
// LOAD REPORTS (Con upvotes)
// =================================================================
async function loadReports() {
  try {
    const { data, error } = await window.supabaseClient
      .from('reports')
      .select('id, type, severity, latitude, longitude, description, created_at, status, vote_count')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[VialRD] Error cargando reportes:', error);
      return;
    }

    pendingReports = data || [];
    console.log(`[VialRD] ${pendingReports.length} reportes cargados`);
    
    // Renderizar reports en el mapa
    pendingReports.forEach(report => {
      if (report.latitude && report.longitude) {
        addReportMarker(report);
      }
    });

    // Actualizar stats en el sidebar
    updateReportStats();
  } catch (err) {
    console.error('[VialRD] Error en loadReports:', err);
  }
}

function addReportMarker(report) {
  // Color según status
  // pending = gris, verified = rojo
  const color = report.status === 'verified' ? '#e63946' : '#888888';
  const icon = report.type === 'bache' ? '🕳️' : '⚠️';
  
  const div = document.createElement('div');
  div.style.width = '36px';
  div.style.height = '36px';
  div.style.backgroundColor = color;
  div.style.borderRadius = '50%';
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.justifyContent = 'center';
  div.style.fontSize = '16px';
  div.style.cursor = 'pointer';
  div.style.border = '2px solid rgba(255,255,255,0.5)';
  div.style.opacity = '0.8'; // Reducir opacity para que no tapen números
  div.innerHTML = icon;
  
  const marker = new maplibregl.Marker(div)
    .setLngLat([report.longitude, report.latitude])
    .addTo(map);
  
  marker.getElement().addEventListener('click', () => {
    showReportPopup(report, marker);
  });
}

function showReportPopup(report, marker) {
  const voteProgress = `${report.vote_count || 0}/3`;
  const voteBar = '█'.repeat(report.vote_count || 0) + '░'.repeat(3 - (report.vote_count || 0));
  
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
      <strong>${new Date(report.created_at).toLocaleDateString()}</strong>
    </div>
    ${report.description ? `<div class="popup-desc" style="margin-top:8px;">"${report.description}"</div>` : ''}
  `;
  
  // Botón de confirmación (solo si pending y <3 votos)
  if (report.status !== 'verified') {
    html += `
      <div class="popup-confirm-section">
        <button class="popup-confirm-btn yes" data-report-id="${report.id}" data-response="yes">
          ✓ Sigue aquí
        </button>
        <button class="popup-confirm-btn no" data-report-id="${report.id}" data-response="no">
          ✗ No está
        </button>
      </div>
    `;
  }
  
  const popup = new maplibregl.Popup()
    .setHTML(html)
    .setLngLat([report.longitude, report.latitude])
    .addTo(map);
  
  // Event listeners para botones
  setTimeout(() => {
    document.querySelectorAll('.popup-confirm-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const reportId = parseInt(btn.dataset.reportId);
        const response = btn.dataset.response;
        await submitConfirmation(reportId, response, popup, marker);
      });
    });
  }, 100);
}

async function submitConfirmation(reportId, response, popup, marker) {
  try {
    // Llamar RPC add_report_confirmation
    const { data, error } = await window.supabaseClient.rpc('add_report_confirmation', {
      p_report_id: reportId,
      p_response: response
    });
    
    if (error) {
      console.error('[VialRD] Error registrando confirmación:', error);
      return;
    }
    
    console.log('[VialRD] Confirmación registrada:', data);
    
    // Reload del reporte
    const { data: updatedReport } = await window.supabaseClient
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();
    
    if (updatedReport) {
      // Actualizar marker color si cambió a verified
      if (updatedReport.status === 'verified') {
        marker.getElement().style.backgroundColor = '#e63946';
      }
      
      // Cerrar popup y reabrirlo con datos nuevos
      popup.remove();
      showReportPopup(updatedReport, marker);
      
      // Toast
      showToast(data.message);
    }
  } catch (err) {
    console.error('[VialRD] Error en submitConfirmation:', err);
    showToast('Error al registrar voto');
  }
}

function updateReportStats() {
  const pending = pendingReports.filter(r => r.status === 'pending').length;
  const verified = pendingReports.filter(r => r.status === 'verified').length;
  
  // Actualizar en el sidebar (si existe el elemento)
  const statsEl = document.querySelector('[data-stat="reports"]');
  if (statsEl) {
    statsEl.innerHTML = `${verified} verificados · ${pending} pendientes`;
  }
}

// =================================================================
// HAZARD LAYERS (Policías, baches)
// =================================================================
function addHazardLayers() {
  // Aquí va la lógica para agregar capas de hazards
  // (policías acostados, baches, etc.) desde tu API
  console.log('[VialRD] Hazard layers setup');
}

// =================================================================
// LAYER TOGGLES
// =================================================================
function setupLayerToggles() {
  document.querySelectorAll('.layer-toggle input').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const layerId = e.target.dataset.layer;
      const isVisible = e.target.checked;
      
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
      }
      
      console.log(`[VialRD] Layer ${layerId}: ${isVisible ? 'visible' : 'hidden'}`);
    });
  });
}

// =================================================================
// FILTERS
// =================================================================
function setupFilters() {
  const yearSelect = document.querySelector('[data-filter="year"]');
  const vehicleSelect = document.querySelector('[data-filter="vehicle"]');
  
  if (yearSelect) {
    yearSelect.addEventListener('change', (e) => {
      activeFilters.year = e.target.value;
      applyFilters();
    });
  }
  
  if (vehicleSelect) {
    vehicleSelect.addEventListener('change', (e) => {
      activeFilters.vehicle = e.target.value;
      applyFilters();
    });
  }
  
  const resetBtn = document.querySelector('.filter-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      activeFilters.year = 'todos';
      activeFilters.vehicle = 'todos';
      if (yearSelect) yearSelect.value = 'todos';
      if (vehicleSelect) vehicleSelect.value = 'todos';
      applyFilters();
    });
  }
}

async function applyFilters() {
  // Re-cargar datos y renderizar con filtros aplicados
  await loadProvinceData();
  
  // Flash visual del panel
  const panel = document.querySelector('.map-panel');
  if (panel) {
    panel.classList.add('panel-updated');
    setTimeout(() => panel.classList.remove('panel-updated'), 350);
  }
}

// =================================================================
// UTILS
// =================================================================
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// =================================================================
// INIT ON LOAD
// =================================================================
document.addEventListener('DOMContentLoaded', initMap);
