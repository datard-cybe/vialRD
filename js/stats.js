// ===========================================================
// VialRD — Dashboard de estadísticas
// Chart.js + Supabase · fallback a datos documentados
// ===========================================================

// ============ Paleta editorial (alineada al design system) ============
const PALETTE = {
  accent:      '#e63946',  // rojo de alerta
  accentDark:  '#b8232f',
  accentLight: '#ff6b76',
  yellow:      '#f4c430',
  yellowDark:  '#c89e1f',
  orange:      '#ff8c42',
  ink:         '#0a0a0a',
  inkSoft:     '#2a2a28',
  inkMute:     '#6b6a64',
  line:        '#d8d4ca',
  bg:          '#fafaf7',
  green:       '#2a9d8f',
};

// Set de colores cualitativos para charts categóricos
const CHART_COLORS = [
  PALETTE.accent,
  PALETTE.yellow,
  PALETTE.orange,
  PALETTE.inkSoft,
  PALETTE.green,
  PALETTE.accentDark,
  PALETTE.yellowDark,
  PALETTE.inkMute,
];

// ============ Chart.js defaults ============
if (typeof Chart !== 'undefined') {
  Chart.defaults.font.family = "'IBM Plex Sans', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = PALETTE.inkSoft;
  Chart.defaults.borderColor = PALETTE.line;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.plugins.legend.labels.padding = 14;
  Chart.defaults.plugins.tooltip.backgroundColor = PALETTE.ink;
  Chart.defaults.plugins.tooltip.titleColor = PALETTE.bg;
  Chart.defaults.plugins.tooltip.bodyColor = PALETTE.bg;
  Chart.defaults.plugins.tooltip.cornerRadius = 0;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.titleFont = { weight: '600', size: 12 };
  Chart.defaults.animation.duration = 600;
}

// ============ Mock data — basado en seed_known_data.py ============
// Si Supabase falla, usamos estos datos documentados (mismas distribuciones)
const NATIONAL_TOTALS_BY_YEAR = {
  2016: 2750, 2017: 2920, 2018: 3127, 2019: 3204, 2020: 2711,
  2021: 2845, 2022: 2950, 2023: 3010, 2024: 2987, 2025: 2992, 2026: 640
};

const MOCK_PROVINCE_PROPORTIONS = {
  'Santo Domingo': 0.180, 'Distrito Nacional': 0.090, 'Santiago': 0.125,
  'La Vega': 0.060, 'San Cristóbal': 0.055, 'Puerto Plata': 0.047,
  'La Altagracia': 0.042, 'San Pedro de Macorís': 0.040, 'Duarte': 0.038,
  'La Romana': 0.031, 'Azua': 0.026, 'Peravia': 0.025,
  'Monseñor Nouel': 0.022, 'San Juan': 0.022, 'Barahona': 0.020,
  'Espaillat': 0.019, 'Sánchez Ramírez': 0.018, 'Valverde': 0.017,
  'Monte Plata': 0.016, 'Samaná': 0.013, 'María Trinidad Sánchez': 0.012,
  'Hato Mayor': 0.011, 'Monte Cristi': 0.011, 'El Seibo': 0.010,
  'Hermanas Mirabal': 0.009, 'Bahoruco': 0.009, 'San José de Ocoa': 0.008,
  'Dajabón': 0.008, 'Independencia': 0.006, 'Santiago Rodríguez': 0.006,
  'Elías Piña': 0.006, 'Pedernales': 0.004,
};

const MOCK_MES_PCT = {
  'Enero': 0.085, 'Febrero': 0.075, 'Marzo': 0.085, 'Abril': 0.092,
  'Mayo': 0.082, 'Junio': 0.078, 'Julio': 0.083, 'Agosto': 0.085,
  'Septiembre': 0.078, 'Octubre': 0.082, 'Noviembre': 0.083, 'Diciembre': 0.092
};

