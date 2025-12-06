import os
import json
import sys
import time
import subprocess
import yaml
from pathlib import Path
from typing import Dict, List, Optional
from dotenv import load_dotenv
from openai import OpenAI

# Cargar configuración
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-5.1')

# Directorios
BASE_DIR = Path(__file__).parent.parent.parent
RULES_DIR = BASE_DIR / 'data' / 'rules' / 'synthetic'
TEMP_DIR = BASE_DIR / 'scripts' / 'research' / 'temp'

RULES_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Inicializar cliente OpenAI
if not OPENAI_API_KEY:
    print("❌ Error: OPENAI_API_KEY no encontrada en .env")
    sys.exit(1)

client = OpenAI(api_key=OPENAI_API_KEY)

def analyze_sast_feasibility(cve_id: str, description: str, ai_context: str) -> Dict:
    """
    Analiza si es VIABLE crear una regla SAST para este CVE.
    Filtra vulnerabilidades que no son detectables en código fuente (ej: bugs de memoria en binarios, configs de red).
    """
    prompt = f"""
    Actúa como un arquitecto de seguridad experto en análisis estático (SAST).
    
    Vulnerabilidad: {cve_id}
    Descripción: {description}
    Contexto Técnico: {ai_context}
    
    Pregunta: ¿Es posible detectar esta vulnerabilidad de forma confiable analizando ÚNICAMENTE el código fuente de una aplicación (JavaScript/TypeScript/Node.js) buscando patrones de uso inseguro de APIs o lógica defectuosa?
    
    Criterios de EXCLUSIÓN (Responde NO si aplica alguno):
    - Es un bug de memoria en un componente compilado (C/C++) como navegadores, kernels, drivers (ej: Buffer Overflow en Chrome).
    - Es un problema de configuración de infraestructura o red.
    - Es una vulnerabilidad en una librería de terceros que se soluciona actualizando (SCA), no cambiando el código propio.
    - Requiere ejecución dinámica para detectarse.
    
    Responde con un JSON puro:
    {{
        "feasible": true/false,
        "reason": "Explicación breve de por qué sí o por qué no",
        "suggested_approach": "SAST" | "SCA" | "DAST" | "Manual"
    }}
    """
    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"⚠️ Error en análisis de viabilidad para {cve_id}: {e}")
        # En caso de error, asumimos False para no gastar tokens en vano
        return {"feasible": False, "reason": f"Error API: {e}", "suggested_approach": "Manual"}

def generate_code(cwe_id: str, description: str) -> Dict[str, str]:
    """Genera código vulnerable y seguro para un CWE dado."""
    prompt = f"""
    Actúa como un experto en seguridad de aplicaciones.
    Objetivo: Generar ejemplos de código JavaScript/Node.js para probar reglas de detección SAST.
    
    Vulnerabilidad: {cwe_id} - {description}
    
    Genera un JSON con dos campos:
    1. 'vulnerable_code': Un snippet de código Node.js realista que contenga esta vulnerabilidad. Debe ser simple pero funcional.
    2. 'safe_code': Un snippet similar que realice la misma función pero de forma SEGURA (corregido).
    
    Formato de respuesta esperado (JSON puro):
    {{
        "vulnerable_code": "...",
        "safe_code": "..."
    }}
    """
    
    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.2
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"❌ Error generando código para {cwe_id}: {e}")
        return {}


def check_existing_rules(cwe_id: str) -> bool:
    """Verifica si ya existe una regla para este CWE en el repositorio local."""
    # 1. Verificar en reglas sintéticas generadas
    if (RULES_DIR / f"{cwe_id}.yaml").exists():
        return True
        
    # 2. Verificar en reglas comunitarias (búsqueda básica por nombre de archivo o contenido)
    # Esto es una heurística simple; en producción se podría parsear el YAML
    try:
        # Buscar recursivamente en data/rules
        result = subprocess.run(
            ['grep', '-r', cwe_id, str(BASE_DIR / 'data' / 'rules')],
            capture_output=True, text=True
        )
        return len(result.stdout) > 0
    except Exception:
        return False


