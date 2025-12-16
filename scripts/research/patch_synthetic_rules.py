import os
import yaml
import re
from pathlib import Path

RULES_DIR = Path(__file__).parent.parent.parent / 'data' / 'rules' / 'synthetic'

# Mapping heurístico para deducir metadatos
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

DEFAULT_METADATA = {
    'cwe': 'CWE-20: Improper Input Validation',
    'owasp': 'A03:2021 - Injection',
    'category': 'security',
    'technology': ['javascript', 'typescript', 'nodejs'],
    'likelihood': 'MEDIUM',
    'impact': 'HIGH',
    'confidence': 'MEDIUM'
}

def patch_rule(file_path):
    with open(file_path, 'r') as f:
        try:
            data = yaml.safe_load(f)
        except Exception as e:
            print(f"❌ Error leyendo {file_path.name}: {e}")
            return False

    if not data or 'rules' not in data:
        return False

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
             
        search_text = msg + " " + " ".join(vuln_class).lower() + " " + vulnerability_field.lower()
        
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
            
        # Intentar extraer CVE del nombre del archivo o metadatos
        cve_match = re.search(r'CVE-\d{4}-\d+', file_path.name)
        if cve_match:
            cve_id = cve_match.group(0)
            ref_link = f"https://nvd.nist.gov/vuln/detail/{cve_id}"
            if ref_link not in metadata['references']:
                metadata['references'].append(ref_link)
                modified = True
        
        if not metadata['references']:
             # Fallback reference
             metadata['references'].append("https://cwe.mitre.org/data/definitions/20.html")
             modified = True

        rule['metadata'] = metadata

    if modified:
        with open(file_path, 'w') as f:
            yaml.dump(data, f, sort_keys=False, indent=2)
        print(f"✅ Parchado: {file_path.name}")
        return True
    else:
        print(f"🔹 Sin cambios: {file_path.name}")
        return False

def main():
    print(f"🛠️  Iniciando parcheo de reglas en {RULES_DIR}...")
    files = list(RULES_DIR.glob('*.yaml'))
    count = 0
    for f in sorted(files):
        if patch_rule(f):
            count += 1
    print(f"🏁 Finalizado. {count} reglas actualizadas.")

if __name__ == "__main__":
    main()