const MOCK_DIA_PCT = {
  'Domingo': 0.245, 'Sábado': 0.180, 'Lunes': 0.145, 'Viernes': 0.135,
  'Martes': 0.105, 'Miércoles': 0.095, 'Jueves': 0.095,
};

const MOCK_HORA_PCT = {
  '00:00-05:59': 0.22, '06:00-11:59': 0.18,
  '12:00-17:59': 0.25, '18:00-23:59': 0.35,
};

const MOCK_VEHICLE_PCT = {
  'Motocicleta': 0.65, 'Automóvil': 0.15, 'Peatón': 0.08,
  'Vehículo pesado': 0.06, 'Transporte público': 0.04, 'Bicicleta': 0.02,
};

const MOCK_GENDER_PCT = { 'Masculino': 0.87, 'Femenino': 0.13 };

const MOCK_AGE_PCT = {
  '18-29': 0.361, '30-39': 0.186, '40-49': 0.156,
  '60+': 0.129, '50-59': 0.118, '0-17': 0.05,
};

const MOCK_ACCIDENT_TYPE_PCT = {
  'Colisión': 0.42, 'Atropello': 0.18, 'Volcadura': 0.14,
  'Caída': 0.12, 'Estrellamiento': 0.10, 'Otro': 0.04,
};

// Mapeo de keys del backend (sin tildes) a labels mostrados al usuario
const VEHICLE_LABELS = {
  'Motocicleta': 'Motocicleta',
  'Automovil': 'Automóvil',
  'Automóvil': 'Automóvil',
  'Vehiculo pesado': 'Vehículo pesado',
  'Vehículo pesado': 'Vehículo pesado',
  'Peaton': 'Peatón',
  'Peatón': 'Peatón',
  'Transporte publico': 'Transporte público',
  'Transporte público': 'Transporte público',
  'Bicicleta': 'Bicicleta',
};

const DIA_LABELS = {
  'Domingo': 'Domingo', 'Sabado': 'Sábado', 'Sábado': 'Sábado',
  'Lunes': 'Lunes', 'Martes': 'Martes', 'Miercoles': 'Miércoles',
  'Miércoles': 'Miércoles', 'Jueves': 'Jueves', 'Viernes': 'Viernes',
};

const ACCIDENT_LABELS = {
  'Colision': 'Colisión', 'Colisión': 'Colisión',
  'Atropello': 'Atropello', 'Volcadura': 'Volcadura',
  'Caida': 'Caída', 'Caída': 'Caída',
  'Estrellamiento': 'Estrellamiento', 'Otro': 'Otro',
};

// ============ Estado global ============
const state = {
  yearFilter: '',   // '' = todos
  charts: {},       // referencias a las instancias Chart.js
  provinceData: null,
  aggregateData: null,
  usingMock: false,
};

// ============ Carga de Supabase (opcional) ============
let supabaseAPI = null;
async function loadSupabase() {
  try {
    supabaseAPI = await import('./api.js');
    return true;
  } catch (e) {
    console.warn('[VialRD/Stats] Supabase no disponible:', e.message);
    return false;
  }
}

// ============ Fetch datos ============
async function fetchData() {
  if (!supabaseAPI) {
    state.usingMock = true;
    return;
  }

  // 1) province_yearly_stats — todas las filas
  try {
    const { data, error } = await supabaseAPI.supabase
      .from('province_yearly_stats')
      .select('province, year, fatalities, motorcycle_fatalities');

    if (!error && data && data.length > 0) {
      state.provinceData = data;
      console.log(`[VialRD/Stats] ${data.length} filas province_yearly_stats cargadas`);
    } else {
      console.warn('[VialRD/Stats] province_yearly_stats vacío, usando mock');
      state.usingMock = true;
    }
  } catch (e) {
    console.warn('[VialRD/Stats] Error province_yearly_stats:', e.message);
    state.usingMock = true;
  }

  // 2) aggregate_stats — todas las categorías
  try {
    const { data, error } = await supabaseAPI.supabase
      .from('aggregate_stats')
      .select('category, year, data');

    if (!error && data && data.length > 0) {
      state.aggregateData = data;
      console.log(`[VialRD/Stats] ${data.length} filas aggregate_stats cargadas`);
    } else {
      console.warn('[VialRD/Stats] aggregate_stats vacío, usando mock');
    }
  } catch (e) {
    console.warn('[VialRD/Stats] Error aggregate_stats:', e.message);
  }
}

