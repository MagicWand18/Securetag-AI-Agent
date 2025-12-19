#!/usr/bin/env python3
"""
Script para extraer y consolidar archivos JSON estructurados.
Procesa NIST OSCAL, MITRE ATT&CK, y OWASP ASVS.
"""

import json
from pathlib import Path
from typing import List, Dict, Any
from tqdm import tqdm
import sys

def extract_nist_controls(data: Dict) -> List[Dict]:
    """Extrae controles de NIST SP 800-53 en formato OSCAL."""
    controls = []
    
    try:
        catalog = data.get('catalog', {})
        groups = catalog.get('groups', [])
        
        for group in groups:
            family_id = group.get('id', '')
            family_title = group.get('title', '')
            
            # Procesar controles en el grupo
            for control in group.get('controls', []):
                control_id = control.get('id', '')
                title = control.get('title', '')
                
                # Extraer partes (description, guidance, etc.)
                parts = control.get('parts', [])
                statement = ''
                guidance = ''
                
                for part in parts:
                    part_name = part.get('name', '')
                    prose = part.get('prose', '')
                    
                    if part_name == 'statement':
                        statement = prose
                    elif part_name == 'guidance':
                        guidance = prose
                
                controls.append({
                    'source': 'NIST SP 800-53 Rev 5',
                    'type': 'security_control',
                    'id': control_id,
                    'family': family_title,
                    'title': title,
                    'statement': statement,
                    'guidance': guidance
                })
                
                # Procesar controles anidados (enhancements)
                for enhancement in control.get('controls', []):
                    enh_id = enhancement.get('id', '')
                    enh_title = enhancement.get('title', '')
                    enh_parts = enhancement.get('parts', [])
                    
                    enh_statement = ''
                    enh_guidance = ''
                    
                    for part in enh_parts:
                        part_name = part.get('name', '')
                        prose = part.get('prose', '')
                        
                        if part_name == 'statement':
                            enh_statement = prose
                        elif part_name == 'guidance':
                            enh_guidance = prose
                    
                    controls.append({
                        'source': 'NIST SP 800-53 Rev 5',
                        'type': 'control_enhancement',
                        'id': enh_id,
                        'parent': control_id,
                        'family': family_title,
                        'title': enh_title,
                        'statement': enh_statement,
                        'guidance': enh_guidance
                    })
        
        return controls
        
    except Exception as e:
        print(f"Error extrayendo controles NIST: {e}", file=sys.stderr)
        return []

def extract_mitre_techniques(data: Dict, domain: str) -> List[Dict]:
    """Extrae técnicas de MITRE ATT&CK."""
    techniques = []
    
    try:
        objects = data.get('objects', [])
        
        for obj in objects:
            obj_type = obj.get('type', '')
            
            if obj_type == 'attack-pattern':
                technique_id = obj.get('external_references', [{}])[0].get('external_id', '')
                name = obj.get('name', '')
                description = obj.get('description', '')
                
                # Extraer kill chain phases
                kill_chain = obj.get('kill_chain_phases', [])
                phases = [phase.get('phase_name', '') for phase in kill_chain]
                
                techniques.append({
                    'source': f'MITRE ATT&CK {domain}',
                    'type': 'attack_technique',
                    'id': technique_id,
                    'name': name,
                    'description': description,
                    'kill_chain_phases': ', '.join(phases)
                })
        
        return techniques
        
    except Exception as e:
        print(f"Error extrayendo técnicas MITRE: {e}", file=sys.stderr)
        return []

def extract_owasp_asvs(data: Dict) -> List[Dict]:
    """Extrae requisitos de OWASP ASVS."""
    requirements = []
    
    try:
        # ASVS tiene estructura de categorías y requisitos
        for category_key, category_data in data.items():
            if isinstance(category_data, dict) and 'items' in category_data:
                category_name = category_data.get('name', category_key)
                
                for item in category_data.get('items', []):
                    req_id = item.get('id', '')
                    description = item.get('description', '')
                    level = item.get('level', '')
                    
                    requirements.append({
                        'source': 'OWASP ASVS 5.0',
                        'type': 'security_requirement',
                        'id': req_id,
                        'category': category_name,
                        'description': description,
                        'level': level
                    })
        
        return requirements
        
    except Exception as e:
        print(f"Error extrayendo requisitos ASVS: {e}", file=sys.stderr)
        return []

def extract_d3fend(data: Dict) -> List[Dict]:
    """Extrae técnicas defensivas de MITRE D3FEND."""
    techniques = []
    
    try:
        # D3FEND usa ontología RDF/JSON-LD
        # Buscar técnicas defensivas en el grafo
        graph = data.get('@graph', [])
        
        for node in graph:
            # Las técnicas defensivas tienen el campo 'd3f:d3fend-id'
            d3fend_id = node.get('d3f:d3fend-id')
            
            if d3fend_id:
                label = node.get('rdfs:label', '')
                definition = node.get('d3f:definition', '')
                kb_article = node.get('d3f:kb-article', '')
                
                # Extraer referencias si existen
                references = []
                kb_refs = node.get('d3f:kb-reference', [])
                if isinstance(kb_refs, dict):
                    kb_refs = [kb_refs]
                for ref in kb_refs:
                    if isinstance(ref, dict):
                        ref_id = ref.get('@id', '')
                        if ref_id:
                            references.append(ref_id)
                
                techniques.append({
                    'source': 'MITRE D3FEND',
                    'type': 'defensive_technique',
                    'id': d3fend_id,
                    'name': label,
                    'definition': definition,
                    'kb_article': kb_article,
                    'references': references
                })
        
        return techniques
        
    except Exception as e:
        print(f"Error extrayendo D3FEND: {e}", file=sys.stderr)
        return []

