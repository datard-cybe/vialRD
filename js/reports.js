// ===========================================================
// VialRD — Lógica del formulario de reporte (v2 — alta precisión)
// Mejoras:
//   - EXIF GPS de la foto (si la cámara guardó coords)
//   - watchPosition con promedio de múltiples lecturas
//   - Indicador de precisión visible (±metros)
//   - Redimensionado automático de fotos (max 1600px, JPEG 85%)
//   - Mini-mapa siempre visible cuando hay ubicación
// ===========================================================

const state = {
  location: null,         // { lng, lat, accuracy, source }
  severity: 3,
  photo: null,            // File (redimensionado si era grande)
  originalPhoto: null,    // File original (pa' leer EXIF)
  miniMap: null,
  miniMapMarker: null,
  watchId: null,
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

// ============ Coords desde query string ============
function loadFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const lng = parseFloat(params.get('lng'));
  const lat = parseFloat(params.get('lat'));
  if (!isNaN(lng) && !isNaN(lat)) {
    setLocation({ lng, lat, accuracy: null, source: 'mapa' });
  }
}

// ============ Severidad ============
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

// ============ Char count ============
function setupCharCount() {
  const ta = document.getElementById('description');
  const counter = document.getElementById('charCount');
  ta.addEventListener('input', () => { counter.textContent = ta.value.length; });
}

// ============ EXIF reader (lee GPS de fotos JPEG) ============
// Lee los tags GPSLatitude, GPSLongitude, GPSLatitudeRef, GPSLongitudeRef del EXIF
// Devuelve { lng, lat } o null
async function readExifGps(file) {
  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);

    // Verificar JPEG (FFD8)
    if (view.getUint16(0) !== 0xFFD8) return null;

    let offset = 2;
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset);
      offset += 2;

      // APP1 (FFE1) contiene EXIF
      if (marker === 0xFFE1) {
        const len = view.getUint16(offset);
        // "Exif\0\0" header
        if (view.getUint32(offset + 2) !== 0x45786966) break;
        return parseExifGps(view, offset + 8, len - 8);
      } else if ((marker & 0xFF00) !== 0xFF00) {
        break;
      } else {
        offset += view.getUint16(offset);
      }
    }
    return null;
  } catch (e) {
    console.warn('[VialRD] EXIF read error:', e);
    return null;
  }
}

function parseExifGps(view, tiffStart, tiffLength) {
  // Endianness
  const little = view.getUint16(tiffStart) === 0x4949;
  const getU16 = (offset) => view.getUint16(offset, little);
  const getU32 = (offset) => view.getUint32(offset, little);

  // Magic 0x002A
  if (getU16(tiffStart + 2) !== 0x002A) return null;

  // Offset al primer IFD
  const ifd0Offset = tiffStart + getU32(tiffStart + 4);
  const numEntries = getU16(ifd0Offset);

  // Buscar tag 0x8825 (GPS IFD pointer)
  let gpsIfdOffset = null;
  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifd0Offset + 2 + i * 12;
    const tag = getU16(entryOffset);
    if (tag === 0x8825) {
      gpsIfdOffset = tiffStart + getU32(entryOffset + 8);
      break;
    }
  }
  if (!gpsIfdOffset) return null;

  // Parsear GPS IFD
  const gpsEntries = getU16(gpsIfdOffset);
  let latRef = null, lonRef = null, lat = null, lon = null;

  for (let i = 0; i < gpsEntries; i++) {
    const entryOffset = gpsIfdOffset + 2 + i * 12;
    const tag = getU16(entryOffset);
    const valOffset = entryOffset + 8;

    if (tag === 0x0001) {
      // GPSLatitudeRef (N/S) — 1 char ASCII inline
      latRef = String.fromCharCode(view.getUint8(valOffset));
    } else if (tag === 0x0003) {
      lonRef = String.fromCharCode(view.getUint8(valOffset));
    } else if (tag === 0x0002) {
      // GPSLatitude — 3 rationals (deg, min, sec)
      lat = readRationalTriple(view, tiffStart + getU32(valOffset), little);
    } else if (tag === 0x0004) {
      lon = readRationalTriple(view, tiffStart + getU32(valOffset), little);
    }
  }

  if (!lat || !lon || !latRef || !lonRef) return null;

  let latDeg = lat[0] + lat[1] / 60 + lat[2] / 3600;
  let lonDeg = lon[0] + lon[1] / 60 + lon[2] / 3600;
  if (latRef === 'S') latDeg = -latDeg;
  if (lonRef === 'W') lonDeg = -lonDeg;

  return { lat: latDeg, lng: lonDeg };
}