// ============ Helpers de agregación ============

// Obtener un agregado de una categoría para un año (o acumulado)
function getAggregateFor(category, year) {
  if (!state.aggregateData) return null;
  // Si año específico, busca fila con ese año; si no, busca year=null
  const row = state.aggregateData.find(r =>
    r.category === category &&
    (year ? r.year === parseInt(year, 10) : r.year === null)
  );
  return row ? row.data : null;
}

// Fallback: calcular agregado desde MOCK distributions
function calcMockAggregate(distribution, year) {
  const total = year ? (NATIONAL_TOTALS_BY_YEAR[parseInt(year, 10)] || 0)
                     : Object.values(NATIONAL_TOTALS_BY_YEAR).reduce((s, n) => s + n, 0);
  const out = {};
  Object.entries(distribution).forEach(([k, pct]) => {
    out[k] = Math.round(total * pct);
  });
  return out;
}

// Construir { year: total } para chart temporal
function getYearlyTotals() {
  if (state.provinceData && state.provinceData.length > 0) {
    const out = {};
    state.provinceData.forEach(row => {
      out[row.year] = (out[row.year] || 0) + (row.fatalities || 0);
    });
    return out;
  }
  return { ...NATIONAL_TOTALS_BY_YEAR };
}

// Construir { year: motoTotal }
function getYearlyMotoTotals() {
  if (state.provinceData && state.provinceData.length > 0) {
    const out = {};
    state.provinceData.forEach(row => {
      const moto = row.motorcycle_fatalities || Math.round((row.fatalities || 0) * 0.65);
      out[row.year] = (out[row.year] || 0) + moto;
    });
    return out;
  }
  // fallback: 65% del total
  const out = {};
  Object.entries(NATIONAL_TOTALS_BY_YEAR).forEach(([y, t]) => {
    out[y] = Math.round(t * 0.65);
  });
  return out;
}

// Top N provincias para un año (o acumulado)
function getTopProvinces(year, n = 10) {
  if (state.provinceData && state.provinceData.length > 0) {
    let rows = state.provinceData;
    if (year) rows = rows.filter(r => r.year === parseInt(year, 10));
    const grouped = {};
    rows.forEach(r => {
      grouped[r.province] = (grouped[r.province] || 0) + (r.fatalities || 0);
    });
    return Object.entries(grouped)
      .map(([province, fatalities]) => ({ province, fatalities }))
      .sort((a, b) => b.fatalities - a.fatalities)
      .slice(0, n);
  }
  // fallback mock
  const total = year ? (NATIONAL_TOTALS_BY_YEAR[parseInt(year, 10)] || 0)
                     : Object.values(NATIONAL_TOTALS_BY_YEAR).reduce((s, n) => s + n, 0);
  return Object.entries(MOCK_PROVINCE_PROPORTIONS)
    .map(([province, pct]) => ({ province, fatalities: Math.round(total * pct) }))
    .sort((a, b) => b.fatalities - a.fatalities)
    .slice(0, n);
}

