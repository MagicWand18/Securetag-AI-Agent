#!/usr/bin/env python3
"""
Script para extraer y consolidar archivos YAML.
Procesa MITRE CAR y Sigma Rules.
"""

import json
import yaml
from pathlib import Path
from typing import List, Dict, Any
from tqdm import tqdm
import sys

def extract_mitre_car_analytics(car_dir: Path) -> List[Dict]:
    """Extrae analíticas de MITRE CAR."""
    analytics = []
    
    analytics_dir = car_dir / 'analytics'
    if not analytics_dir.exists():
        print(f"  ⚠️  Directorio analytics/ no encontrado en {car_dir}", file=sys.stderr)
        return []
    
    yaml_files = sorted(analytics_dir.glob('*.yaml'))
    
    for yaml_file in tqdm(yaml_files, desc="  Procesando CAR analytics", leave=False):
        try:
            with open(yaml_file, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
            
            if not data:
                continue
            
            # Extraer campos relevantes
            analytic = {
                'id': data.get('id', yaml_file.stem),
                'title': data.get('title', ''),
                'submission_date': data.get('submission_date', ''),
                'description': data.get('description', ''),
                'coverage': data.get('coverage', []),
                'implementations': data.get('implementations', []),
                'data_model_references': data.get('data_model_references', []),
                'source': 'MITRE CAR',
                'type': 'cyber_analytic'
            }
            
            analytics.append(analytic)
            
        except Exception as e:
            print(f"  Error procesando {yaml_file}: {e}", file=sys.stderr)
            continue
    
    return analytics

def extract_sigma_rules(rules_folder: Path) -> List[Dict]:
    """Extrae reglas de Sigma de una carpeta específica."""
    rules = []
    
    # Buscar todos los archivos YAML recursivamente en la carpeta
    yaml_files = list(rules_folder.rglob('*.yml'))
    
    for yaml_file in tqdm(yaml_files, desc=f"    Procesando {rules_folder.name}", leave=False):
        try:
            with open(yaml_file, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
            
            if not data or not isinstance(data, dict):
                continue
            
            # Extraer campos relevantes de Sigma
            rule = {
                'id': data.get('id', ''),
                'title': data.get('title', ''),
                'status': data.get('status', ''),
                'description': data.get('description', ''),
                'references': data.get('references', []),
                'author': data.get('author', ''),
                'date': str(data.get('date', '')) if data.get('date') else '',
                'modified': str(data.get('modified', '')) if data.get('modified') else '',
                'tags': data.get('tags', []),
                'logsource': data.get('logsource', {}),
                'detection': data.get('detection', {}),
                'falsepositives': data.get('falsepositives', []),
                'level': data.get('level', ''),
                'source': 'Sigma Rules',
                'type': 'detection_rule',
                'file_path': str(yaml_file.relative_to(rules_folder.parent))
            }
            
            rules.append(rule)
            
        except Exception as e:
            print(f"  Error procesando {yaml_file}: {e}", file=sys.stderr)
            continue
    
    return rules

def main():
    """Procesa todos los archivos YAML"""
    
    # Directorios base
    base_dir = Path(__file__).parent.parent.parent
    yml_dir = base_dir / 'datasets' / 'sources' / 'yml'
    output_dir = base_dir / 'datasets' / 'raw'
    
    # Crear directorio de salida si no existe
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("📚 Procesando archivos YAML...\n")
    
    # Procesar MITRE CAR
    car_dir = yml_dir / 'mitre_car'
    if car_dir.exists():
        print(f"📂 Procesando MITRE CAR...")
        car_data = extract_mitre_car_analytics(car_dir)
        
        # Guardar en archivo individual
        output_file = output_dir / 'yml_mitre_car.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(car_data, f, indent=2, ensure_ascii=False)
        
        print(f"  ✓ Guardado: {output_file}")
        print(f"  ✓ Analíticas procesadas: {len(car_data)}\n")
    
    # Procesar Sigma Rules - generar un JSON por cada carpeta rules-*
    sigma_base_dir = yml_dir / 'sigma_rules'
    if sigma_base_dir.exists():
        # Buscar todas las carpetas que empiecen con "rules"
        rules_folders = [d for d in sigma_base_dir.iterdir() if d.is_dir() and d.name.startswith('rules')]
        
        print(f"📂 Procesando Sigma Rules ({len(rules_folders)} carpetas)...")
        
        for rules_folder in sorted(rules_folders):
            folder_name = rules_folder.name
            print(f"  📁 Procesando {folder_name}...")
            
            sigma_data = extract_sigma_rules(rules_folder)
            
            if sigma_data:
                # Nombre de archivo basado en el nombre de la carpeta
                # rules -> main, rules-compliance -> compliance, etc.
                if folder_name == 'rules':
                    suffix = 'main'
                else:
                    suffix = folder_name.replace('rules-', '').replace('-', '_')
                
                output_file = output_dir / f'yml_sigma_{suffix}.json'
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(sigma_data, f, indent=2, ensure_ascii=False)
                
                print(f"    ✓ Guardado: {output_file}")
                print(f"    ✓ Reglas procesadas: {len(sigma_data)}")
        
        print()
    
    print(f"✅ Extracción de YAML completada!\n")

if __name__ == '__main__':
    main()
