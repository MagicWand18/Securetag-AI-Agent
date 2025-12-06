import json
import time
import requests
import concurrent.futures
from pathlib import Path
from typing import Dict, List, Optional
from bs4 import BeautifulSoup


def get_epss_score(cve_id: str) -> float:
    """
    Consulta REAL a la API de FIRST.org para obtener el EPSS (Exploit Prediction Scoring System).
    No requiere API Key, es pública y gratuita.
    """
    url = f"https://api.first.org/data/v1/epss?cve={cve_id}"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("data"):
                return float(data["data"][0].get("epss", 0.0))
    except Exception as e:
        print(f"⚠️ Error fetching EPSS for {cve_id}: {e}")
    return 0.0

def get_cvedetails_info(cve_id: str) -> Dict:
    """
    Scraping REAL de CVEDetails para obtener CWE, Productos Afectados y Referencias.
    Esto es vital porque NVD a veces es lento actualizando referencias de exploits.
    """
    url = f"https://www.cvedetails.com/cve/{cve_id}/"
    
    try:
        # User-Agent realista para evitar bloqueo simple
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 1. Extraer CWE ID
            cwe_id = "Unknown"
            # Buscar en tablas o enlaces específicos
            cwe_link = soup.find('a', href=lambda x: x and 'cwe_details' in x)
            if cwe_link:
                cwe_id = cwe_link.text.strip()
            
            # 2. Extraer Referencias de Exploits (Github, Exploit-DB, PacketStorm)
            refs = []
            # CVEDetails suele tener una tabla de referencias o listado
            # Buscamos cualquier link externo que parezca un exploit
            for link in soup.find_all('a', href=True):
                href = link['href']
                lower_href = href.lower()
                if any(x in lower_href for x in ["github.com", "exploit-db.com", "packetstormsecurity.com", "rapid7.com"]):
                    refs.append(href)
            
            # 3. Extraer CVSS Vector si no lo teníamos
            cvss_vector = ""
            cvss_div = soup.find('div', class_='cvssbox')
            if cvss_div:
                cvss_vector = cvss_div.text.strip()

            return {
                "cwe_id": cwe_id,
                "external_refs": list(set(refs))[:10], # Top 10 referencias
                "cvss_vector_scraped": cvss_vector
            }
            
    except Exception as e:
        print(f"⚠️ Error scraping CVEDetails for {cve_id}: {e}")
        
    return {}


def fetch_exploit_code(refs: List[str]) -> str:
    """
    Intenta obtener fragmentos de código de explotación REAL desde enlaces de GitHub y Exploit-DB.
    Esto es lo que realmente necesita GPT-5.1 para entender el ataque.
    """
    code_snippet = ""
    for ref in refs:
        # Estrategia 1: GitHub RAW
        if "github.com" in ref and "blob" in ref:
            # Convertir github blob url a raw
            raw_url = ref.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")
            try:
                resp = requests.get(raw_url, timeout=5)
                if resp.status_code == 200:
                    content = resp.text
                    lines = content.split('\n')[:50]
                    code_snippet += f"\n--- Exploit Code from {ref} ---\n"
                    code_snippet += "\n".join(lines)
                    code_snippet += "\n...\n"
                    break 
            except Exception:
                pass

        # Estrategia 2: Exploit-DB RAW
        elif "exploit-db.com/exploits/" in ref:
            try:
                # Extraer ID del exploit
                exploit_id = ref.split("/")[-1]
                if not exploit_id.isdigit(): continue
                
                # Construir URL de descarga (Requiere User-Agent)
                # Nota: Exploit-DB protege /download/, pero a veces /raw/ funciona o el scraping directo
                # Intentamos scraping directo a la página del exploit para buscar el bloque de código
                headers = {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
                resp = requests.get(ref, headers=headers, timeout=5)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, 'html.parser')
                    # Buscar el bloque de código <code class="language-python"> o similar, o un <textarea>
                    code_block = soup.find('code') or soup.find('textarea') or soup.find('pre')
                    
                    if code_block:
                        content = code_block.get_text()
                        lines = content.split('\n')[:50]
                        code_snippet += f"\n--- Exploit Code from {ref} ---\n"
                        code_snippet += "\n".join(lines)
                        code_snippet += "\n...\n"
                        break
            except Exception:
                pass

    return code_snippet

def process_cve(cve: Dict) -> Dict:
    """Procesa un único CVE para enriquecerlo."""
    cve_id = cve['id']
    
    try:
        # 1. Obtener EPSS
        epss = get_epss_score(cve_id)
        
        # 2. Obtener detalles técnicos (CWE, Refs)
        details = get_cvedetails_info(cve_id)
        refs = details.get('external_refs', [])
        
        # 3. EXTRAER CÓDIGO DE EXPLOIT (Nuevo paso crítico)
        exploit_code = fetch_exploit_code(refs)
        
        # 4. Construir objeto enriquecido
        enriched_cve = cve.copy()
        enriched_cve['epss'] = epss
        enriched_cve['cwe_id'] = details.get('cwe_id', 'Unknown')
        enriched_cve['references'] = refs
        enriched_cve['exploit_snippet'] = exploit_code
        
        # 5. Generar "Contexto Técnico" Potenciado
        context_str = f"Vulnerability {cve_id} ({enriched_cve['cwe_id']}). "
        if epss > 0.1:
            context_str += f"HIGH exploitation probability ({epss*100:.1f}%). "
        
        if exploit_code:
            context_str += "\n\nREAL EXPLOIT CODE FOUND:\n" + exploit_code
            
        enriched_cve['ai_context'] = context_str
        return enriched_cve
    except Exception as e:
        print(f"❌ Error processing {cve_id}: {e}")
        return cve

def enrich_cves():
    input_file = Path("trending_cves.json")
    output_file = Path("trending_cves_enriched.json")
    
    if not input_file.exists():
        print("❌ No se encontró trending_cves.json")
        return

    with open(input_file, 'r') as f:
        cves = json.load(f)
        
    print(f"🚀 Iniciando enriquecimiento PROFUNDO de {len(cves)} CVEs usando 10 hilos...")
    
    # Priorizar los de CISA KEV
    priority_cves = [c for c in cves if c.get('source') == 'CISA_KEV']
    other_cves = [c for c in cves if c.get('source') != 'CISA_KEV']
    
    # PROCESAMIENTO COMPLETO (Sin límites)
    target_list = priority_cves + other_cves
    
    enriched_data = []
    
    # Usar ThreadPoolExecutor para concurrencia
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        # Mapear la función process_cve a la lista de targets
        future_to_cve = {executor.submit(process_cve, cve): cve for cve in target_list}
        
        completed = 0
        for future in concurrent.futures.as_completed(future_to_cve):
            cve = future_to_cve[future]
            try:
                data = future.result()
                enriched_data.append(data)
                completed += 1
                if completed % 10 == 0 or completed == len(target_list):
                    print(f"   [{completed}/{len(target_list)}] Procesados...")
            except Exception as exc:
                print(f"   {cve['id']} generó una excepción: {exc}")
        
    print(f"\n✅ Enriquecimiento completado. {len(enriched_data)} CVEs procesados.")
    
    with open(output_file, 'w') as f:
        json.dump(enriched_data, f, indent=2)
    print(f"💾 Guardado en {output_file}")

if __name__ == "__main__":
    enrich_cves()