// ============ HEADLINES ============
function updateHeadlines() {
  const yearlyTotals = getYearlyTotals();
  const yearlyMoto = getYearlyMotoTotals();
  const year = state.yearFilter;

  let total, totalMoto;
  if (year) {
    total = yearlyTotals[parseInt(year, 10)] || 0;
    totalMoto = yearlyMoto[parseInt(year, 10)] || 0;
  } else {
    total = Object.values(yearlyTotals).reduce((s, n) => s + n, 0);
    totalMoto = Object.values(yearlyMoto).reduce((s, n) => s + n, 0);
  }
  const motoPct = total > 0 ? (totalMoto / total * 100) : 0;

  // Promedio diario (365 días por año, o ~140 días para 2026 hasta mayo)
  let daysSpan;
  if (year) {
    const yNum = parseInt(year, 10);
    if (yNum === 2026) daysSpan = 140;  // ~hasta mayo
    else daysSpan = 365;
  } else {
    // 10 años completos + 140 días 2026
    daysSpan = 10 * 365 + 140;
  }
  const daily = total / daysSpan;

  animateNumber('headline-total', total, v => v.toLocaleString('es-DO'));
  animateNumber('headline-moto', totalMoto, v => v.toLocaleString('es-DO'));
  animateNumber('headline-moto-pct', motoPct, v => v.toFixed(1) + '%');
  animateNumber('headline-daily', daily, v => v.toFixed(1));
}

// Helper: anima un número
function animateNumber(id, target, formatter = v => Math.round(v).toString(), duration = 700) {
  const el = document.getElementById(id);
  if (!el) return;
  // Parsear valor actual (limpiar formato)
  const currentText = el.textContent.replace(/[^\d.-]/g, '');
  const start = parseFloat(currentText) || 0;
  if (Math.abs(start - target) < 0.01) {
    el.textContent = formatter(target);
    return;
  }
  const t0 = performance.now();
  function frame(now) {
    const p = Math.min((now - t0) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = start + (target - start) * eased;
    el.textContent = formatter(val);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ============ CHARTS ============

// 1) Temporal — total + motoristas (línea)
function renderTemporal() {
  const totals = getYearlyTotals();
  const motoTotals = getYearlyMotoTotals();
  const years = Object.keys(totals).sort();

  destroyChart('chart-temporal');
  const ctx = document.getElementById('chart-temporal');
  if (!ctx) return;

  state.charts['chart-temporal'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: years,
      datasets: [
        {
          label: 'Muertes totales',
          data: years.map(y => totals[y]),
          borderColor: PALETTE.ink,
          backgroundColor: 'rgba(10,10,10,0.05)',
          borderWidth: 2.5,
          tension: 0.25,
          pointRadius: 4,
          pointBackgroundColor: PALETTE.ink,
          pointBorderColor: PALETTE.bg,
          pointBorderWidth: 2,
          fill: false,
        },
        {
          label: 'Motoristas',
          data: years.map(y => motoTotals[y]),
          borderColor: PALETTE.accent,
          backgroundColor: 'rgba(230,57,70,0.1)',
          borderWidth: 2.5,
          tension: 0.25,
          pointRadius: 4,
          pointBackgroundColor: PALETTE.accent,
          pointBorderColor: PALETTE.bg,
          pointBorderWidth: 2,
          fill: true,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end' },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('es-DO')}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: PALETTE.line }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(216,212,202,0.4)' },
          border: { display: false },
          ticks: { callback: v => v.toLocaleString('es-DO') }
        }
      }
    }
  });
}