function readRationalTriple(view, offset, little) {
  const out = [];
  for (let i = 0; i < 3; i++) {
    const num = view.getUint32(offset + i * 8, little);
    const den = view.getUint32(offset + i * 8 + 4, little);
    out.push(den === 0 ? 0 : num / den);
  }
  return out;
}

// ============ Image resize (max 1600px, JPEG 85%) ============
async function resizeImage(file, maxSize = 1600, quality = 0.85) {
  if (file.size < 800 * 1024) return file; // < 800KB no vale la pena
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = () => resolve(file); // fallback al original

    img.onload = () => {
      let { width, height } = img;
      if (width <= maxSize && height <= maxSize) {
        resolve(file); // ya es pequeña
        return;
      }
      if (width > height) {
        height = Math.round(height * maxSize / width);
        width = maxSize;
      } else {
        width = Math.round(width * maxSize / height);
        height = maxSize;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return; }
        // Nombre original .jpg pa' consistencia
        const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
        resolve(new File([blob], newName, { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };

    img.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// ============ Foto handling ============
function setupPhoto() {
  const input = document.getElementById('photoInput');
  const drop = document.getElementById('photoDrop');
  const preview = document.getElementById('photoPreview');
  const previewImg = document.getElementById('photoPreviewImg');
  const removeBtn = document.getElementById('photoRemove');
  const photoMeta = document.getElementById('photoMeta');

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Solo se aceptan imágenes', 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('La foto debe ser menor a 15MB', 'error');
      return;
    }

    state.originalPhoto = file;
    if (photoMeta) photoMeta.textContent = `Procesando…`;

    // Preview rápido con el original
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      drop.style.display = 'none';
      preview.style.display = 'flex';
    };
    reader.readAsDataURL(file);

    // 1) Intentar leer EXIF GPS si no hay ubicación todavía o si la actual es de baja precisión
    const exifLoc = await readExifGps(file);
    if (exifLoc) {
      const hasLowAccuracy = !state.location || state.location.accuracy === null || state.location.accuracy > 30;
      if (hasLowAccuracy || state.location.source !== 'foto-exif') {
        const useExif = !state.location
          ? true
          : confirm(`La foto tiene coordenadas GPS embebidas.\n\n¿Usar la ubicación de la foto (más precisa) en lugar de la actual?`);
        if (useExif) {
          setLocation({ lng: exifLoc.lng, lat: exifLoc.lat, accuracy: 5, source: 'foto-exif' });
          showToast('📷 Ubicación tomada del EXIF de la foto');
        }
      }
    }

    // 2) Redimensionar pa' upload
    const resized = await resizeImage(file);
    state.photo = resized;
    const kb = Math.round(resized.size / 1024);
    if (photoMeta) {
      const note = resized !== file ? ' (redimensionada)' : '';
      photoMeta.textContent = `${kb} KB${note}${exifLoc ? ' · GPS detectado' : ''}`;
    }
  }

  input.addEventListener('change', (e) => handleFile(e.target.files[0]));

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
    state.originalPhoto = null;
    input.value = '';
    drop.style.display = 'flex';
    preview.style.display = 'none';
    if (photoMeta) photoMeta.textContent = '';
  });
}