def extract_cisa_kev(data: Dict) -> List[Dict]:
    """Extrae vulnerabilidades conocidas explotadas de CISA KEV."""
    vulnerabilities = []
    
    try:
        vulns = data.get('vulnerabilities', [])
        
        for vuln in vulns:
            vulnerabilities.append({
                'source': 'CISA KEV',
                'type': 'known_exploited_vulnerability',
                'cve_id': vuln.get('cveID', ''),
                'vendor': vuln.get('vendorProject', ''),
                'product': vuln.get('product', ''),
                'name': vuln.get('vulnerabilityName', ''),
                'date_added': vuln.get('dateAdded', ''),
                'short_description': vuln.get('shortDescription', ''),
                'required_action': vuln.get('requiredAction', ''),
                'due_date': vuln.get('dueDate', ''),
                'known_ransomware': vuln.get('knownRansomwareCampaignUse', '')
            })
        
        return vulnerabilities
        
    except Exception as e:
        print(f"Error extrayendo CISA KEV: {e}", file=sys.stderr)
        return []

def main():
    """Procesa todos los archivos JSON"""
    
    base_dir = Path(__file__).parent.parent.parent
    json_dir = base_dir / 'datasets' / 'sources' / 'json'
    output_dir = base_dir / 'datasets' / 'raw'
    
    if not json_dir.exists():
        print(f"❌ Directorio {json_dir} no existe", file=sys.stderr)
        return
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Procesar NIST SP 800-53
    nist_file = json_dir / 'NIST_SP-800-53_rev5_catalog.json'
    if nist_file.exists():
        print(f"📄 Procesando NIST SP 800-53...")
        with open(nist_file, 'r', encoding='utf-8') as f:
            nist_data = json.load(f)
        
        nist_controls = extract_nist_controls(nist_data)
        
        # Guardar en archivo individual
        output_file = output_dir / 'json_nist_sp800-53.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(nist_controls, f, indent=2, ensure_ascii=False)
        
        print(f"  ✓ Extraídos {len(nist_controls)} controles")
        print(f"  ✓ Guardado en: {output_file}")
    
    # Procesar MITRE ATT&CK
    mitre_files = [
        ('MITRE ATT&CK version 18.1 enterprise-attack.json', 'Enterprise', 'json_mitre_enterprise.json'),
        ('MITRE ATT&CK version 18.1 mobile-attack.json', 'Mobile', 'json_mitre_mobile.json'),
        ('MITRE ATT&CK version 18.1 ics-attack.json', 'ICS', 'json_mitre_ics.json')
    ]
    
    for filename, domain, output_name in mitre_files:
        mitre_file = json_dir / filename
        if mitre_file.exists():
            print(f"\n📄 Procesando MITRE ATT&CK {domain}...")
            with open(mitre_file, 'r', encoding='utf-8') as f:
                mitre_data = json.load(f)
            
            techniques = extract_mitre_techniques(mitre_data, domain)
            
            # Guardar en archivo individual
            output_file = output_dir / output_name
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(techniques, f, indent=2, ensure_ascii=False)
            
            print(f"  ✓ Extraídas {len(techniques)} técnicas")
            print(f"  ✓ Guardado en: {output_file}")
    
    # Procesar OWASP ASVS
    asvs_file = json_dir / 'OWASP_Application_Security_Verification_Standard_5.0.0_en.flat.json'
    if asvs_file.exists():
        print(f"\n📄 Procesando OWASP ASVS...")
        with open(asvs_file, 'r', encoding='utf-8') as f:
            asvs_data = json.load(f)
        
        requirements = extract_owasp_asvs(asvs_data)
        
        # Guardar en archivo individual
        output_file = output_dir / 'json_owasp_asvs.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(requirements, f, indent=2, ensure_ascii=False)
        
        print(f"  ✓ Extraídos {len(requirements)} requisitos")
        print(f"  ✓ Guardado en: {output_file}")
    
    # Procesar MITRE D3FEND
    d3fend_file = json_dir / 'd3fend.json'
    if d3fend_file.exists():
        print(f"\n📄 Procesando MITRE D3FEND...")
        with open(d3fend_file, 'r', encoding='utf-8') as f:
            d3fend_data = json.load(f)
        
        techniques = extract_d3fend(d3fend_data)
        
        # Guardar en archivo individual
        output_file = output_dir / 'json_d3fend.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(techniques, f, indent=2, ensure_ascii=False)
        
        print(f"  ✓ Extraídas {len(techniques)} técnicas defensivas")
        print(f"  ✓ Guardado en: {output_file}")
    
    # Procesar CISA KEV
    kev_file = json_dir / 'cisa_kev.json'
    if kev_file.exists():
        print(f"\n📄 Procesando CISA KEV...")
        with open(kev_file, 'r', encoding='utf-8') as f:
            kev_data = json.load(f)
        
        vulnerabilities = extract_cisa_kev(kev_data)
        
        # Guardar en archivo individual
        output_file = output_dir / 'json_cisa_kev.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(vulnerabilities, f, indent=2, ensure_ascii=False)
        
        print(f"  ✓ Extraídas {len(vulnerabilities)} vulnerabilidades")
        print(f"  ✓ Guardado en: {output_file}")
    
    print(f"\n✅ Extracción de JSON completada!")
    print(f"   Archivos generados en: {output_dir}")

if __name__ == '__main__':
    main()