def generate_rule(cve_id: str, description: str, vulnerable_code: str, feedback: str = "", ai_context: str = "") -> str:
    """Genera una regla Semgrep YAML para detectar la vulnerabilidad, considerando feedback previo."""
    
    feedback_prompt = ""
    if feedback:
        feedback_prompt = f"""
        ❌ INTENTO ANTERIOR FALLIDO:
        {feedback}
        
        Por favor, ajusta la regla para corregir este error.
        - Si falló en detectar el código vulnerable: Haz el patrón más genérico o revisa la sintaxis.
        - Si detectó el código seguro (falso positivo): Haz el patrón más específico o añade exclusiones (pattern-not).
        """

    prompt = f"""
    Actúa como un experto en ingeniería de detección de Semgrep.
    Objetivo: Crear una regla Semgrep para detectar {cve_id}.
    
    CONTEXTO DE INTELIGENCIA DE AMENAZAS (CRÍTICO):
    {ai_context}
    
    Código Vulnerable de referencia:
    ```javascript
    {vulnerable_code}
    ```
    
    {feedback_prompt}
    
    Requisitos de la regla:
    1. ID de la regla: `synthetic-{cve_id.lower().replace('-', '')}`
    2. Lenguaje: javascript, typescript
    3. Mensaje: Debe explicar por qué es peligroso citando el CVE y el contexto de explotación.
    4. Severidad: ERROR
    5. Patrón: Debe hacer match con el código vulnerable proporcionado, pero ser lo suficientemente genérico para variantes similares.
    6. Metadata: Incluye 'cve': '{cve_id}' y 'source': 'CISA_KEV' si aplica.
    
    RESTRICCIONES TÉCNICAS (MUY IMPORTANTE PARA EVITAR WARNINGS):
    - NO uses 'pattern-sources' ni 'pattern-sinks' a menos que especifiques 'mode: taint'. Por defecto usa 'mode: search' (implícito) y usa 'patterns' o 'pattern-either'.
    - 'metavariables' DEBE estar dentro de un bloque 'pattern-inside' o similar, nunca al nivel raíz de 'patterns'.
    - NO uses campos obsoletos como 'message-format'.
    - Si usas 'fix:', asegúrate de que el código de reemplazo sea sintácticamente válido y completo. Si no puedes garantizarlo, NO incluyas 'fix'.
    
    Devuelve SOLO el contenido YAML de la regla.
    """
    
    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2
        )
        content = response.choices[0].message.content
        # Limpiar bloques de código markdown si existen
        if content.startswith('```yaml'):
            content = content.replace('```yaml', '').replace('```', '')
        elif content.startswith('```'):
            content = content.replace('```', '')
        return content.strip()
    except Exception as e:
        print(f"❌ Error generando regla para {cve_id}: {e}")
        return ""

def validate_rule(rule_path: Path, vuln_path: Path, safe_path: Path) -> tuple[bool, str]:
    """
    Valida una regla Semgrep ejecutándola contra código vulnerable y seguro.
    Retorna (True, "") si pasa, o (False, "razón del fallo") si no.
    """
    try:
        # 1. Test contra código vulnerable (Debe detectar)
        # semgrep --config <rule> <file> --json
        result_vuln = subprocess.run(
            ['semgrep', '--config', str(rule_path), str(vuln_path), '--json'],
            capture_output=True, text=True
        )
        try:
            data_vuln = json.loads(result_vuln.stdout)
        except json.JSONDecodeError:
            return False, f"Semgrep output invalido (Vuln): {result_vuln.stderr}"
            
        if not data_vuln.get('results'):
            return False, "La regla no detectó el código vulnerable (False Negative)."

        # 2. Test contra código seguro (No debe detectar)
        result_safe = subprocess.run(
            ['semgrep', '--config', str(rule_path), str(safe_path), '--json'],
            capture_output=True, text=True
        )
        try:
            data_safe = json.loads(result_safe.stdout)
        except json.JSONDecodeError:
             return False, f"Semgrep output invalido (Safe): {result_safe.stderr}"

        if data_safe.get('results'):
            return False, "La regla detectó el código seguro (False Positive)."

        return True, ""
    except Exception as e:
        return False, f"Error de ejecución de Semgrep: {e}"