// 2) Top 10 provincias (barras horizontales)
function renderProvinces() {
  const top = getTopProvinces(state.yearFilter, 10);
  destroyChart('chart-provinces');
  const ctx = document.getElementById('chart-provinces');
  if (!ctx) return;

  state.charts['chart-provinces'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top.map(t => t.province),
      datasets: [{
        label: 'Muertes',
        data: top.map(t => t.fatalities),
        backgroundColor: top.map((_, i) =>
          i === 0 ? PALETTE.accent : (i < 3 ? PALETTE.accentDark : PALETTE.inkSoft)
        ),
        borderWidth: 0,
        borderRadius: 0,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.parsed.x.toLocaleString('es-DO')} muertes`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: 'rgba(216,212,202,0.4)' },
          border: { display: false },
          ticks: { callback: v => v.toLocaleString('es-DO') }
        },
        y: {
          grid: { display: false },
          border: { color: PALETTE.line },
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}

// Helper genérico para charts categóricos (barras verticales)
function renderCategoryBar(canvasId, category, mockDist, orderedKeys, labelMap = {}) {
  const data = getAggregateFor(category, state.yearFilter) || calcMockAggregate(mockDist, state.yearFilter);

  // Si tenemos orden definido, usar ese; si no, ordenar por valor desc
  let entries;
  if (orderedKeys) {
    entries = orderedKeys
      .map(k => {
        // Buscar la key real (puede venir con o sin tilde del backend)
        const realKey = Object.keys(data).find(dk =>
          dk === k || labelMap[dk] === k || labelMap[k] === dk
        ) || k;
        return [labelMap[realKey] || realKey, data[realKey] || 0];
      });
  } else {
    entries = Object.entries(data)
      .map(([k, v]) => [labelMap[k] || k, v])
      .sort((a, b) => b[1] - a[1]);
  }

  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // Encontrar el valor máximo para resaltar
  const maxVal = Math.max(...entries.map(e => e[1]));

  state.charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: entries.map(e => e[0]),
      datasets: [{
        label: 'Muertes',
        data: entries.map(e => e[1]),
        backgroundColor: entries.map(e =>
          e[1] === maxVal ? PALETTE.accent : PALETTE.inkSoft
        ),
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.parsed.y.toLocaleString('es-DO')} muertes`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: PALETTE.line },
          ticks: { font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(216,212,202,0.4)' },
          border: { display: false },
          ticks: { callback: v => v.toLocaleString('es-DO') }
        }
      }
    }
  });
}

// 3) Estacionalidad — mes
function renderMonth() {
  const monthOrder = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  renderCategoryBar('chart-month', 'mes', MOCK_MES_PCT, monthOrder);
}

// 4) Día de la semana
function renderWeekday() {
  const dayOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  renderCategoryBar('chart-weekday', 'dia_semana', MOCK_DIA_PCT, dayOrder, DIA_LABELS);
}

