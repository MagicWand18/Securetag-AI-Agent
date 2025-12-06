import os
import yaml
import json
from pathlib import Path
from typing import List, Dict

# Configuración
SIGMA_ROOT = Path("../../datasets/sources/yml/sigma_rules/rules")
OUTPUT_FILE = Path("sast_candidates_from_sigma.json")

# Filtros de interés para SAST
# Buscamos reglas que detecten ataques a aplicaciones web o frameworks, 
# ya que estos suelen tener contrapartes en código inseguro.
TARGET_CATEGORIES = ["web", "application"]
TARGET_PRODUCTS = ["django", "spring", "struts", "tomcat", "weblogic", "nodejs", "python", "php", "java", "sql"]
IGNORE_KEYWORDS = ["process_creation", "file_event", "network", "cloud", "windows", "linux", "macos"]

def is_relevant_for_sast(rule_path: Path, rule_content: Dict) -> bool:
    """
    Determina si una regla Sigma es candidata para inspirar una regla SAST.
    Criterio: Detecta explotación de vulnerabilidades en aplicaciones web/frameworks.
    """
    # 1. Filtrar por ruta/categoría
    path_str = str(rule_path).lower()
    if not any(cat in path_str for cat in TARGET_CATEGORIES):
        return False
        
    # 2. Filtrar por producto/servicio
    logsource = rule_content.get("logsource", {})
    product = logsource.get("product", "").lower()
    category = logsource.get("category", "").lower()
    service = logsource.get("service", "").lower()
    
    if not (any(p in product for p in TARGET_PRODUCTS) or 
            any(p in service for p in TARGET_PRODUCTS) or
            category in ["web_server", "application"]):
        return False

    # 3. Filtrar ruido (Eventos de SO puros)
    if any(k in category for k in IGNORE_KEYWORDS):
        return False
        
    return True

def extract_sast_context(rule: Dict) -> str:
    """
    Extrae un contexto rico para GPT.
    """
    title = rule.get("title", "Unknown Rule")
    description = rule.get("description", "")
    tags = rule.get("tags", [])
    detection = rule.get("detection", {})
    
    # Intentar extraer palabras clave de detección para dar pistas
    keywords = []
    for key, value in detection.items():
        if key == "condition": continue
        if isinstance(value, list):
            keywords.extend([str(v) for v in value if isinstance(v, (str, int))])
        elif isinstance(value, dict):
            # Buscar listas dentro de diccionarios (ej. selections)
            for k, v in value.items():
                if isinstance(v, list):
                    keywords.extend([str(x) for x in v if isinstance(x, (str, int))])

    context = f"""
    Threat Detection Rule: {title}
    Description: {description}
    Attack Tags: {', '.join(tags)}
    Suspicious Keywords/Patterns (Runtime): {', '.join(keywords[:20])}
    """
    return context

def main():
    print("🔍 Analizando repositorio de reglas Sigma para candidatos SAST...")
    
    candidates = []
    processed_count = 0
    
    if not SIGMA_ROOT.exists():
        print(f"❌ No se encontró el directorio {SIGMA_ROOT}")
        return

    for rule_file in SIGMA_ROOT.rglob("*.yml"):
        processed_count += 1
        try:
            with open(rule_file, 'r') as f:
                # Sigma a veces tiene múltiples docs por archivo
                docs = list(yaml.safe_load_all(f))
                
            for doc in docs:
                if not doc or 'title' not in doc: continue
                
                if is_relevant_for_sast(rule_file, doc):
                    candidate = {
                        "id": doc.get("id", str(rule_file.name)),
                        "title": doc.get("title"),
                        "description": doc.get("description"),
                        "source_file": str(rule_file),
                        "ai_context": extract_sast_context(doc),
                        "source": "sigma_threat_intel"
                    }
                    candidates.append(candidate)
                    print(f"   ✅ Candidato encontrado: {candidate['title']}")
                    
        except Exception as e:
            # print(f"⚠️ Error leyendo {rule_file}: {e}")
            pass
            
    print(f"\n📊 Resumen:")
    print(f"   Total archivos analizados: {processed_count}")
    print(f"   Candidatos SAST identificados: {len(candidates)}")
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(candidates, f, indent=2)
        
    print(f"💾 Guardado en {OUTPUT_FILE}")
    print("\n💡 Ahora puedes usar este archivo como input adicional en synthetic_rules_gen.py")

if __name__ == "__main__":
    main()