def main():
    print(f"🚀 Iniciando Generador de Reglas Sintéticas con {OPENAI_MODEL}...")
    
    targets = []
    
    # 1. Cargar CVEs Enriquecidos (Prioridad Máxima)
    enriched_file = Path("trending_cves_enriched.json")
    cve_file = Path("trending_cves.json")
    
    # Preferir el archivo enriquecido si existe
    source_file = enriched_file if enriched_file.exists() else cve_file
    
    if source_file.exists():
        print(f"📂 Cargando objetivos desde {source_file.name}...")
        with open(source_file, 'r') as f:
            cves = json.load(f)
            # Procesar TODOS los CVEs
            for cve in cves:
                targets.append({
                    "id": cve['id'],
                    "desc": cve.get('description', ''),
                    "ai_context": cve.get('ai_context', ''), # Nuevo campo vital
                    "source": "cve-monitor"
                })
    
    # 3. Cargar Candidatos desde Sigma (Nueva Fuente de Inteligencia)
    sigma_file = Path("sast_candidates_from_sigma.json")
    if sigma_file.exists():
        print(f"📂 Cargando {sigma_file.name} (Inteligencia de Amenazas Sigma)...")
        try:
            with open(sigma_file, 'r') as f:
                sigma_rules = json.load(f)
                # Integrar candidatos Sigma a la lista de targets
                for s in sigma_rules:
                    targets.append({
                        "id": s['id'], # ID de la regla Sigma
                        "desc": s['title'] + " - " + s.get('description', ''),
                        "ai_context": s.get('ai_context', ''),
                        "source": "sigma-threat-intel"
                    })
        except Exception as e:
            print(f"⚠️ Error cargando reglas Sigma: {e}")

    # 4. Cargar Gaps del Inventario (Prioridad Media)
    inventory_file = Path("rules_inventory.json")
    if inventory_file.exists():
        pass
        
    if not targets:
        print("⚠️ No se encontraron objetivos. Ejecuta cve_monitor.py primero.")
        targets = [
            {"id": "CWE-89", "desc": "SQL Injection in Node.js using string concatenation", "source": "static"}
        ]
    
    print(f"🎯 Objetivos totales: {len(targets)}")
    
    skipped_log = []
    skipped_file = TEMP_DIR / "skipped_cves.json"
    
    # Cargar omitidos previos si existen
    if skipped_file.exists():
        try:
            with open(skipped_file, 'r') as f:
                skipped_log = json.load(f)
            print(f"📚 Cargados {len(skipped_log)} CVEs omitidos previamente.")
        except Exception:
            print("⚠️ Error cargando log de omitidos, iniciando nuevo.")
            
    # Crear set de IDs omitidos para búsqueda rápida
    skipped_ids = {item['id'] for item in skipped_log}
    
    # --- Lógica de Failed CVEs ---
    failed_log = []
    failed_file = TEMP_DIR / "failed_cves.json"
    if failed_file.exists():
        try:
            with open(failed_file, 'r') as f:
                failed_log = json.load(f)
            print(f"📉 Cargados {len(failed_log)} CVEs fallidos previamente.")
        except Exception:
            print("⚠️ Error cargando log de fallidos, iniciando nuevo.")
    
    # Mapear ID -> Objeto completo para recuperar la razón
    failed_map = {item['id']: item for item in failed_log}
    # -----------------------------
    
    for i, target in enumerate(targets):
        cwe_id = target['id']
        ai_context = target.get('ai_context', '')

        # 0. Verificar duplicados (Reglas ya creadas)
        if check_existing_rules(cwe_id):
            continue
            
        # 0.1 Verificar si ya fue omitido previamente
        if cwe_id in skipped_ids:
            continue

        print(f"\n🔹 [{i+1}/{len(targets)}] Procesando {cwe_id}...")
            
        # 0.2 Configurar Feedback Histórico si falló previamente
        initial_feedback = ""
        if cwe_id in failed_map:
            print(f"   🔄 Reintentando CVE previamente fallido. Inyectando contexto de error previo...")
            prev_fail = failed_map[cwe_id]
            prev_reason = prev_fail.get('reason', 'Unknown reason')
            prev_rule = prev_fail.get('failed_rule', '(No rule content saved)')
            
            initial_feedback = f"""
            HISTORICAL FAILURE ANALYSIS (PREVIOUS SESSION):
            Last failure reason: {prev_reason}
            
            Failed Rule Candidate from previous session:
            ```yaml
            {prev_rule}
            ```
            
            Please analyze why this rule failed (e.g. syntax error, false positive, false negative) and generate a BETTER one.
            """
        
        # 1. ANÁLISIS DE VIABILIDAD SAST (Nuevo filtro)
        print("   Analizando viabilidad SAST...")
        feasibility = analyze_sast_feasibility(cwe_id, target['desc'], ai_context)
        
        if not feasibility.get('feasible', False):
            reason = feasibility.get('reason', 'Unknown')
            approach = feasibility.get('suggested_approach', 'Manual')
            print(f"   ⏭️  OMITIDO: No es viable para SAST. ({reason}) -> Sugerido: {approach}")
            
            # Agregar a log y guardar inmediatamente para persistencia
            new_skip = {
                "id": cwe_id,
                "reason": reason,
                "approach": approach
            }
            skipped_log.append(new_skip)
            skipped_ids.add(cwe_id) # Actualizar set en memoria
            
            with open(skipped_file, 'w') as f:
                json.dump(skipped_log, f, indent=2)
                
            continue

        # 2. Generar Código (usando contexto enriquecido si existe)
        print("   ✅ Viable. Generando código de prueba...")
        # Si tenemos contexto rico, lo pasamos al generador de código para que sea más preciso
        desc_for_code = target['desc']
        if ai_context:
            desc_for_code += f"\n\nCONTEXT: {ai_context}"
            
        code_data = generate_code(cwe_id, desc_for_code)
        if not code_data: continue
        
        vuln_path = TEMP_DIR / f"{cwe_id}_vuln.js"
        safe_path = TEMP_DIR / f"{cwe_id}_safe.js"
        
        with open(vuln_path, 'w') as f: f.write(code_data['vulnerable_code'])
        with open(safe_path, 'w') as f: f.write(code_data['safe_code'])
        
        # 2. Generar Regla (Iterativo con Feedback)
        max_retries = 3
        success = False
        last_feedback = initial_feedback # Usar feedback histórico si existe
        
        rule_yaml = "" # Para guardar la última generada
        
        for attempt in range(max_retries):
            print(f"   Generating rule (Attempt {attempt+1})...")
            # Pasamos ai_context a la función de generación de regla
            rule_yaml = generate_rule(cwe_id, target['desc'], code_data['vulnerable_code'], last_feedback, ai_context)
            
            rule_path = TEMP_DIR / f"{cwe_id}.yaml"
            with open(rule_path, 'w') as f: f.write(rule_yaml)
            
            # 3. Validar
            is_valid, reason = validate_rule(rule_path, vuln_path, safe_path)
            
            if is_valid:
                print(f"   ✅ Regla validada exitosamente!")
                # Mover a directorio final
                final_path = RULES_DIR / f"{cwe_id}.yaml"
                with open(final_path, 'w') as f: f.write(rule_yaml)
                success = True
                
                # Limpiar de lista de fallidos si existía
                if cwe_id in failed_map:
                    failed_log = [x for x in failed_log if x['id'] != cwe_id]
                    failed_map.pop(cwe_id, None)
                    with open(failed_file, 'w') as f:
                        json.dump(failed_log, f, indent=2)
                break
            else:
                print(f"   ⚠️ Fallo: {reason}")
                last_feedback = reason
                print("   🔄 Reintentando con feedback...")
        
        if not success:
            print(f"   ❌ No se pudo generar una regla válida para {cwe_id} tras {max_retries} intentos.")
            
            # Registrar fallo (Upsert)
            new_fail = {
                "id": cwe_id,
                "reason": last_feedback,
                "attempts": max_retries,
                "failed_rule": rule_yaml
            }
            
            # Actualizar o agregar
            found = False
            for idx, item in enumerate(failed_log):
                if item['id'] == cwe_id:
                    failed_log[idx] = new_fail
                    found = True
                    break
            if not found:
                failed_log.append(new_fail)
            
            # Actualizar mapa en memoria también
            failed_map[cwe_id] = new_fail
            
            with open(failed_file, 'w') as f:
                json.dump(failed_log, f, indent=2)


if __name__ == "__main__":
    main()
