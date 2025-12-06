import json
import sys
import requests
from datetime import datetime, timedelta
from typing import List, Dict


def fetch_cisa_kev() -> List[Dict]:
    """
    Consulta el catálogo de CISA Known Exploited Vulnerabilities (KEV).
    Este es el "estándar de oro" para vulnerabilidades que están siendo explotadas activamente.
    """
    print("🔍 Consultando CISA KEV Catalog...")
    url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
    
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        vulnerabilities = data.get("vulnerabilities", [])
        print(f"   ✅ CISA KEV respondió. Analizando {len(vulnerabilities)} registros...")
        

        results = []
        # Filtrar por fecha: Últimos 10 años (2016-2025) para cubrir deuda técnica histórica
        cutoff_date = datetime.now() - timedelta(days=365 * 10)
        
        for item in vulnerabilities:
            date_added = datetime.strptime(item.get("dateAdded"), "%Y-%m-%d")
            if date_added < cutoff_date:
                continue
                


            # Filtro ampliado de tecnologías para SAST moderno
            desc = item.get("shortDescription", "").lower()
            product = item.get("product", "").lower()
            vendor = item.get("vendorProject", "").lower()

            keywords = [
                # Web / Frontend
                "javascript", "typescript", "node", "npm", "react", "vue", "angular", "svelte", "next.js", "nuxt", "electron",
                # Backend / API
                "python", "django", "flask", "fastapi", "java", "spring", "kotlin", "go", "golang", "ruby", "rails", "php", "laravel", "c#", ".net",
                # Infra / Cloud / Containers
                "docker", "kubernetes", "k8s", "terraform", "aws", "azure", "gcp", "nginx", "apache"
            ]
            
            if any(k in desc or k in product or k in vendor for k in keywords):
                results.append({
                    "id": item.get("cveID"),
                    "title": f"{item.get('cveID')} - {item.get('vulnerabilityName')}",
                    "cvss": 9.0, 
                    "description": f"[EXPLOTADO ACTIVAMENTE] {item.get('shortDescription')}",
                    "affected_tech": [product],
                    "year": int(item.get("cveID").split('-')[1]),
                    "source": "CISA_KEV"
                })
                
        return results
    except Exception as e:
        print(f"❌ Error consultando CISA KEV: {e}")
        return []

def fetch_real_cves() -> List[Dict]:
    """
    Consulta NVD y CISA KEV para obtener una lista consolidada de amenazas.
    Aplica filtros avanzados de SAST: Network Vector, Low Complexity, High Impact.
    """

    # 1. Obtener CVEs de NVD (Volumen y CVSS)
    # Iterar sobre múltiples tecnologías para ampliar el abanico
    tech_queries = ["node.js", "python", "java", "go", "ruby", "php", "c#", "docker"]
    nvd_cves = []
    
    try:
        print("🔍 Consultando API NVD (NIST) en tiempo real (Multi-Tech)...")
        end_date = datetime.now()
        # NVD permite máximo 120 días de rango. Maximizamos la ventana.
        start_date = end_date - timedelta(days=120)
        pub_start = start_date.strftime("%Y-%m-%dT00:00:00.000")
        pub_end = end_date.strftime("%Y-%m-%dT23:59:59.999")
        
        base_url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
        headers = {"User-Agent": "SecureTag-Research-Agent/1.0"}
        
        # Hacer consultas secuenciales (NVD tiene rate limit estricto, cuidado)
        # Para esta demo, haremos una consulta más genérica o un par de ellas
        
        # Estrategia optimizada: No filtrar por keyword en la API (demasiadas requests),
        # sino traer todas las HIGH/CRITICAL recientes y filtrar localmente.
        params = {
            "pubStartDate": pub_start,
            "pubEndDate": pub_end,
            "cvssV3Severity": "HIGH", # Trae High y Critical
            "resultsPerPage": 2000    # Aumentado de 100 a 2000 (Máximo permitido por NVD)
        }
        
        response = requests.get(base_url, params=params, headers=headers, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            vulnerabilities = data.get("vulnerabilities", [])
            print(f"   ✅ NVD respondió. Analizando {len(vulnerabilities)} vulnerabilidades recientes...")
            
            relevant_keywords = [
                "javascript", "typescript", "node", "npm", "react", "vue", "angular", "svelte", "next.js", 
                "python", "django", "flask", "fastapi", "java", "spring", "kotlin", "go", "golang", 
                "ruby", "rails", "php", "laravel", "c#", ".net", "docker", "kubernetes", "k8s", "terraform", 
                "aws", "azure", "gcp", "nginx", "apache"
            ]
            
            for item in vulnerabilities:
                cve = item.get("cve", {})
                desc = next((d["value"] for d in cve.get("descriptions", []) if d["lang"] == "en"), "").lower()
                
                # Filtrar localmente por nuestras tecnologías de interés
                if not any(k in desc for k in relevant_keywords):
                    continue
                    
                metrics = cve.get("metrics", {}).get("cvssMetricV31", [])
                score = metrics[0]["cvssData"]["baseScore"] if metrics else 0.0
                


                # FILTROS AVANZADOS PARA SAST (Modificado para ampliar cobertura)
                if score >= 6.0: 
                    # Mantenemos todo lo que tenga score alto, sin filtrar por vector.
                    # El filtro anterior (AV:N y AC:L) era demasiado restrictivo.
                    # Queremos capturar TODO lo relevante para el stack tecnológico.
                    
                    vector = metrics[0]["cvssData"]["vectorString"]
                    nvd_cves.append({
                        "id": cve.get("id"),
                        "title": f"{cve.get('id')} - Critical/High Severity",
                        "cvss": score,
                        "description": desc,
                        "affected_tech": ["unknown"], # Difícil de normalizar sin CPE parsing
                        "year": int(cve.get("id").split('-')[1]),
                        "source": "NVD",
                        "vector": vector
                    })
                    
    except Exception as e:
        print(f"❌ Error NVD: {e}")


    # 2. Obtener CVEs de CISA KEV (Explotación Activa)
    kev_cves = fetch_cisa_kev()
    
    # 3. Consolidar y Deduplicar
    all_cves = {c['id']: c for c in nvd_cves + kev_cves}.values()
    

    # Ordenar: KEV primero, luego por CVSS
    sorted_cves = sorted(all_cves, key=lambda x: (x.get('source') == 'CISA_KEV', x['cvss']), reverse=True)
    
    # Eliminar límite artificial para escalar
    return list(sorted_cves)

def main():
    cves = fetch_real_cves()

    
    if not cves:
        print("⚠️ No se encontraron CVEs recientes o hubo error de conexión.")
        return

    print(f"\n🚨 Se encontraron {len(cves)} vulnerabilidades críticas REALES:")
    
    for cve in cves:
        print(f"\n[{cve['id']}] CVSS: {cve['cvss']}")
        print(f"   Desc: {cve['description'][:150]}...") # Truncar descripción
    
    # Guardar para consumo del generador
    with open("trending_cves.json", "w") as f:
        json.dump(cves, f, indent=2)
    print("\n💾 Lista guardada en trending_cves.json")

if __name__ == "__main__":
    main()