// 5) Hora del día (área)
function renderHour() {
  const data = getAggregateFor('hora', state.yearFilter) || calcMockAggregate(MOCK_HORA_PCT, state.yearFilter);
  const orderedKeys = ['00:00-05:59', '06:00-11:59', '12:00-17:59', '18:00-23:59'];
  const labels = orderedKeys.map(k => k);
  const values = orderedKeys.map(k => data[k] || 0);

  destroyChart('chart-hour');
  const ctx = document.getElementById('chart-hour');
  if (!ctx) return;

  state.charts['chart-hour'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Muertes',
        data: values,
        borderColor: PALETTE.accent,
        backgroundColor: 'rgba(230,57,70,0.18)',
        borderWidth: 2.5,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: PALETTE.accent,
        pointBorderColor: PALETTE.bg,
        pointBorderWidth: 2,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.parsed.y.toLocaleString('es-DO')} muertes`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: PALETTE.line }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(216,212,202,0.4)' },
          border: { display: false },
          ticks: { callback: v => v.toLocaleString('es-DO') }
        }
      }
    }
  });
}

// Helper para donut/pie
function renderDonut(canvasId, category, mockDist, labelMap = {}, useAccentMax = false) {
  const data = getAggregateFor(category, state.yearFilter) || calcMockAggregate(mockDist, state.yearFilter);
  const entries = Object.entries(data)
    .map(([k, v]) => [labelMap[k] || k, v])
    .sort((a, b) => b[1] - a[1]);

  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const colors = useAccentMax
    ? entries.map((_, i) => i === 0 ? PALETTE.accent : CHART_COLORS[(i) % CHART_COLORS.length])
    : entries.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  state.charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: entries.map(e => e[0]),
      datasets: [{
        data: entries.map(e => e[1]),
        backgroundColor: colors,
        borderColor: PALETTE.bg,
        borderWidth: 3,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'right',
          align: 'center',
          labels: {
            font: { size: 11 },
            padding: 10,
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((s, n) => s + n, 0);
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return `${ctx.label}: ${ctx.parsed.toLocaleString('es-DO')} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// 6) Medio de transporte
function renderVehicle() {
  renderDonut('chart-vehicle', 'medio_transporte', MOCK_VEHICLE_PCT, VEHICLE_LABELS, true);
}

// 7) Género
function renderGender() {
  renderDonut('chart-gender', 'genero', MOCK_GENDER_PCT, {}, true);
}

// 8) Edad
function renderAge() {
  const data = getAggregateFor('edad', state.yearFilter) || calcMockAggregate(MOCK_AGE_PCT, state.yearFilter);
  const ageOrder = ['0-17', '18-29', '30-39', '40-49', '50-59', '60+'];
  const entries = ageOrder.map(k => [k, data[k] || 0]);

  destroyChart('chart-age');
  const ctx = document.getElementById('chart-age');
  if (!ctx) return;

  const maxVal = Math.max(...entries.map(e => e[1]));

  state.charts['chart-age'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: entries.map(e => e[0] + ' años'),
      datasets: [{
        label: 'Muertes',
        data: entries.map(e => e[1]),
        backgroundColor: entries.map(e =>
          e[1] === maxVal ? PALETTE.accent : PALETTE.inkSoft
        ),
        borderWidth: 0,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.parsed.x.toLocaleString('es-DO')} muertes`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: 'rgba(216,212,202,0.4)' },
          border: { display: false },
          ticks: { callback: v => v.toLocaleString('es-DO') }
        },
        y: {
          grid: { display: false },
          border: { color: PALETTE.line }
        }
      }
    }
  });
}

// 9) Tipo de accidente
function renderAccidentType() {
  renderCategoryBar('chart-accident-type', 'tipo_accidente', MOCK_ACCIDENT_TYPE_PCT, null, ACCIDENT_LABELS);
}

// ============ Render todos los charts ============
function renderAllCharts() {
  renderTemporal();
  renderProvinces();
  renderMonth();
  renderWeekday();
  renderHour();
  renderVehicle();
  renderGender();
  renderAge();
  renderAccidentType();
}

function destroyChart(canvasId) {
  if (state.charts[canvasId]) {
    state.charts[canvasId].destroy();
    delete state.charts[canvasId];
  }
}

// ============ Filtro de año ============
function setupYearFilter() {
  const pills = document.querySelectorAll('.year-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      const year = pill.dataset.year;
      if (state.yearFilter === year) return;

      // Actualizar UI
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.yearFilter = year;

      // Actualizar contexto
      const ctxEl = document.getElementById('filter-context');
      if (ctxEl) {
        ctxEl.textContent = year ? `Vista año ${year}` : 'Vista 2016–2026 (acumulado)';
      }

      // Re-render
      updateHeadlines();
      renderAllCharts();
    });
  });
}

// ============ Toast ============
let toastTimeout = null;
function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.hidden = true; }, duration);
}

// ============ Bootstrap ============
(async function bootstrap() {
  console.log('[VialRD/Stats] Iniciando dashboard…');

  // Esperar a que Chart.js esté disponible
  if (typeof Chart === 'undefined') {
    console.error('[VialRD/Stats] Chart.js no cargado');
    showToast('Error: Chart.js no se pudo cargar');
    return;
  }

  // 1) Conectar Supabase
  await loadSupabase();

  // 2) Fetch datos
  await fetchData();

  // 3) Render inicial
  updateHeadlines();
  renderAllCharts();

  // 4) Wire up filtro
  setupYearFilter();

  // 5) Confirmación
  const sourceLabel = state.usingMock ? 'datos documentados (mock)' : 'Supabase';
  const rowCount = state.provinceData ? state.provinceData.length : 0;
  showToast(`Dashboard cargado · ${rowCount || '11 años'} de datos · fuente: ${sourceLabel}`);
  console.log(`[VialRD/Stats] Listo. Mock=${state.usingMock}, filas=${rowCount}`);
})();
