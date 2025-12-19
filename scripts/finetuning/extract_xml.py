#!/usr/bin/env python3
"""
Script para extraer contenido de archivos XML.
Procesa: CAPEC (Common Attack Pattern Enumeration and Classification)
"""

import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict

def extract_capec(xml_path: Path) -> List[Dict]:
    """Extrae patrones de ataque de CAPEC XML."""
    patterns = []
    
    try:
        print(f"  📄 Parseando XML...")
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        # Namespace de CAPEC
        ns = {'capec': 'http://capec.mitre.org/capec-3'}
        
        # Buscar todos los Attack_Patterns
        attack_patterns = root.findall('.//capec:Attack_Pattern', ns)
        
        print(f"  📊 Encontrados {len(attack_patterns)} patrones de ataque")
        
        for pattern in attack_patterns:
            try:
                # Extraer ID y nombre
                pattern_id = pattern.get('ID', '')
                name = pattern.get('Name', '')
                status = pattern.get('Status', '')
                
                # Extraer descripción
                description_elem = pattern.find('capec:Description', ns)
                description = description_elem.text if description_elem is not None else ''
                
                # Extraer likelihood of attack
                likelihood_elem = pattern.find('capec:Likelihood_Of_Attack', ns)
                likelihood = likelihood_elem.text if likelihood_elem is not None else ''
                
                # Extraer severity
                severity_elem = pattern.find('capec:Typical_Severity', ns)
                severity = severity_elem.text if severity_elem is not None else ''
                
                # Extraer prerequisites
                prerequisites = []
                prereq_section = pattern.find('capec:Prerequisites', ns)
                if prereq_section is not None:
                    for prereq in prereq_section.findall('capec:Prerequisite', ns):
                        if prereq.text:
                            prerequisites.append(prereq.text.strip())
                
                # Extraer mitigations
                mitigations = []
                mitigation_section = pattern.find('capec:Mitigations', ns)
                if mitigation_section is not None:
                    for mitigation in mitigation_section.findall('capec:Mitigation', ns):
                        if mitigation.text:
                            mitigations.append(mitigation.text.strip())
                
                # Extraer related attack patterns
                related_patterns = []
                related_section = pattern.find('capec:Related_Attack_Patterns', ns)
                if related_section is not None:
                    for related in related_section.findall('capec:Related_Attack_Pattern', ns):
                        related_id = related.get('CAPEC_ID', '')
                        if related_id:
                            related_patterns.append(related_id)
                
                # Extraer CWE relacionados
                related_cwes = []
                cwe_section = pattern.find('capec:Related_Weaknesses', ns)
                if cwe_section is not None:
                    for cwe in cwe_section.findall('capec:Related_Weakness', ns):
                        cwe_id = cwe.get('CWE_ID', '')
                        if cwe_id:
                            related_cwes.append(f'CWE-{cwe_id}')
                
                # Construir objeto del patrón
                pattern_obj = {
                    'id': f'CAPEC-{pattern_id}',
                    'name': name,
                    'status': status,
                    'description': description.strip() if description else '',
                    'likelihood': likelihood,
                    'severity': severity,
                    'prerequisites': prerequisites,
                    'mitigations': mitigations,
                    'related_patterns': related_patterns,
                    'related_cwes': related_cwes,
                    'source': 'CAPEC',
                    'type': 'attack_pattern'
                }
                
                patterns.append(pattern_obj)
                
            except Exception as e:
                print(f"  ⚠ Error procesando patrón {pattern.get('ID', 'unknown')}: {e}", file=sys.stderr)
                continue
        
        return patterns
        
    except Exception as e:
        print(f"  ✗ Error parseando XML: {e}", file=sys.stderr)
        return []

def main():
    """Procesa archivos XML"""
    
    # Directorios base
    base_dir = Path(__file__).parent.parent.parent
    xml_dir = base_dir / 'datasets' / 'sources' / 'xml'
    output_dir = base_dir / 'datasets' / 'raw'
    
    # Crear directorio de salida si no existe
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("📚 Procesando archivos XML...\n")
    
    # Procesar CAPEC
    capec_file = xml_dir / 'capec_latest.xml'
    if capec_file.exists():
        print(f"📂 Procesando CAPEC...")
        capec_data = extract_capec(capec_file)
        
        if capec_data:
            output_file = output_dir / 'xml_capec.json'
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(capec_data, f, indent=2, ensure_ascii=False)
            
            print(f"  ✓ Guardado: {output_file}")
            print(f"  ✓ Patrones procesados: {len(capec_data)}\n")
    else:
        print(f"  ⚠ No se encontró: {capec_file}\n")
    
    print(f"✅ Extracción de XML completada!\n")
    print(f"📊 Estadísticas:")
    print(f"   - Total de patrones CAPEC: {len(capec_data) if capec_data else 0}")

if __name__ == '__main__':
    main()
