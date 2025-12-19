#!/usr/bin/env python3
"""
Script para extraer contenido de archivos PDF.
Procesa: CIS Controls v8.1, NIST CSF 2.0
"""

import json
import sys
from pathlib import Path
from typing import List, Dict
import PyPDF2

def extract_pdf_content(pdf_path: Path) -> Dict:
    """Extrae texto de un archivo PDF."""
    try:
        with open(pdf_path, 'rb') as f:
            pdf_reader = PyPDF2.PdfReader(f)
            
            total_pages = len(pdf_reader.pages)
            text_content = []
            
            print(f"  📄 Extrayendo {total_pages} páginas...")
            
            for page_num in range(total_pages):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                
                if text.strip():
                    text_content.append({
                        'page': page_num + 1,
                        'content': text.strip()
                    })
            
            # Extraer metadata
            metadata = {}
            if pdf_reader.metadata:
                metadata = {
                    'title': pdf_reader.metadata.get('/Title', ''),
                    'author': pdf_reader.metadata.get('/Author', ''),
                    'subject': pdf_reader.metadata.get('/Subject', ''),
                    'creator': pdf_reader.metadata.get('/Creator', ''),
                    'producer': pdf_reader.metadata.get('/Producer', ''),
                    'creation_date': str(pdf_reader.metadata.get('/CreationDate', ''))
                }
            
            return {
                'file': pdf_path.name,
                'total_pages': total_pages,
                'metadata': metadata,
                'pages': text_content
            }
            
    except Exception as e:
        print(f"  ✗ Error extrayendo {pdf_path.name}: {e}", file=sys.stderr)
        return None

def extract_cis_controls(pdf_path: Path) -> Dict:
    """Extrae y procesa CIS Controls v8.1."""
    print(f"📂 Procesando CIS Controls v8.1...")
    
    pdf_data = extract_pdf_content(pdf_path)
    
    if not pdf_data:
        return None
    
    # Consolidar todo el texto
    full_text = '\n\n'.join([page['content'] for page in pdf_data['pages']])
    
    result = {
        'source': 'CIS Controls v8.1',
        'type': 'security_controls',
        'file': pdf_data['file'],
        'total_pages': pdf_data['total_pages'],
        'metadata': pdf_data['metadata'],
        'content': full_text,
        'pages': pdf_data['pages']
    }
    
    print(f"  ✓ Extraídas {pdf_data['total_pages']} páginas")
    print(f"  ✓ Total de caracteres: {len(full_text):,}")
    
    return result

def extract_nist_csf(pdf_path: Path) -> Dict:
    """Extrae y procesa NIST CSF 2.0."""
    print(f"📂 Procesando NIST CSF 2.0...")
    
    pdf_data = extract_pdf_content(pdf_path)
    
    if not pdf_data:
        return None
    
    # Consolidar todo el texto
    full_text = '\n\n'.join([page['content'] for page in pdf_data['pages']])
    
    result = {
        'source': 'NIST Cybersecurity Framework 2.0',
        'type': 'cybersecurity_framework',
        'file': pdf_data['file'],
        'total_pages': pdf_data['total_pages'],
        'metadata': pdf_data['metadata'],
        'content': full_text,
        'pages': pdf_data['pages']
    }
    
    print(f"  ✓ Extraídas {pdf_data['total_pages']} páginas")
    print(f"  ✓ Total de caracteres: {len(full_text):,}")
    
    return result

def main():
    """Procesa todos los archivos PDF"""
    
    # Directorios base
    base_dir = Path(__file__).parent.parent.parent
    pdf_dir = base_dir / 'datasets' / 'sources' / 'pdfs'
    output_dir = base_dir / 'datasets' / 'raw'
    
    # Crear directorio de salida si no existe
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("📚 Procesando archivos PDF...\n")
    
    total_docs = 0
    
    # Procesar CIS Controls v8.1
    cis_file = pdf_dir / 'CIS_Controls__v8.1_Guide__2024_06.pdf'
    if cis_file.exists():
        cis_data = extract_cis_controls(cis_file)
        
        if cis_data:
            output_file = output_dir / 'pdf_cis_controls_v8.1.json'
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(cis_data, f, indent=2, ensure_ascii=False)
            
            print(f"  ✓ Guardado: {output_file}\n")
            total_docs += 1
    else:
        print(f"  ⚠ No se encontró: {cis_file}\n")
    
    # Procesar NIST CSF 2.0
    nist_file = pdf_dir / 'NIST_CSF_2.0.pdf'
    if nist_file.exists():
        nist_data = extract_nist_csf(nist_file)
        
        if nist_data:
            output_file = output_dir / 'pdf_nist_csf_2.0.json'
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(nist_data, f, indent=2, ensure_ascii=False)
            
            print(f"  ✓ Guardado: {output_file}\n")
            total_docs += 1
    else:
        print(f"  ⚠ No se encontró: {nist_file}\n")
    
    print(f"✅ Extracción de PDF completada!\n")
    print(f"📊 Estadísticas:")
    print(f"   - Total de documentos PDF: {total_docs}")

if __name__ == '__main__':
    main()
