#!/usr/bin/env python3
"""
Script para extraer y consolidar contenido de archivos HTML de fuentes Tier 1.
Procesa: OWASP API Security Top 10, PTES, SANS Top 25
"""

import json
import sys
from pathlib import Path
from bs4 import BeautifulSoup
from typing import List, Dict

def clean_html_content(html_content: str) -> str:
    """Limpia y extrae texto de contenido HTML."""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Eliminar scripts, estilos y navegación
    for element in soup(['script', 'style', 'nav', 'header', 'footer']):
        element.decompose()
    
    # Extraer texto
    text = soup.get_text(separator='\n', strip=True)
    
    # Limpiar líneas vacías múltiples
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    return '\n'.join(lines)

def extract_owasp_api(html_dir: Path) -> List[Dict]:
    """Extrae contenido de OWASP API Security Top 10."""
    documents = []
    
    try:
        # Buscar index.html
        index_file = html_dir / 'index.html'
        
        if not index_file.exists():
            print(f"  ⚠ No se encontró index.html en {html_dir}")
            return documents
        
        with open(index_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Extraer título
        title_elem = soup.find('h1')
        title = title_elem.get_text(strip=True) if title_elem else 'OWASP API Security Top 10 2023'
        
        # Extraer tabla de riesgos
        table = soup.find('table')
        risks = []
        
        if table:
            rows = table.find_all('tr')[1:]  # Skip header
            for row in rows:
                cols = row.find_all('td')
                if len(cols) >= 2:
                    risk_name = cols[0].get_text(strip=True)
                    risk_desc = cols[1].get_text(strip=True)
                    risks.append({
                        'risk': risk_name,
                        'description': risk_desc
                    })
        
        # Extraer todo el contenido textual
        content = clean_html_content(html_content)
        
        documents.append({
            'file': 'index.html',
            'title': title,
            'content': content,
            'risks': risks,
            'source': 'OWASP API Security Top 10 2023',
            'type': 'api_security_standard'
        })
        
        print(f"  ✓ Procesado: {index_file.name}")
        
    except Exception as e:
        print(f"  ✗ Error procesando OWASP API: {e}", file=sys.stderr)
    
    return documents

def extract_ptes(html_dir: Path) -> List[Dict]:
    """Extrae contenido de PTES (Penetration Testing Execution Standard)."""
    documents = []
    
    try:
        # Buscar todos los archivos HTML
        html_files = list(html_dir.rglob('*.html'))
        
        if not html_files:
            print(f"  ⚠ No se encontraron archivos HTML en {html_dir}")
            return documents
        
        for html_file in html_files:
            try:
                with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
                    html_content = f.read()
                
                soup = BeautifulSoup(html_content, 'html.parser')
                
                # Extraer título
                title_elem = soup.find('title') or soup.find('h1')
                title = title_elem.get_text(strip=True) if title_elem else html_file.stem
                
                # Extraer contenido principal
                content = clean_html_content(html_content)
                
                # Solo agregar si tiene contenido significativo
                if len(content) > 100:
                    # Convertir a lista de líneas para mejor legibilidad en JSON
                    content_lines = [line for line in content.split('\n') if line.strip()]
                    
                    documents.append({
                        'file': str(html_file.relative_to(html_dir.parent)),
                        'title': title,
                        'content': content_lines,
                        'source': 'PTES',
                        'type': 'pentesting_methodology'
                    })
                    print(f"  ✓ Procesado: {html_file.name} ({len(content)} caracteres)")
                
            except Exception as e:
                print(f"  ✗ Error procesando {html_file.name}: {e}", file=sys.stderr)
                continue
        
    except Exception as e:
        print(f"  ✗ Error general en PTES: {e}", file=sys.stderr)
    
    return documents

def extract_sans_top25(html_file: Path) -> List[Dict]:
    """Extrae contenido de SANS Top 25."""
    documents = []
    
    try:
        if not html_file.exists():
            print(f"  ⚠ No se encontró {html_file}")
            return documents
        
        with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
            html_content = f.read()
        
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Extraer título
        title_elem = soup.find('h1') or soup.find('title')
        title = title_elem.get_text(strip=True) if title_elem else 'SANS Top 25 Most Dangerous Software Weaknesses'
        
        # Extraer contenido
        content = clean_html_content(html_content)
        
        # Intentar extraer la lista de vulnerabilidades
        vulnerabilities = []
        # Buscar listas ordenadas o tablas
        for ol in soup.find_all('ol'):
            for li in ol.find_all('li'):
                vuln_text = li.get_text(strip=True)
                if vuln_text:
                    vulnerabilities.append(vuln_text)
        
        documents.append({
            'file': html_file.name,
            'title': title,
            'content': content,
            'vulnerabilities': vulnerabilities[:25] if vulnerabilities else [],
            'source': 'SANS Top 25',
            'type': 'vulnerability_ranking'
        })
        
        print(f"  ✓ Procesado: {html_file.name}")
        
    except Exception as e:
        print(f"  ✗ Error procesando SANS Top 25: {e}", file=sys.stderr)
    
    return documents

def main():
    """Procesa todos los archivos HTML"""
    
    # Directorios base
    base_dir = Path(__file__).parent.parent.parent
    html_dir = base_dir / 'datasets' / 'sources' / 'html'
    output_dir = base_dir / 'datasets' / 'raw'
    
    # Crear directorio de salida si no existe
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("📚 Procesando archivos HTML...\n")
    
    total_docs = 0
    
    # Procesar OWASP API Security Top 10
    owasp_dir = html_dir / 'owasp_api_top10_2023'
    if owasp_dir.exists():
        print(f"📂 Procesando OWASP API Security Top 10...")
        owasp_data = extract_owasp_api(owasp_dir)
        
        if owasp_data:
            output_file = output_dir / 'html_owasp_api_top10.json'
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(owasp_data, f, indent=2, ensure_ascii=False)
            
            print(f"  ✓ Guardado: {output_file}")
            print(f"  ✓ Documentos procesados: {len(owasp_data)}\n")
            total_docs += len(owasp_data)
    
    # Procesar PTES
    ptes_dir = html_dir / 'ptes'
    if ptes_dir.exists():
        print(f"📂 Procesando PTES...")
        ptes_data = extract_ptes(ptes_dir)
        
        if ptes_data:
            # Consolidar en un solo objeto con lista de documentos
            consolidated = {
                'source': 'PTES',
                'type': 'pentesting_methodology',
                'total_documents': len(ptes_data),
                'documents': ptes_data
            }
            
            output_file = output_dir / 'html_ptes.json'
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(consolidated, f, indent=2, ensure_ascii=False)
            
            print(f"  ✓ Guardado: {output_file}")
            print(f"  ✓ Documentos procesados: {len(ptes_data)}\n")
            total_docs += len(ptes_data)
    
    # Procesar SANS Top 25
    sans_file = html_dir / 'sans_top25_2024.html'
    if sans_file.exists():
        print(f"📂 Procesando SANS Top 25...")
        sans_data = extract_sans_top25(sans_file)
        
        if sans_data:
            output_file = output_dir / 'html_sans_top25.json'
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(sans_data, f, indent=2, ensure_ascii=False)
            
            print(f"  ✓ Guardado: {output_file}")
            print(f"  ✓ Documento(s) procesados: {len(sans_data)}\n")
            total_docs += len(sans_data)
    
    print(f"✅ Extracción de HTML completada!\n")
    print(f"📊 Estadísticas:")
    print(f"   - Total de documentos HTML: {total_docs}")

if __name__ == '__main__':
    main()
