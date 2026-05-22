// ===========================================================
// VialRD — Bootstrap de la landing page
// Carga contadores con datos de Supabase + animación inicial
// ===========================================================

// Import dinámico para no romper la página si Supabase aún no está configurado
let apiModule = null;
async function loadApi() {
  if (apiModule) return apiModule;
  try {
    apiModule = await import('./api.js');
    return apiModule;
  } catch (err) {
    console.warn('[VialRD] API no inicializada (Supabase pendiente de config):', err.message);
    return null;
  }
}

// ============ Animación de contadores ============
function animateCounter(el, target, duration = 1500) {
  const start = performance.now();
  const startVal = 0;

  function frame(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(startVal + (target - startVal) * eased);
    el.textContent = current.toLocaleString('es-DO');
    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

// ============ Cargar stats reales o fallback ============
async function loadHeroCounters() {
  const fatalitiesEl = document.querySelector('[data-counter="fatalities-ytd"]');
  const reportsEl = document.querySelector('[data-counter="reports-total"]');

  // Fallback realista mientras backend no esté listo
  // (datos públicos del Opsevi a mayo 2026)
  let fatalitiesYTD = 213;
  let reportsTotal = 0;

  // Pintar fallback inmediatamente para que no quede en blanco
  if (fatalitiesEl) animateCounter(fatalitiesEl, fatalitiesYTD);
  if (reportsEl) animateCounter(reportsEl, reportsTotal);

  // Intentar mejorar con datos reales si Supabase está configurado
  const api = await loadApi();
  if (!api) return;

  try {
    const stats = await api.getNationalStats();
    if (stats?.fatalities_current_year && fatalitiesEl) {
      animateCounter(fatalitiesEl, stats.fatalities_current_year);
    }
    if (stats?.total_reports !== undefined && reportsEl) {
      animateCounter(reportsEl, stats.total_reports);
    }
  } catch (err) {
    console.warn('[VialRD] Stats no disponibles aún, manteniendo fallback');
  }
}

// ============ Reveal on scroll para las stat cards ============
function setupScrollReveal() {
  const cards = document.querySelectorAll('.stat-card, .feature');
  if (!cards.length || !('IntersectionObserver' in window)) return;

  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

  cards.forEach(card => observer.observe(card));
}

// ============ Bootstrap ============
document.addEventListener('DOMContentLoaded', () => {
  loadHeroCounters();
  setupScrollReveal();

  // Smooth scroll para links internos (extra a CSS scroll-behavior)
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  console.log('%cVialRD', 'font: 700 32px serif; color: #e63946;');
  console.log('%cDatos viales abiertos de República Dominicana', 'color: #6b6a64; font-size: 13px;');
  console.log('%c→ GitHub: https://github.com/datard-cybe/vialrd', 'color: #2a9d8f;');
});
