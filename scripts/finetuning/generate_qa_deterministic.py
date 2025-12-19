#!/usr/bin/env python3
"""
Script de generación de Q&A Determinista para Exploit-DB.
Genera pares Q&A usando plantillas predefinidas sin usar LLMs.
Optimizado para velocidad y costo cero.
"""

import json
import os
import sys
from pathlib import Path
from typing import List, Dict
from tqdm import tqdm

# Directorios
BASE_DIR = Path(__file__).parent.parent.parent
PROCESSED_DIR = BASE_DIR / 'datasets' / 'processed'
QA_OUTPUT_DIR = BASE_DIR / 'datasets' / 'qa_generated'
QA_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

INPUT_FILE = PROCESSED_DIR / 'json_exploitdb_chunks.json'
OUTPUT_FILE = QA_OUTPUT_DIR / 'json_exploitdb_deterministic.json'

def get_language_from_extension(filepath: str) -> str:
    """Determina el lenguaje para el bloque de código markdown."""
    ext = filepath.split('.')[-1].lower() if '.' in filepath else ''
    
    mapping = {
        'py': 'python',
        'rb': 'ruby',
        'pl': 'perl',
        'sh': 'bash',
        'c': 'c',
        'cpp': 'cpp',
        'php': 'php',
        'html': 'html',
        'js': 'javascript',
        'java': 'java',
        'go': 'go',
        'rs': 'rust',
        'txt': 'text',
        'md': 'markdown'
    }
    return mapping.get(ext, 'text')

def generate_questions(metadata: Dict) -> List[str]:
    """Genera preguntas variadas basadas en metadata."""
    questions = []
    
    cve = metadata.get('cve', '').strip()
    title = metadata.get('title', 'Exploit desconocido').strip()
    platform = metadata.get('platform', 'general').strip()
    type_ = metadata.get('type', 'remote').strip()
    # file_path = metadata.get('file', '').strip()
    
    # 1. Pregunta por CVE (si existe)
    if cve and cve.lower() != 'n/a':
        questions.append(f"¿Dónde puedo encontrar el exploit para {cve}?")
        questions.append(f"Necesito el código del exploit asociado al {cve}.")
        questions.append(f"Muéstrame el PoC verificado para la vulnerabilidad {cve}.")
    
    # 2. Pregunta por Título Exacto
    questions.append(f"¿Cómo puedo explotar {title}?")
    questions.append(f"Proporciona el exploit para {title}.")
    questions.append(f"Busco un script funcional para atacar {title}.")
    
    # 3. Pregunta por Plataforma + Título/Tipo
    questions.append(f"¿Tienes algún exploit {type_} para {platform} relacionado con {title}?")
    questions.append(f"Necesito realizar un ataque de tipo {type_} en {platform} usando el exploit de {title}.")
    
    # 4. Pregunta Genérica de "Red Team"
    questions.append(f"Como pentester, necesito verificar la vulnerabilidad en {title}. ¿Tienes el código?")
    
    return questions

def main():
    print("🚀 Iniciando generación determinista de Q&A para Exploit-DB...")
    
    if not INPUT_FILE.exists():
        print(f"❌ No se encontró el archivo de entrada: {INPUT_FILE}")
        return

    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            chunks = json.load(f)
    except Exception as e:
        print(f"❌ Error leyendo el archivo JSON: {e}")
        return

    print(f"📦 Total de chunks a procesar: {len(chunks)}")
    
    qa_pairs = []
    
    for chunk in tqdm(chunks, desc="Generando Q&A"):
        source_info = chunk.get('source', '')
        # Solo procesamos exploitdb (aunque el archivo debería ser solo de eso)
        if source_info != 'exploitdb':
            continue
            
        metadata = chunk.get('metadata', {})
        chunk_text = chunk.get('text', '')
        file_path = chunk.get('file', '')
        
        if not chunk_text:
            continue
            
        # Determinar lenguaje
        lang = get_language_from_extension(file_path)
        
        # Generar preguntas
        questions = generate_questions(metadata)
        
        # Generar respuesta única (Raw Code)
        title = metadata.get('title', 'Exploit')
        cve = metadata.get('cve', '')
        cve_str = f" ({cve})" if cve and cve.lower() != 'n/a' else ""
        
        answer_content = f"Aquí tienes el exploit verificado para {title}{cve_str}:\n\n```{lang}\n{chunk_text}\n```"
        
        # Crear pares Q&A (3 pares por chunk seleccionados de las preguntas generadas)
        # Seleccionamos hasta 3 preguntas variadas para no saturar, pero cubriendo diferentes ángulos
        selected_questions = questions[:3] # Tomamos las 3 primeras (CVE, Título, Plataforma)
        if len(selected_questions) < 3:
             selected_questions = questions # Si hay menos (ej. sin CVE), tomamos todas
             
        for q in selected_questions:
            qa_pairs.append({
                "question": q,
                "answer": answer_content,
                "source": "exploitdb",
                "chunk_index": chunk.get('chunk_index'),
                "metadata": metadata
            })

    print(f"✅ Generación completada. Total de pares Q&A: {len(qa_pairs)}")
    
    print(f"💾 Guardando en {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(qa_pairs, f, indent=2, ensure_ascii=False)
    
    print("🎉 Proceso finalizado con éxito.")

if __name__ == "__main__":
    main()
