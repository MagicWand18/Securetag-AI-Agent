#!/usr/bin/env python3
"""
Script para extraer y consolidar archivos Markdown por carpeta.
Cada carpeta se convierte en un solo JSON con estructura jerárquica.
"""

import json
from pathlib import Path
from typing import List, Dict
from tqdm import tqdm
import sys
import re

def clean_markdown(text: str) -> str:
    """Limpia markdown dejando solo el contenido esencial."""
    # Remover comentarios HTML
    text = re.sub(r'\u003c!--.*?--\u003e', '', text, flags=re.DOTALL)
    # Remover múltiples líneas vacías
    text = re.sub(r'\n\n\n+', '\n\n', text)
    return text.strip()

def extract_markdown_metadata(content: str) -> Dict:
    """Extrae metadata del frontmatter YAML si existe."""
    metadata = {}
    
    # Buscar frontmatter YAML (entre --- al inicio)
    frontmatter_match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
    if frontmatter_match:
        frontmatter = frontmatter_match.group(1)
        # Parseo simple de YAML (solo key: value)
        for line in frontmatter.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                metadata[key.strip()] = value.strip()
    
    return metadata

def process_markdown_file(file_path: Path, base_path: Path) -> Dict:
    """Procesa un archivo markdown individual."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extraer metadata si existe
        metadata = extract_markdown_metadata(content)
        
        # Remover frontmatter del contenido
        content = re.sub(r'^---\n.*?\n---\n', '', content, flags=re.DOTALL)
        
        # Limpiar
        content = clean_markdown(content)
        
        # Ruta relativa para organización
        rel_path = file_path.relative_to(base_path)
        
        return {
            'file': str(rel_path),
            'metadata': metadata,
            'content': content
        }
        
    except Exception as e:
        print(f"Error procesando {file_path}: {e}", file=sys.stderr)
        return None

def consolidate_markdown_directory(dir_path: Path) -> Dict:
    """Consolida todos los markdown de un directorio en un solo JSON."""
    
    dir_name = dir_path.name
    all_files = []
    
    # Buscar todos los archivos .md recursivamente
    md_files = sorted(dir_path.rglob('*.md'))
    
    print(f"  📁 {dir_name}: {len(md_files)} archivos markdown")
    
    for md_file in tqdm(md_files, desc=f"  Procesando {dir_name}", leave=False):
        file_data = process_markdown_file(md_file, dir_path)
        if file_data and file_data['content']:
            all_files.append(file_data)
    
    # Organizar por subcarpetas
    organized = {
        'source': dir_name,
        'type': 'markdown_collection',
        'total_files': len(all_files),
        'files': all_files
    }
    
    return organized

def main():
    """Procesa todas las carpetas de markdown"""
    
    base_dir = Path(__file__).parent.parent.parent
    markdown_dir = base_dir / 'datasets' / 'sources' / 'markdown'
    output_dir = base_dir / 'datasets' / 'raw'
    
    if not markdown_dir.exists():
        print(f"❌ Directorio {markdown_dir} no existe", file=sys.stderr)
        return
    
    # Obtener todas las subcarpetas
    subdirs = [d for d in markdown_dir.iterdir() if d.is_dir()]
    
    print(f"📚 Encontradas {len(subdirs)} carpetas de markdown para procesar")
    
    all_collections = []
    
    for subdir in subdirs:
        print(f"\n📂 Procesando carpeta: {subdir.name}")
        collection = consolidate_markdown_directory(subdir)
        
        if collection['total_files'] > 0:
            all_collections.append(collection)
            
            # Guardar cada colección en su propio archivo
            output_file = output_dir / f'markdown_{subdir.name}.json'
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(collection, f, indent=2, ensure_ascii=False)
            
            print(f"  ✓ Guardado: {output_file}")
            print(f"  ✓ Archivos procesados: {collection['total_files']}")
    
    # Guardar índice consolidado
    index_file = output_dir / 'markdown_index.json'
    index = {
        'total_collections': len(all_collections),
        'collections': [
            {
                'name': c['source'],
                'files': c['total_files']
            }
            for c in all_collections
        ]
    }
    
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Extracción de markdown completada!")
    print(f"   Total de colecciones: {len(all_collections)}")
    print(f"   Índice guardado en: {index_file}")
    
    # Estadísticas
    total_files = sum(c['total_files'] for c in all_collections)
    print(f"\n📊 Estadísticas:")
    print(f"   - Total de archivos markdown: {total_files}")
    for collection in all_collections:
        print(f"   - {collection['source']}: {collection['total_files']} archivos")

if __name__ == '__main__':
    main()
