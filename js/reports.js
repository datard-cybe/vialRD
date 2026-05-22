// ===========================================================
// VialRD — Lógica del formulario de reporte
// ===========================================================

const state = {
  location: null,        // { lng, lat }
  severity: 3,
  photo: null,
  miniMap: null,
  miniMapMarker: null,
};

const SEVERITY_LABELS = {
  1: '1 — Leve',
  2: '2 — Menor',
  3: '3 — Moderada',
  4: '4 — Alta',
  5: '5 — Crítica'
};

// ============ Supabase opcional ============
let api = null;
async function loadApi() {
  try { api = await import('./api.js'); return true; }
  catch (e) { console.warn('[VialRD] Supabase no disponible:', e.message); return false; }
}

// ============ Coords desde query string (cuando viene del mapa) ============
function loadFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const lng = parseFloat(params.get('lng'));
  const lat = parseFloat(params.get('lat'));
  if (!isNaN(lng) && !isNaN(lat)) setLocation({ lng, lat });
}

// ============ Severidad (estrellas) ============
function setupSeverity() {
  const stars = document.querySelectorAll('.star-btn');
  const input = document.getElementById('severityInput');
  const label = document.getElementById('severityCurrent');

  stars.forEach((star, idx) => {
    const sev = idx + 1;
    star.addEventListener('mouseenter', () => {
      stars.forEach((s, i) => s.classList.toggle('preview', i < sev));
    });
    star.addEventListener('mouseleave', () => {
      stars.forEach(s => s.classList.remove('preview'));
    });
    star.addEventListener('click', () => {
      state.severity = sev;
      input.value = sev;
      label.textContent = SEVERITY_LABELS[sev];
      stars.forEach((s, i) => s.classList.toggle('active', i < sev));
    });
  });
}

// ============ Char counter ============
function setupCharCount() {
  const ta = document.getElementById('description');
  const counter = document.getElementById('charCount');
  ta.addEventListener('input', () => {
    counter.textContent = ta.value.length;
  });
}

// ============ Foto ============
function setupPhoto() {
  const input = document.getElementById('photoInput');
  const drop = document.getElementById('photoDrop');
  const preview = document.getElementById('photoPreview');
  const previewImg = document.getElementById('photoPreviewImg');
  const removeBtn = document.getElementById('photoRemove');

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Solo se aceptan imágenes');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La foto debe ser menor a 5MB');
      return;
    }
    state.photo = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      drop.style.display = 'none';
      preview.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  }

  input.addEventListener('change', (e) => handleFile(e.target.files[0]));

  // Drag and drop
  ['dragenter', 'dragover'].forEach(ev => {
    drop.addEventListener(ev, (e) => {
      e.preventDefault(); e.stopPropagation();
      drop.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(ev => {
    drop.addEventListener(ev, (e) => {
      e.preventDefault(); e.stopPropagation();
      drop.classList.remove('dragover');
    });
  });
  drop.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

  removeBtn.addEventListener('click', () => {
    state.photo = null;
    input.value = '';
    drop.style.display = 'flex';
    preview.style.display = 'none';
  });
}

// ============ Ubicación ============
function setupLocation() {
  const useGeoBtn = document.getElementById('useMyLocation');
  const pickMapBtn = document.getElementById('pickOnMap');
  const clearBtn = document.getElementById('clearLocation');

  useGeoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }
    useGeoBtn.disabled = true;
    useGeoBtn.textContent = '⏳ Localizando...';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lng: pos.coords.longitude, lat: pos.coords.latitude });
        useGeoBtn.disabled = false;
        useGeoBtn.innerHTML = '📍 Usar mi ubicación';
      },
      (err) => {
        useGeoBtn.disabled = false;
        useGeoBtn.innerHTML = '📍 Usar mi ubicación';
        alert('No se pudo obtener tu ubicación: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

  pickMapBtn.addEventListener('click', () => {
    initMiniMap();
  });

  clearBtn.addEventListener('click', () => {
    state.location = null;
    document.getElementById('locationCoords').style.display = 'none';
    document.getElementById('miniMap').style.display = 'none';
    if (state.miniMap) {
      state.miniMap.remove();
      state.miniMap = null;
    }
  });
}

function setLocation(loc) {
  state.location = loc;
  document.getElementById('coordsDisplay').textContent =
    `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;
  document.getElementById('locationCoords').style.display = 'flex';

  if (state.miniMap && state.miniMapMarker) {
    state.miniMapMarker.setLngLat([loc.lng, loc.lat]);
    state.miniMap.flyTo({ center: [loc.lng, loc.lat], zoom: 15 });
  }
}

function initMiniMap() {
  const container = document.getElementById('miniMap');
  container.style.display = 'block';
  if (state.miniMap) {
    state.miniMap.resize();
    return;
  }

  const center = state.location
    ? [state.location.lng, state.location.lat]
    : [-69.9312, 18.4861];

  state.miniMap = new maplibregl.Map({
    container: 'miniMap',
    style: {
      version: 8,
      sources: {
        'osm': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OSM'
        }
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
    },
    center,
    zoom: state.location ? 15 : 10,
    attributionControl: false,
  });

  state.miniMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  state.miniMapMarker = new maplibregl.Marker({ color: '#e63946', draggable: true })
    .setLngLat(center)
    .addTo(state.miniMap);

  state.miniMapMarker.on('dragend', () => {
    const { lng, lat } = state.miniMapMarker.getLngLat();
    setLocation({ lng, lat });
  });

  state.miniMap.on('click', (e) => {
    state.miniMapMarker.setLngLat(e.lngLat);
    setLocation({ lng: e.lngLat.lng, lat: e.lngLat.lat });
  });
}

// ============ Submit del formulario ============
function setupSubmit() {
  const form = document.getElementById('reportForm');
  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validar
    const formData = new FormData(form);
    const type = formData.get('type');
    if (!type) {
      alert('Selecciona el tipo de hazard');
      return;
    }
    if (!state.location) {
      alert('Marca una ubicación (usa "Mi ubicación" o "Marcar en mapa")');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    const payload = {
      type,
      lng: state.location.lng,
      lat: state.location.lat,
      severity: state.severity,
      description: formData.get('description') || null,
      photoFile: state.photo
    };

    try {
      if (api) {
        await api.createReport(payload);
      } else {
        // Sin Supabase, demo: simulamos delay
        await new Promise(r => setTimeout(r, 800));
        console.log('[VialRD] Reporte demo (Supabase no conectado):', payload);
      }
      showSuccess();
    } catch (err) {
      console.error('[VialRD] Error al enviar reporte:', err);
      alert('Error al enviar: ' + err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar reporte';
    }
  });
}

function showSuccess() {
  document.getElementById('reportForm').style.display = 'none';
  document.getElementById('reportSuccess').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  document.getElementById('reportAnother').addEventListener('click', () => {
    location.reload();
  });
}

// ============ Bootstrap ============
(async function bootstrap() {
  await loadApi();
  loadFromQuery();
  setupSeverity();
  setupCharCount();
  setupPhoto();
  setupLocation();
  setupSubmit();
})();
