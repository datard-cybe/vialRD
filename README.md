# VialRD

> Plataforma cívica de datos viales abiertos para República Dominicana.
> **Misión:** reducir la mortalidad vial dominicana — particularmente la motorizada (65% de las muertes) — mediante datos abiertos, crowdsourcing ciudadano y ruteo consciente del riesgo.

[![Status](https://img.shields.io/badge/status-MVP-orange)]()
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue)]()
[![Stack](https://img.shields.io/badge/stack-Supabase%20%2B%20Cloudflare%20Pages-green)]()

---

## El problema

En 2025 murieron **1,945 motociclistas** en República Dominicana — el **65% de todas las muertes viales del país**. Solo el **0.3% de los 3.5 millones de motoristas** tiene licencia activa. El 36% de las víctimas son jóvenes entre 18-29 años.

Mientras tanto, las apps comerciales (Waze, Google Maps) optimizan por velocidad, no por riesgo. No mapean policías acostados sin señalizar. No cruzan datos oficiales del Opsevi/DIGESETT con reportes ciudadanos. No publican APIs abiertas para periodistas, ONGs ni gobierno.

**VialRD llena ese vacío.**

## Características v1.0

- 🗺️ **Mapa interactivo** con 3 capas:
  - Calor de muertes 2021-2026 (datos DIGESETT/Opsevi)
  - Policías acostados sin señalizar (crowdsourcing)
  - Baches y otros hazards (crowdsourcing)
- 🛣️ **Ruteo consciente del riesgo** — no la ruta más rápida, la más segura
- 📝 **Reportes ciudadanos** anónimos o autenticados, con foto y geolocalización
- 📊 **Dashboard público** de estadísticas en tiempo real
- 🔌 **API pública gratuita** para periodistas, ONGs y gobierno
- 📱 **PWA instalable** — funciona como app nativa
- 🇩🇴 100% en español dominicano

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vanilla JS + MapLibre GL JS + Tailwind |
| Hosting | Cloudflare Pages |
| Backend / DB | Supabase (PostgreSQL + PostGIS) |
| Auth | Supabase Auth (Google OAuth) |
| Storage | Supabase Storage |
| Mapas | OpenStreetMap (raster tiles) |
| Routing | OpenRouteService API |
| Geocoding | Nominatim |
| Anti-spam | hCaptcha |
| ETL datos oficiales | Python + GitHub Actions (semanal) |

## Setup local

### Requisitos
- Cuenta en [Supabase](https://supabase.com) (free tier)
- Cuenta en [OpenRouteService](https://openrouteservice.org/dev/) (API key gratis)
- Cuenta en [hCaptcha](https://www.hcaptcha.com/) (sitekey gratis)
- Node.js 20+ (solo para herramientas de dev opcionales)

### Pasos

1. **Clonar repo**
   ```bash
   git clone https://github.com/datard-cybe/vialrd.git
   cd vialrd
   ```

2. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   # Editar .env con tus credenciales
   ```

3. **Crear schema en Supabase**
   - Login en supabase.com → tu proyecto → SQL Editor
   - Pegar y ejecutar `sql/01_schema.sql`
   - Pegar y ejecutar `sql/02_rls_policies.sql`
   - Pegar y ejecutar `sql/03_functions.sql`

4. **Levantar localmente**
   ```bash
   # Cualquier servidor estático funciona, ejemplos:
   python3 -m http.server 8000
   # o
   npx serve .
   ```

5. **Importar datos oficiales** (opcional para desarrollo)
   ```bash
   cd scripts
   pip install -r requirements.txt
   python import_digesett.py
   ```

## Despliegue

### Cloudflare Pages
```bash
# Push a main → autodeployment
git push origin main
```

Configurar en Cloudflare Pages:
- Build command: (vacío — es estático)
- Build output directory: `/`
- Environment variables: copiar de `.env.example` con valores reales

## Estructura del repo

```
vialrd/
├── index.html              # Landing + app principal
├── app.html                # Vista del mapa principal
├── reportar.html           # Formulario de reporte
├── stats.html              # Dashboard público
├── api-docs.html           # Documentación de la API pública
├── css/
│   ├── style.css           # Estilos principales
│   └── map.css             # Estilos específicos del mapa
├── js/
│   ├── app.js              # Bootstrap de la app
│   ├── map.js              # Lógica del mapa MapLibre
│   ├── routing.js          # Cálculo de rutas + riesgo
│   ├── reports.js          # CRUD de reportes
│   ├── auth.js             # Supabase Auth
│   └── api.js              # Cliente Supabase
├── sql/
│   ├── 01_schema.sql       # Tablas + índices
│   ├── 02_rls_policies.sql # Row Level Security
│   └── 03_functions.sql    # Funciones PostGIS (risk score, etc)
├── scripts/
│   ├── import_digesett.py  # ETL de DIGESETT
│   ├── import_opsevi.py    # ETL de Opsevi/INTRANT
│   └── requirements.txt
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service worker
│   └── icons/              # Iconos PWA
└── .github/
    └── workflows/
        └── etl-weekly.yml  # Cron semanal para ETL
```

## API pública

Base: `https://vialrd.com/api/v1`

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/reports` | GET | Listar reportes con filtros geo |
| `/reports/:id` | GET | Detalle de un reporte |
| `/accidents` | GET | Accidentes oficiales con filtros |
| `/accidents/heatmap` | GET | Datos agregados para mapa de calor |
| `/route/risk` | POST | Calcular score de riesgo de una ruta |
| `/stats/national` | GET | Estadísticas nacionales actualizadas |
| `/stats/province/:name` | GET | Estadísticas por provincia |

Toda la API es **gratis y sin autenticación** para uso no comercial. Rate limit: 100 req/min.

## Roadmap

### v1.0 (lanzamiento — mayo 2026)
- [x] Schema + RLS
- [x] Mapa con capas básicas
- [ ] Formulario de reporte
- [ ] Ruteo con score de riesgo
- [ ] Dashboard público
- [ ] API pública v1

### v2.0 (Q3 2026)
- [ ] Algoritmo de detección de "puntos negros" automatizado
- [ ] Notificaciones push de hazards cercanos
- [ ] App nativa (Android primero)
- [ ] Modo offline parcial
- [ ] Integración con WhatsApp para reportes por chat

### v3.0 (Q4 2026)
- [ ] Detección automática de baches con ML
- [ ] Dashboard institucional para INTRANT/MOPC
- [ ] Open311 compliance para integración con ayuntamientos

## Licencia

Código bajo **AGPL-3.0**. Los datos publicados están bajo **CC BY 4.0** — libres para uso periodístico, académico, gubernamental y comercial con atribución.

## Contacto

- Sitio: [vialrd.com](https://vialrd.com)
- Email: contacto@vialrd.com
- GitHub Issues: para bugs y feature requests

---

**VialRD es un proyecto cívico independiente, sin fines de lucro, construido en República Dominicana.**
