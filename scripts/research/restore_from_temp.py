import os
import shutil
import yaml
from pathlib import Path
import sys

# Paths
BASE_DIR = Path(__file__).parent.parent.parent
TEMP_DIR = BASE_DIR / 'scripts' / 'research' / 'temp'
DEST_DIR = BASE_DIR / 'data' / 'rules' / 'synthetic'

REQUIRED_METADATA = ['cwe', 'owasp', 'category', 'technology', 'likelihood', 'impact', 'confidence', 'references']

DEFAULT_METADATA = {
    'category': 'security',
    'technology': ['javascript', 'typescript', 'nodejs'],
    'likelihood': 'MEDIUM',
    'impact': 'HIGH',
    'confidence': 'MEDIUM',
    'cwe': 'CWE-20: Improper Input Validation',
    'owasp': 'A03:2021 - Injection'
}

# Mapping heurístico para deducir metadatos (copiado del patcher)
VULN_MAP = {
    'sql injection': {
        'cwe': 'CWE-89: Improper Neutralization of Special Elements used in an SQL Command',
        'owasp': 'A03:2021 - Injection'
    },
    'command injection': {
        'cwe': 'CWE-78: Improper Neutralization of Special Elements used in an OS Command',
        'owasp': 'A03:2021 - Injection'
    },
    'xss': {
        'cwe': 'CWE-79: Improper Neutralization of Input During Web Page Generation',
        'owasp': 'A03:2021 - Injection'
    },
    'cross-site scripting': {
        'cwe': 'CWE-79: Improper Neutralization of Input During Web Page Generation',
        'owasp': 'A03:2021 - Injection'
    },
    'prototype pollution': {
        'cwe': 'CWE-1321: Improperly Controlled Modification of Object Prototype Attributes',
        'owasp': 'A06:2021 - Vulnerable and Outdated Components'
    },
    'deserialization': {
        'cwe': 'CWE-502: Deserialization of Untrusted Data',
        'owasp': 'A08:2021 - Software and Data Integrity Failures'
    },
    'path traversal': {
        'cwe': 'CWE-22: Improper Limitation of a Pathname to a Restricted Directory',
        'owasp': 'A01:2021 - Broken Access Control'
    },
    'remote code execution': {
        'cwe': 'CWE-94: Improper Control of Generation of Code',
        'owasp': 'A03:2021 - Injection'
    },
    'ssrf': {
        'cwe': 'CWE-918: Server-Side Request Forgery (SSRF)',
        'owasp': 'A10:2021 - Server-Side Request Forgery (SSRF)'
    }
}

def patch_and_validate(rule_path):
    """
    Lee una regla, intenta parcharla si le falta metadata, y retorna (True, contenido_yaml) si es válida.
    """
    try:
        with open(rule_path, 'r') as f:
            data = yaml.safe_load(f)
    except Exception as e:
        return False, f"Error YAML: {e}"

    if not data or 'rules' not in data:
        return False, "Formato inválido (falta 'rules')"

    modified = False
    for rule in data['rules']:
        metadata = rule.get('metadata', {})
        
        # 1. Asegurar campos base
        if 'category' not in metadata:
            metadata['category'] = DEFAULT_METADATA['category']
            modified = True
        
        if 'technology' not in metadata:
            metadata['technology'] = DEFAULT_METADATA['technology']
            modified = True
            
        if 'likelihood' not in metadata:
            metadata['likelihood'] = DEFAULT_METADATA['likelihood']
            modified = True
            
        if 'impact' not in metadata:
            metadata['impact'] = DEFAULT_METADATA['impact']
            modified = True
            
        if 'confidence' not in metadata:
            metadata['confidence'] = DEFAULT_METADATA['confidence']
            modified = True

        # 2. Deducir CWE/OWASP si faltan
        msg = rule.get('message', '').lower()
        vuln_class = metadata.get('vulnerability_class', [])
        if isinstance(vuln_class, str): vuln_class = [vuln_class]
        
        # Unir fuentes de texto para búsqueda
        vulnerability_field = metadata.get('vulnerability', '')
        if isinstance(vulnerability_field, list):
             vulnerability_field = " ".join(vulnerability_field)
             
        search_text = msg + " " + " ".join([str(v).lower() for v in vuln_class]) + " " + str(vulnerability_field).lower()
        
        found_map = None
        for key, val in VULN_MAP.items():
            if key in search_text:
                found_map = val
                break
        
        if 'cwe' not in metadata:
            metadata['cwe'] = found_map['cwe'] if found_map else DEFAULT_METADATA['cwe']
            modified = True
            
        if 'owasp' not in metadata:
            metadata['owasp'] = found_map['owasp'] if found_map else DEFAULT_METADATA['owasp']
            modified = True

        # 3. References (CVE link)
        if 'references' not in metadata:
            metadata['references'] = []
            
        if not metadata['references']:
             # Fallback reference
             metadata['references'].append("https://cwe.mitre.org/data/definitions/20.html")
             modified = True

        rule['metadata'] = metadata

    return True, yaml.dump(data, sort_keys=False, indent=2)

def main():
    print(f"📦 Restaurando reglas desde {TEMP_DIR} a {DEST_DIR}...")
    
    if not TEMP_DIR.exists():
        print("❌ Directorio temporal no encontrado.")
        sys.exit(1)
        
    DEST_DIR.mkdir(parents=True, exist_ok=True)
    
    restored_count = 0
    skipped_count = 0
    error_count = 0
    
    for temp_file in TEMP_DIR.glob("*.yaml"):
        dest_file = DEST_DIR / temp_file.name
        
        if dest_file.exists():
            print(f"⏭️  Saltando (ya existe): {temp_file.name}")
            skipped_count += 1
            continue
            
        # Validar y Parchar antes de copiar
        is_valid, content_or_error = patch_and_validate(temp_file)
        
        if is_valid:
            try:
                with open(dest_file, 'w') as f:
                    f.write(content_or_error)
                print(f"✅ Restaurado y parchado: {temp_file.name}")
                restored_count += 1
            except Exception as e:
                print(f"❌ Error escribiendo {dest_file.name}: {e}")
                error_count += 1
        else:
            print(f"⚠️  Saltando inválido: {temp_file.name} ({content_or_error})")
            error_count += 1
            
    print("-" * 50)
    print(f"📊 Resumen de Restauración:")
    print(f"   ✅ Restaurados: {restored_count}")
    print(f"   ⏭️  Omitidos (Ya existían): {skipped_count}")
    print(f"   ❌ Errores/Inválidos: {error_count}")

if __name__ == "__main__":
    main()
