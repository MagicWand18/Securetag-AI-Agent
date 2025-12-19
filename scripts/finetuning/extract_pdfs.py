#!/usr/bin/env python3
"""
Script para extraer contenido de PDFs.
Cada PDF genera su propio archivo JSON de salida.
"""

import json
from pathlib import Path
from typing import List, Dict
import pdfplumber
from tqdm import tqdm
import sys

def extract_pdf_content(pdf_path: Path) -> List[Dict]:
    """
    Extrae texto y tablas de un PDF.
    
    Returns:
        Lista de chunks (texto y tablas)
    """
    chunks = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            
            for page_num, page in enumerate(tqdm(pdf.pages, desc=f"  Extrayendo páginas", leave=False), start=1):
                # Extraer texto
                text = page.extract_text()
                
                if text and len(text.strip()) > 50:
                    chunks.append({
                        'source': pdf_path.stem,
                        'type': 'pdf_text',
                        'page': page_num,
                        'total_pages': total_pages,
                        'content': text.strip()
                    })
                
                # Extraer tablas
                tables = page.extract_tables()
                for table_idx, table in enumerate(tables):
                    if table:
                        # Convertir tabla a texto estructurado
                        table_text = '\n'.join([
                            ' | '.join([str(cell) if cell else '' for cell in row])
                            for row in table
                        ])
                        
                        if len(table_text.strip()) > 20:
                            chunks.append({
                                'source': pdf_path.stem,
                                'type': 'pdf_table',
                                'page': page_num,
                                'total_pages': total_pages,
                                'table_index': table_idx,
                                'content': table_text.strip()
                            })
        
        return chunks
        
    except Exception as e:
        print(f"Error procesando {pdf_path.name}: {e}", file=sys.stderr)
        return []

def main():
    """Procesa todos los PDFs"""
    
    base_dir = Path(__file__).parent.parent.parent
    pdf_dir = base_dir / 'datasets' / 'sources' / 'pdfs'
    output_dir = base_dir / 'datasets' / 'raw'
    
    if not pdf_dir.exists():
        print(f"❌ Directorio {pdf_dir} no existe", file=sys.stderr)
        return
    
    # Buscar PDFs
    pdf_files = list(pdf_dir.glob('*.pdf'))
    
    if not pdf_files:
        print(f"⚠️  No se encontraron PDFs en {pdf_dir}", file=sys.stderr)
        return
    
    print(f"📄 Encontrados {len(pdf_files)} PDFs para procesar")
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    for pdf_file in pdf_files:
        print(f"\n📂 Procesando: {pdf_file.name}")
        chunks = extract_pdf_content(pdf_file)
        
        if not chunks:
            print(f"  ⚠️  No se extrajo contenido")
            continue
        
        # Guardar en archivo individual
        # Limpiar nombre del archivo para el output
        output_name = pdf_file.stem.replace(' ', '_').lower()
        output_file = output_dir / f'pdf_{output_name}.json'
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(chunks, f, indent=2, ensure_ascii=False)
        
        # Estadísticas
        text_chunks = sum(1 for c in chunks if c['type'] == 'pdf_text')
        table_chunks = sum(1 for c in chunks if c['type'] == 'pdf_table')
        
        print(f"  ✓ Extraídos {len(chunks)} chunks")
        print(f"  ✓ Guardado en: {output_file}")
        print(f"  📊 Texto: {text_chunks} | Tablas: {table_chunks}")
    
    print(f"\n✅ Extracción de PDFs completada!")
    print(f"   Archivos generados en: {output_dir}")

if __name__ == '__main__':
    main()
