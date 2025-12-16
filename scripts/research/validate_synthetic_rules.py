import os
import yaml
import sys
from pathlib import Path

# Directorios
BASE_DIR = Path(__file__).parent.parent.parent
RULES_DIR = BASE_DIR / 'data' / 'rules' / 'synthetic'

REQUIRED_FIELDS = ['id', 'message', 'languages', 'severity', 'metadata', 'patterns']
REQUIRED_METADATA = ['cwe', 'owasp', 'category', 'technology', 'likelihood', 'impact', 'confidence', 'references']

def validate_rule_file(file_path):
    try:
        with open(file_path, 'r') as f:
            data = yaml.safe_load(f)
            
        if not data or 'rules' not in data:
            return False, "Formato inválido: Falta clave 'rules' raíz"
            
        for rule in data['rules']:
            # Check root fields
            for field in REQUIRED_FIELDS:
                if field == 'patterns':
                    # Handle taint mode which uses pattern-sources/sinks instead of patterns
                    if 'mode' in rule and rule['mode'] == 'taint':
                        if 'pattern-sources' not in rule or 'pattern-sinks' not in rule:
                             return False, "Regla en modo taint debe tener pattern-sources y pattern-sinks"
                    elif 'patterns' not in rule and 'pattern' not in rule and 'pattern-either' not in rule:
                        return False, "Falta campo obligatorio: patterns (o pattern/pattern-either)"
                elif field not in rule:
                    return False, f"Falta campo obligatorio: {field}"
            
            # Check metadata fields
            metadata = rule.get('metadata', {})
            for meta_field in REQUIRED_METADATA:
                if meta_field not in metadata:
                    return False, f"Falta campo de metadata: {meta_field}"
                    
        return True, "OK"
    except Exception as e:
        return False, f"Error de parsing: {str(e)}"

def main():
    print(f"🔍 Validando reglas en {RULES_DIR}...")
    
    if not RULES_DIR.exists():
        print(f"❌ Directorio no encontrado: {RULES_DIR}")
        sys.exit(1)
        
    files = list(RULES_DIR.glob('*.yaml'))
    if not files:
        print("⚠️ No se encontraron archivos YAML.")
        sys.exit(0)
        
    passed = 0
    failed = 0
    
    print(f"{'ARCHIVO':<40} | {'ESTADO':<10} | {'DETALLE'}")
    print("-" * 100)
    
    for file_path in sorted(files):
        is_valid, message = validate_rule_file(file_path)
        status = "✅ PASS" if is_valid else "❌ FAIL"
        if is_valid:
            passed += 1
        else:
            failed += 1
            
        print(f"{file_path.name:<40} | {status:<10} | {message}")
        
    print("-" * 100)
    print(f"📊 Resumen: {passed} correctas, {failed} fallidas. Total: {len(files)}")

if __name__ == "__main__":
    main()