// ============ Ubicación (alta precisión) ============
function setupLocation() {
  const useGeoBtn = document.getElementById('useMyLocation');
  const pickMapBtn = document.getElementById('pickOnMap');
  const clearBtn = document.getElementById('clearLocation');

  useGeoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Tu navegador no soporta geolocalización', 'error');
      return;
    }

    // watchPosition: toma múltiples lecturas y se queda con la mejor
    useGeoBtn.disabled = true;
    useGeoBtn.innerHTML = '<span class="spinner-inline"></span> Localizando…';

    const readings = [];
    let bestReading = null;
    const startTime = performance.now();
    const MAX_DURATION = 6000; // 6 seg
    const TARGET_ACCURACY = 15; // metros

    state.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        readings.push({
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
          accuracy: pos.coords.accuracy,
          ts: performance.now()
        });

        if (!bestReading || pos.coords.accuracy < bestReading.accuracy) {
          bestReading = readings[readings.length - 1];
        }

        // UI feedback en vivo
        useGeoBtn.innerHTML = `<span class="spinner-inline"></span> ±${Math.round(pos.coords.accuracy)}m · refinando…`;

        // Cortar si llegamos a precisión target o pasó el tiempo
        const elapsed = performance.now() - startTime;
        if (bestReading.accuracy <= TARGET_ACCURACY || elapsed >= MAX_DURATION) {
          finishWatch();
        }
      },
      (err) => {
        cleanupWatch();
        useGeoBtn.disabled = false;
        useGeoBtn.innerHTML = '📍 Usar mi ubicación';
        const msg = err.code === 1 ? 'Permiso denegado. Activa la ubicación en tu navegador.'
                  : err.code === 2 ? 'Ubicación no disponible. Intenta marcar en el mapa.'
                  : err.code === 3 ? 'Tiempo agotado. Marca manualmente en el mapa.'
                  : 'Error: ' + err.message;
        showToast(msg, 'error');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );

    // Failsafe: forzar cierre a los 7 seg
    setTimeout(() => {
      if (state.watchId !== null) finishWatch();
    }, 7000);

    function finishWatch() {
      cleanupWatch();
      useGeoBtn.disabled = false;
      useGeoBtn.innerHTML = '📍 Usar mi ubicación';
      if (bestReading) {
        setLocation({
          lng: bestReading.lng,
          lat: bestReading.lat,
          accuracy: bestReading.accuracy,
          source: 'gps'
        });
        const accLabel = bestReading.accuracy < 20 ? 'alta precisión'
                       : bestReading.accuracy < 50 ? 'precisión media'
                       : '⚠ precisión baja, considera ajustar manual';
        showToast(`📍 Ubicación: ±${Math.round(bestReading.accuracy)}m · ${accLabel}`);
      }
    }

    function cleanupWatch() {
      if (state.watchId !== null) {
        navigator.geolocation.clearWatch(state.watchId);
        state.watchId = null;
      }
    }
  });

  pickMapBtn.addEventListener('click', () => { initMiniMap(); });

  clearBtn.addEventListener('click', () => {
    state.location = null;
    document.getElementById('locationCoords').style.display = 'none';
    document.getElementById('miniMap').style.display = 'none';
    if (state.miniMap) { state.miniMap.remove(); state.miniMap = null; }
  });
}

