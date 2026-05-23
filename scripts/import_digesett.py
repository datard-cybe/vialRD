#!/usr/bin/env python3
"""
VialRD — ETL de DIGESETT
Descarga los datasets oficiales de fallecimientos por accidentes de transito
del portal datos.gob.do / digesett.gob.do, los procesa y los carga a Supabase.

Uso:
    cd scripts
    pip install -r requirements.txt
    python import_digesett.py

Variables de entorno requeridas (en archivo .env):
    SUPABASE_URL=https://xxx.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=eyJ...   (NO la anon, necesitamos bypass RLS)
"""
import os
import sys
import json
import logging
from pathlib import Path
from io import BytesIO

import requests
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

# ============================================================
# Config
# ============================================================
load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
log = logging.getLogger('digesett-etl')

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SERVICE_ROLE:
    log.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
    log.error('Crea un archivo .env basado en .env.example en la carpeta scripts/')
    sys.exit(1)

# Cargar centroides
SCRIPT_DIR = Path(__file__).parent
with open(SCRIPT_DIR / 'data' / 'rd_provinces.json') as f:
    PROVINCE_CENTROIDS = json.load(f)

# URLs directos de digesett.gob.do
DIGESETT_BASE = 'http://digesett.gob.do/transparencia/index.php/estadisticas/category/359-datos-abiertos'
DATASETS = {
    'provincia':       {'download': '400', 'slug': 'fallecimientos-segun-provincia'},
    'medio_transporte':{'download': '394', 'slug': 'fallecimientos-segun-medio-de-transporte'},
    'mes':             {'download': '397', 'slug': 'fallecimientos-segun-meses'},
    'edad':            {'download': '403', 'slug': 'fallecimientos-segun-rango-de-edad'},
    'genero':          {'download': '389', 'slug': 'fallecimientos-segun-genero'},
    'hora':            {'download': '391', 'slug': 'fallecimientos-segun-intervalo-de-horas'},
    'dia_semana':      {'download': '385', 'slug': 'fallecimientos-segun-dia-de-la-semana'},
    'tipo_accidente':  {'download': '409', 'slug': 'fallecimientos-segun-tipo-de-accidente'},
    'regional':        {'download': '406', 'slug': 'fallecimientos-segun-regionales'},
}

PROVINCE_NORMALIZE = {
    'Distrito Nacional': 'Distrito Nacional',
    'Santo Domingo': 'Santo Domingo',
    'Santiago': 'Santiago',
    'La Vega': 'La Vega',
    'San Cristobal': 'San Cristobal',
    'Puerto Plata': 'Puerto Plata',
    'Duarte': 'Duarte',
    'San Pedro de Macoris': 'San Pedro de Macoris',
    'La Romana': 'La Romana',
    'La Altagracia': 'La Altagracia',
    'Peravia': 'Peravia',
    'Azua': 'Azua',
    'Barahona': 'Barahona',
    'Monsenor Nouel': 'Monsenor Nouel',
    'Sanchez Ramirez': 'Sanchez Ramirez',
    'San Juan': 'San Juan',
    'San Juan de la Maguana': 'San Juan',
    'Espaillat': 'Espaillat',
    'Hermanas Mirabal': 'Hermanas Mirabal',
    'Salcedo': 'Hermanas Mirabal',
    'Valverde': 'Valverde',
    'Monte Cristi': 'Monte Cristi',
    'Montecristi': 'Monte Cristi',
    'Dajabon': 'Dajabon',
    'Santiago Rodriguez': 'Santiago Rodriguez',
    'Samana': 'Samana',
    'Maria Trinidad Sanchez': 'Maria Trinidad Sanchez',
    'Hato Mayor': 'Hato Mayor',
    'El Seibo': 'El Seibo',
    'El Seybo': 'El Seibo',
    'Monte Plata': 'Monte Plata',
    'San Jose de Ocoa': 'San Jose de Ocoa',
    'Bahoruco': 'Bahoruco',
    'Baoruco': 'Bahoruco',
    'Independencia': 'Independencia',
    'Pedernales': 'Pedernales',
    'Elias Pina': 'Elias Pina',
}


def normalize_text(s):
    """Quita acentos para hacer match mas tolerante."""
    if not s or pd.isna(s):
        return None
    import unicodedata
    s = str(s).strip()
    nfkd = unicodedata.normalize('NFKD', s)
    return ''.join([c for c in nfkd if not unicodedata.combining(c)])


def normalize_province(raw):
    if not raw or pd.isna(raw):
        return None
    key = normalize_text(raw)
    if not key:
        return None
    # Buscar en mapping (sin acentos)
    normalized = PROVINCE_NORMALIZE.get(key, key)
    # Buscar en centroides (que tienen acentos)
    for prov_key in PROVINCE_CENTROIDS.keys():
        if normalize_text(prov_key) == normalized:
            return prov_key
    return None


