#!/usr/bin/env python3
"""
VialRD — ETL de DIGESETT
Importa fallecimientos por accidentes de tránsito desde el portal de datos
abiertos del Estado dominicano (datos.gob.do) hacia Supabase.

Uso:
    python import_digesett.py [--dry-run]

Requiere variables de entorno:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY  (NO la anon key — necesitamos bypass de RLS)
"""

import os
import sys
import argparse
import json
import logging
from datetime import datetime
from pathlib import Path

import requests
import pandas as pd
from supabase import create_client, Client

# ============================================================
# Setup
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
log = logging.getLogger('vialrd-etl')

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SERVICE_ROLE:
    log.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno')
    sys.exit(1)

# ============================================================
# Constantes
# ============================================================
# Dataset oficial: fallecimientos por accidentes de tránsito DIGESETT 2016-2026
# https://datos.gob.do/dataset/estadistica-de-fallecimientos-por-accidentes-de-transito
CKAN_BASE = 'https://datos.gob.do/api/3/action'
DATASET_ID = 'estadistica-de-fallecimientos-por-accidentes-de-transito'

VEHICLE_MAPPING = {
    'motocicleta': 'motocicleta',
    'motor': 'motocicleta',
    'motoconcho': 'motocicleta',
    'auto': 'automovil',
    'carro': 'automovil',
    'jeep': 'automovil',
    'camion': 'vehiculo_pesado',
    'guagua': 'transporte_publico',
    'autobus': 'transporte_publico',
    'bicicleta': 'bicicleta',
    'peaton': 'peaton',
}


def normalize_vehicle(raw: str) -> str:
    if not raw:
        return 'desconocido'
    raw_lower = str(raw).strip().lower()
    for key, normalized in VEHICLE_MAPPING.items():
        if key in raw_lower:
            return normalized
    return 'otro'


def normalize_gender(raw: str) -> str:
    if not raw:
        return 'desconocido'
    raw_lower = str(raw).strip().lower()
    if raw_lower.startswith('m') or raw_lower in ('h', 'hombre'):
        return 'masculino'
    if raw_lower.startswith('f'):
        return 'femenino'
    return 'desconocido'


# ============================================================
# CKAN fetcher
# ============================================================
def fetch_dataset_resources():
    """Devuelve la lista de recursos (CSVs) del dataset DIGESETT."""
    url = f'{CKAN_BASE}/package_show?id={DATASET_ID}'
    log.info('Buscando recursos del dataset DIGESETT...')
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    if not payload.get('success'):
        raise RuntimeError(f'CKAN respondió error: {payload}')
    return payload['result']['resources']


def fetch_csv(resource_url: str) -> pd.DataFrame:
    log.info(f'Descargando: {resource_url}')
    df = pd.read_csv(resource_url, low_memory=False)
    log.info(f'  → {len(df):,} filas')
    return df


# ============================================================
# Transformación
# ============================================================
def transform_row(row: pd.Series) -> dict | None:
    """Convierte una fila cruda a nuestro schema. Devuelve None si la fila es inválida."""
    try:
        # Parse de fecha (muchos formatos posibles)
        date_raw = row.get('fecha') or row.get('Fecha') or row.get('FECHA')
        if pd.isna(date_raw):
            return None
        incident_date = pd.to_datetime(date_raw, errors='coerce', dayfirst=True).date()
        if not incident_date:
            return None

        province = (
            row.get('provincia') or row.get('Provincia') or row.get('PROVINCIA') or 'No especificado'
        )

        vehicle = normalize_vehicle(
            row.get('tipo_vehiculo') or row.get('Tipo_Vehiculo') or row.get('medio_transporte')
        )

        gender = normalize_gender(
            row.get('genero') or row.get('Genero') or row.get('sexo')
        )

        hour = None
        hour_raw = row.get('hora') or row.get('Hora')
        if pd.notna(hour_raw):
            try:
                hour = int(str(hour_raw).split(':')[0])
                if not (0 <= hour <= 23):
                    hour = None
            except (ValueError, TypeError):
                hour = None

        return {
            'incident_date': incident_date.isoformat(),
            'hour_of_day': hour,
            'province': str(province).strip(),
            'municipality': str(row.get('municipio') or '').strip() or None,
            'fatalities': int(row.get('fallecidos', 1)),
            'injured': int(row.get('heridos', 0) or 0),
            'vehicle_type': vehicle,
            'victim_age_range': str(row.get('rango_edad') or '').strip() or None,
            'victim_gender': gender,
            'source': 'DIGESETT',
            'source_dataset_url': f'https://datos.gob.do/dataset/{DATASET_ID}',
            'raw_data': json.loads(row.to_json()),
        }
    except Exception as e:
        log.debug(f'Fila rechazada: {e}')
        return None


# ============================================================
# Inserción en Supabase
# ============================================================
def upsert_batch(client: Client, rows: list[dict], dry_run: bool = False):
    if not rows:
        return 0
    if dry_run:
        log.info(f'[DRY-RUN] Insertaría {len(rows)} filas. Primera: {rows[0]}')
        return len(rows)

    # Insertar en batches de 500 para no rebasar límites
    BATCH = 500
    total = 0
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        res = client.table('accidents_official').insert(chunk).execute()
        total += len(chunk)
        log.info(f'  insertadas {total:,} / {len(rows):,}')
    return total


# ============================================================
# Main
# ============================================================
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', help='No insertar, solo simular')
    parser.add_argument('--csv', type=str, help='CSV local (en lugar de descargar de CKAN)')
    args = parser.parse_args()

    client = create_client(SUPABASE_URL, SERVICE_ROLE)

    # Obtener datos
    if args.csv:
        log.info(f'Leyendo CSV local: {args.csv}')
        df = pd.read_csv(args.csv, low_memory=False)
    else:
        resources = fetch_dataset_resources()
        csv_resources = [r for r in resources if r.get('format', '').upper() == 'CSV']
        if not csv_resources:
            log.error('No se encontraron recursos CSV en el dataset')
            sys.exit(1)
        # Tomar el más reciente
        latest = max(csv_resources, key=lambda r: r.get('last_modified') or '')
        df = fetch_csv(latest['url'])

    log.info(f'Transformando {len(df):,} filas...')
    rows = []
    for _, row in df.iterrows():
        transformed = transform_row(row)
        if transformed:
            rows.append(transformed)

    log.info(f'Filas válidas tras transformación: {len(rows):,}')

    if rows:
        inserted = upsert_batch(client, rows, dry_run=args.dry_run)
        log.info(f'✓ ETL completo: {inserted:,} registros procesados')
    else:
        log.warning('No hay filas válidas para insertar')


if __name__ == '__main__':
    main()
