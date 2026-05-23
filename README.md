# VialRD — Día 3b: Filtros reactivos + Métricas dinámicas

## Qué arregla este patch

**3 bugs críticos resueltos:**

1. ✅ El **filtro de año** ya cambia los círculos de provincia (antes no hacía nada)
2. ✅ El **filtro de provincia** ahora hace zoom y filtra todo (antes solo afectaba pines individuales)
3. ✅ El **filtro de vehículo** ahora cambia el número visualizado (motoristas vs todos)

**Mejoras nuevas:**

- 🎯 **3 mini-stats reactivas** nuevas en el sidebar:
  - Provincia más letal (con su número)
  - % de motoristas sobre el total
  - Hazards reportados
- 🎨 **Contexto del filtro activo** en banner amarillo arriba de las stats
- ✨ **Contadores animados** al cambiar filtros (no parpadean, transicionan)
- 🔄 **Botón "Limpiar"** para resetear todos los filtros de una
- 💫 **Flash visual** del panel al cambiar un filtro (feedback inmediato)
- 🎬 **Transición suave** de los círculos del mapa al cambiar año/vehículo (400ms)
- 🛰️ **Auto-zoom** a la provincia cuando la seleccionas en el filtro

## Archivos a reemplazar/actualizar

| Archivo | Acción |
|---------|--------|
| `js/map.js` | **Reemplazar** completo |
| `app.html` | **Reemplazar** completo |
| `css/map.css` | **Añadir** el contenido de `css/map-patch.css` AL FINAL (no reemplazar) |

## Pasos de deploy (3 min)

```bash
# 1. Copiar archivos sobre tu carpeta local
cd C:\Users\User\OneDrive\Escritorio\vialrd

# 2. Reemplazar js/map.js y app.html (copiar desde el zip descomprimido)

# 3. Agregar el CSS patch al final de css/map.css
#    (Opción A — manual: abre map.css y pega el contenido de map-patch.css al final)
#    (Opción B — terminal):
type css\map-patch.css >> css\map.css

# 4. Commit + push
git add app.html js/map.js css/map.css
git commit -m "feat: filtros reactivos + mini-stats dinamicas"
git push
```

Cloudflare redeploya en 60 seg.

## Cómo probarlo

Abre vialrd.com/app con Ctrl+Shift+R, y:

1. Cambia el filtro de **año** a 2023 → los círculos se achican (menos muertes en ese año)
2. Cambia **vehículo** a "Automóvil" → los números bajan (~35% del total)
3. Cambia **provincia** a "Santiago" → solo queda 1 círculo, el mapa hace zoom
4. Click "Limpiar" → vuelve todo al estado inicial con animación
5. Click en un círculo → popup muestra desglose: total, motoristas, % motoristas

## Cómo funciona técnicamente (para el pitch al jurado)

**Antes (broken):**
- 1 query a Supabase con `year_filter: null` → datos agregados sin desglose
- Filtros en cliente no funcionaban porque no había desglose por año

**Después (reactivo):**
- 1 query SELECT a `province_yearly_stats` → trae las ~242 filas year×province
- Toda la lógica de filtrado en cliente (sub-milisegundo)
- Re-agregación dinámica al cambiar cualquier filtro
- MapLibre GL JS aplica transiciones automáticas de 400ms cuando cambia la data

**Por qué esto importa al jurado:**

> "VialRD permite al usuario explorar 30,136 fallecidos viales con 3 dimensiones de filtro
> en tiempo real. Los datos se procesan en el cliente, sin queries adicionales al backend,
> manteniendo la API pública con bajísimo costo operacional (Supabase free tier soporta
> todo el tráfico)."