# ============================================================
# Download
# ============================================================
def download_xlsx(dataset_key):
    """Lee XLSX desde carpeta local data/raw/ en vez de descargar."""
    info = DATASETS[dataset_key]
    local_path = SCRIPT_DIR / 'data' / 'raw' / f"{dataset_key}.xlsx"

    if not local_path.exists():
        log.warning(f"  Archivo no encontrado: {local_path}")
        log.warning(f"  Descárgalo manualmente desde datos.gob.do y renómbralo a {dataset_key}.xlsx")
        return None

    try:
        sheets = pd.read_excel(local_path, sheet_name=None, header=None)
        log.info(f"  OK {dataset_key}: {len(sheets)} hoja(s) leídas desde {local_path.name}")
        return sheets
    except Exception as e:
        log.warning(f"  Error parseando {local_path.name}: {e}")
        return None


# ============================================================
# Upsert
# ============================================================
def upsert_provinces(client, rows):
    if not rows:
        log.warning('No hay rows de provincia para insertar')
        return 0

    log.info(f'Preparando {len(rows)} rows de province_yearly_stats...')
    payload = []
    for r in rows:
        centroid = PROVINCE_CENTROIDS.get(r['province'])
        if not centroid:
            continue
        payload.append({
            'province': r['province'],
            'year': r['year'],
            'fatalities': r['fatalities'],
            'location': f"POINT({centroid['lng']} {centroid['lat']})",
            'source': 'DIGESETT',
            'source_url': 'https://datos.gob.do/dataset/estadistica-de-fallecimientos-por-accidentes-de-transito'
        })

    BATCH = 500
    inserted = 0
    for i in range(0, len(payload), BATCH):
        chunk = payload[i:i + BATCH]
        try:
            client.table('province_yearly_stats').upsert(
                chunk, on_conflict='province,year,source'
            ).execute()
            inserted += len(chunk)
            log.info(f'  upserted {inserted}/{len(payload)}')
        except Exception as e:
            log.error(f'  Error en batch {i}: {e}')
    return inserted


def upsert_aggregates(client, category, rows):
    if not rows:
        return 0

    by_year = {}
    for r in rows:
        y = r['year']
        if y not in by_year:
            by_year[y] = {}
        by_year[y][r['label']] = r['count']

    all_years = {}
    for r in rows:
        all_years[r['label']] = all_years.get(r['label'], 0) + r['count']

    # Insertar por ano
    payload_years = []
    for y, data in by_year.items():
        payload_years.append({
            'category': category,
            'year': y,
            'data': data,
            'source': 'DIGESETT'
        })

    try:
        client.table('aggregate_stats').upsert(
            payload_years, on_conflict='category,year,source'
        ).execute()
    except Exception as e:
        log.warning(f'  Error upsert {category} con anos: {e}')

    # Total acumulado (year=NULL): borrar e insertar
    try:
        client.table('aggregate_stats').delete().eq('category', category).is_('year', 'null').execute()
        client.table('aggregate_stats').insert({
            'category': category,
            'year': None,
            'data': all_years,
            'source': 'DIGESETT'
        }).execute()
    except Exception as e:
        log.warning(f'  Error insert {category} total: {e}')

    log.info(f'  OK aggregate_stats[{category}]: {len(payload_years) + 1} rows')
    return len(payload_years) + 1


# ============================================================
# Main
# ============================================================
def run():
    client = create_client(SUPABASE_URL, SERVICE_ROLE)
    log.info('===========================================')
    log.info('VialRD ETL - DIGESETT')
    log.info('===========================================')

    # 1) Provincia
    log.info('')
    log.info('[1] Cargando dataset: PROVINCIA')
    sheets = download_xlsx('provincia')
    if sheets:
        rows = parse_province_dataset(sheets)
        log.info(f'  Parseadas {len(rows)} filas validas')
        if rows:
            sample = rows[:3]
            log.info(f'  Muestra: {sample}')
        upsert_provinces(client, rows)

    # 2) Agregados
    for ds_key in ['medio_transporte', 'mes', 'edad', 'genero', 'hora', 'dia_semana', 'tipo_accidente']:
        log.info('')
        log.info(f'[2] Cargando dataset: {ds_key.upper()}')
        sheets = download_xlsx(ds_key)
        if sheets:
            rows = parse_generic_aggregate(sheets)
            log.info(f'  {len(rows)} filas parseadas')
            upsert_aggregates(client, ds_key, rows)

    log.info('')
    log.info('===========================================')
    log.info('ETL completado')
    log.info('===========================================')


if __name__ == '__main__':
    run()
