import os
import yaml
import json
from pathlib import Path
from collections import defaultdict

RULES_DIR = Path("../../data/rules")

def analyze_rules():
    print("🔍 Iniciando análisis de reglas existentes...")
    
    inventory = {
        "total_rules": 0,
        "by_language": defaultdict(int),
        "by_category": defaultdict(int),
        "by_cwe": defaultdict(int),
        "by_owasp": defaultdict(int),
        "missing_coverage": []
    }
    
    # Recorrer todos los archivos YAML en data/rules
    for rule_file in RULES_DIR.rglob("*.yaml"):
        if "synthetic" in str(rule_file): continue # Ignorar sintéticas por ahora
        
        try:
            with open(rule_file, 'r') as f:
                # Usar safe_load_all porque algunos archivos tienen múltiples reglas
                docs = list(yaml.safe_load_all(f))
                
            for doc in docs:
                if not doc or 'rules' not in doc: continue
                
                for rule in doc['rules']:
                    inventory["total_rules"] += 1
                    
                    # Lenguajes
                    langs = rule.get('languages', [])
                    for lang in langs:
                        inventory["by_language"][lang] += 1
                        
                    # Metadata
                    meta = rule.get('metadata', {})
                    
                    # Categoría
                    cat = meta.get('category', 'unknown')
                    inventory["by_category"][cat] += 1
                    
                    # CWE
                    cwes = meta.get('cwe', [])
                    if isinstance(cwes, str): cwes = [cwes]
                    for cwe in cwes:
                        # Normalizar CWE (ej. "CWE-89: ..." -> "CWE-89")
                        cwe_id = cwe.split(':')[0].strip()
                        inventory["by_cwe"][cwe_id] += 1
                        
                    # OWASP
                    owasps = meta.get('owasp', [])
                    if isinstance(owasps, str): owasps = [owasps]
                    for owasp in owasps:
                        # Normalizar OWASP (ej. "A01:2021 - ..." -> "A01:2021")
                        owasp_id = owasp.split('-')[0].strip()
                        inventory["by_owasp"][owasp_id] += 1
                        
        except Exception as e:
            # print(f"⚠️ Error leyendo {rule_file.name}: {e}")
            pass

    # Identificar Gaps (Top 10 OWASP 2021)
    owasp_2021_top = [
        "A01:2021", "A02:2021", "A03:2021", "A04:2021", "A05:2021",
        "A06:2021", "A07:2021", "A08:2021", "A09:2021", "A10:2021"
    ]
    
    print("\n📊 Resumen del Inventario:")
    print(f"   Total de reglas: {inventory['total_rules']}")
    
    print("\n📝 Top 5 Lenguajes:")
    for lang, count in sorted(inventory['by_language'].items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"   - {lang}: {count}")
        
    print("\n🛡️ Cobertura OWASP Top 10 (2021):")
    for cat in owasp_2021_top:
        count = inventory['by_owasp'].get(cat, 0)
        status = "✅ Cubierto" if count > 10 else "⚠️ Baja Cobertura" if count > 0 else "❌ SIN COBERTURA"
        print(f"   - {cat}: {count} reglas ({status})")
        if count < 5:
            inventory["missing_coverage"].append(cat)

    # Guardar inventario para el script principal
    with open("rules_inventory.json", "w") as f:
        json.dump(inventory, f, indent=2)
        
    print(f"\n💾 Inventario guardado en rules_inventory.json")

if __name__ == "__main__":
    analyze_rules()