function setLocation(loc) {
  state.location = loc;
  const coordsEl = document.getElementById('coordsDisplay');
  const accEl = document.getElementById('accuracyDisplay');
  const srcEl = document.getElementById('sourceDisplay');

  coordsEl.textContent = `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;

  // Indicador de precisión
  if (accEl) {
    if (loc.accuracy !== null && loc.accuracy !== undefined) {
      const acc = Math.round(loc.accuracy);
      const cls = acc < 20 ? 'acc-good' : acc < 50 ? 'acc-medium' : 'acc-low';
      accEl.className = 'accuracy-badge ' + cls;
      accEl.textContent = `±${acc}m`;
      accEl.style.display = 'inline-flex';
    } else {
      accEl.style.display = 'none';
    }
  }

  if (srcEl) {
    const labels = { 'gps': 'GPS', 'foto-exif': 'EXIF de foto', 'mapa': 'pin en mapa', 'manual': 'manual' };
    srcEl.textContent = labels[loc.source] || loc.source;
  }

  document.getElementById('locationCoords').style.display = 'flex';

  // Auto-mostrar mini-map para que el usuario pueda ajustar el pin
  if (!state.miniMap) {
    initMiniMap();
  } else if (state.miniMapMarker) {
    state.miniMapMarker.setLngLat([loc.lng, loc.lat]);
    state.miniMap.flyTo({ center: [loc.lng, loc.lat], zoom: 16, duration: 800 });
  }
}

function initMiniMap() {
  const container = document.getElementById('miniMap');
  container.style.display = 'block';
  if (state.miniMap) { state.miniMap.resize(); return; }

  const center = state.location
    ? [state.location.lng, state.location.lat]
    : [-69.9312, 18.4861];

  state.miniMap = new maplibregl.Map({
    container: 'miniMap',
    style: {
      version: 8,
      sources: { 'osm': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256, attribution: '© OSM'
      }},
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
    },
    center,
    zoom: state.location ? 16 : 10,
    attributionControl: false,
  });

  state.miniMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  state.miniMapMarker = new maplibregl.Marker({ color: '#e63946', draggable: true })
    .setLngLat(center)
    .addTo(state.miniMap);

  state.miniMapMarker.on('dragend', () => {
    const { lng, lat } = state.miniMapMarker.getLngLat();
    state.location = { lng, lat, accuracy: 5, source: 'manual' };
    document.getElementById('coordsDisplay').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    const accEl = document.getElementById('accuracyDisplay');
    const srcEl = document.getElementById('sourceDisplay');
    if (accEl) { accEl.className = 'accuracy-badge acc-good'; accEl.textContent = '±5m'; accEl.style.display = 'inline-flex'; }
    if (srcEl) srcEl.textContent = 'ajustado manual';
  });

  state.miniMap.on('click', (e) => {
    state.miniMapMarker.setLngLat(e.lngLat);
    state.location = { lng: e.lngLat.lng, lat: e.lngLat.lat, accuracy: 5, source: 'manual' };
    document.getElementById('coordsDisplay').textContent = `${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}`;
    const accEl = document.getElementById('accuracyDisplay');
    const srcEl = document.getElementById('sourceDisplay');
    if (accEl) { accEl.className = 'accuracy-badge acc-good'; accEl.textContent = '±5m'; accEl.style.display = 'inline-flex'; }
    if (srcEl) srcEl.textContent = 'ajustado manual';
  });

  // Resize quando se hace visible
  setTimeout(() => state.miniMap.resize(), 100);
}

// ============ Submit ============
function setupSubmit() {
  const form = document.getElementById('reportForm');
  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const type = formData.get('type');

    if (!type) { showToast('Selecciona el tipo de hazard', 'error'); return; }
    if (!state.location) { showToast('Marca una ubicación antes de enviar', 'error'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';

    const payload = {
      type,
      lng: state.location.lng,
      lat: state.location.lat,
      severity: state.severity,
      description: formData.get('description') || null,
      photoFile: state.photo,
    };

    try {
      let result;
      if (api) {
        result = await api.createReport(payload);
      } else {
        await new Promise(r => setTimeout(r, 800));
        console.log('[VialRD] Reporte demo:', payload);
      }
      showSuccess(result);
    } catch (err) {
      console.error('[VialRD] Error al enviar:', err);
      showToast('Error al enviar: ' + err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar reporte';
    }
  });
}

function showSuccess(result) {
  document.getElementById('reportForm').style.display = 'none';
  document.getElementById('reportSuccess').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Si hay coords, hacer que "Ver en el mapa" haga zoom a ese punto
  if (state.location) {
    const viewBtn = document.querySelector('#reportSuccess a[href="/app.html"]');
    if (viewBtn) {
      viewBtn.href = `/app.html?focus_lng=${state.location.lng.toFixed(6)}&focus_lat=${state.location.lat.toFixed(6)}`;
    }
  }

  document.getElementById('reportAnother').addEventListener('click', () => location.reload());
}

// ============ Toast ============
let toastTimeout = null;
function showToast(msg, type = 'info', duration = 3500) {
  let toast = document.getElementById('reportToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'reportToast';
    toast.className = 'report-toast';
    document.body.appendChild(toast);
  }
  toast.className = 'report-toast report-toast--' + type;
  toast.textContent = msg;
  toast.hidden = false;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.hidden = true; }, duration);
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
