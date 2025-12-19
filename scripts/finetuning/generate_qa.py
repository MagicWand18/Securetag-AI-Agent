#!/usr/bin/env python3
"""
Script para generar pares Q&A usando OpenAI GPT-5.1.
Procesa todos los archivos de chunks en datasets/processed y genera un archivo de Q&A por cada uno.

Características:
- Procesamiento por archivo (un JSON de Q&A por cada archivo de chunks)
- Retry automático con backoff exponencial
- Seguimiento de progreso (puede retomar desde donde quedó)
- Guardado incremental para evitar pérdida de datos
"""

import json
import os
import sys
import time
import argparse
from pathlib import Path
from typing import List, Dict, Optional
from tqdm import tqdm
from dotenv import load_dotenv
from openai import OpenAI

# Cargar configuración
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-5.1')
QA_PAIRS_PER_CHUNK = int(os.getenv('QA_PAIRS_PER_CHUNK', '3'))
MAX_RETRIES = int(os.getenv('MAX_RETRIES', '5'))
RETRY_DELAY = float(os.getenv('RETRY_DELAY', '2.0'))

# Inicializar cliente OpenAI
openai_client = None

# Directorios
BASE_DIR = Path(__file__).parent.parent.parent
PROCESSED_DIR = BASE_DIR / 'datasets' / 'processed'
QA_OUTPUT_DIR = BASE_DIR / 'datasets' / 'qa_generated'
QA_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Archivo de progreso
PROGRESS_FILE = QA_OUTPUT_DIR / '.progress.json'


def load_progress() -> Dict:
    """Carga el estado de progreso desde el archivo."""
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_progress(progress: Dict):
    """Guarda el estado de progreso."""
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump(progress, f, indent=2, ensure_ascii=False)


def generate_qa_with_retry(chunk_text: str, source_info: Dict, max_retries: int = MAX_RETRIES) -> Optional[List[Dict]]:
    """
    Genera pares Q&A con retry automático en caso de fallo.
    Usa JSON Mode para máxima robustez y prompt en español para evitar inconsistencias.
    
    Args:
        chunk_text: Texto del chunk
        source_info: Metadata del chunk
        max_retries: Número máximo de reintentos
        
    Returns:
        Lista de pares Q&A o None si falla después de todos los reintentos
    """
    # Prompt mejorado: todo en español, estructura clara, sin inventar datos
    prompt = f"""Actúa como un experto senior en ciberseguridad.

Lee el siguiente texto (extraído de un documento de ciberseguridad) y genera EXACTAMENTE {QA_PAIRS_PER_CHUNK} pares de pregunta-respuesta de alta calidad para entrenar un modelo de seguridad.

Tu objetivo es maximizar:
1) Completitud
2) Precisión
3) Nivel de detalle
4) Consistencia del JSON

=== INSTRUCCIONES GENERALES ===
- Basa TODAS las preguntas y respuestas EXCLUSIVAMENTE en el texto proporcionado.
- NO inventes información ni agregues datos que no estén clara y directamente respaldados por el texto.
- Si el texto no permite generar {QA_PAIRS_PER_CHUNK} pares correctos, genera solo los que sean 100% correctos (entre 1 y {QA_PAIRS_PER_CHUNK}).

=== SOBRE LAS PREGUNTAS ===
- Escríbelas en ESPAÑOL profesional, dirigidas a analistas/ingenieros de ciberseguridad.
- Deben ser específicas, técnicas y claramente relacionadas con el texto.
- Cubre distintos ángulos cuando sea posible:
  • conceptos/definiciones
  • riesgos/impacto
  • detección/monitoreo
  • mitigación/mejores prácticas
  • ejemplos de abuso o escenarios realistas
- Evita preguntas triviales o demasiado generales.

=== SOBRE LAS RESPUESTAS ===
- Responde en ESPAÑOL profesional, con terminología técnica correcta
  (por ejemplo: "superficie de ataque", "escalamiento de privilegios",
   "persistencia", "post-explotación", "vector de ataque", etc.).
- Cada respuesta debe ser:
  • completa respecto a la pregunta
  • precisa y sin contradicciones
  • concisa pero rica en detalle (ideal 300-600 caracteres)
  • explicar el "por qué" o las consecuencias, no solo el "qué"
- Incluye ejemplos o matices cuando el texto lo permita, sin copiarlo literalmente.
- NO menciones que estás respondiendo "según el texto"; responde de forma directa.

=== FORMATO DE SALIDA (OBLIGATORIO) ===
Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura:
{{
  "qa_pairs": [
    {{
      "question": "pregunta en español...",
      "answer": "respuesta en español..."
    }},
    ...
  ]
}}

NO incluyas:
- Texto adicional antes o después del JSON
- Explicaciones
- Bloques de código markdown (```json)
- Backticks
- Comentarios

Source: {source_info.get('source', 'unknown')}

Text:
{chunk_text}

Responde solo con el JSON descrito arriba."""

    for attempt in range(max_retries):
        try:
            # Usar response_format para garantizar JSON válido
            response = openai_client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "Eres un asistente experto que siempre responde con JSON válido."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4,  # Reducido para más consistencia
                max_completion_tokens=1000,  # Aumentado ligeramente para permitir detalle
                response_format={"type": "json_object"}  # Fuerza JSON válido
            )
            
            response_text = response.choices[0].message.content
            
            # Parsing directo sin manipulación frágil de strings
            data = json.loads(response_text)
            
            # Manejar diferentes estructuras posibles
            if "qa_pairs" in data:
                qa_pairs = data["qa_pairs"]
            elif isinstance(data, list):
                qa_pairs = data
            else:
                # Fallback: tomar el primer valor que sea una lista
                qa_pairs = next((v for v in data.values() if isinstance(v, list)), [])
            
            # Validar estructura y contenido
            valid_pairs = []
            for pair in qa_pairs:
                if isinstance(pair, dict) and 'question' in pair and 'answer' in pair:
                    # Validación de longitud mínima
                    if len(pair['question']) > 10 and len(pair['answer']) > 20:
                        valid_pairs.append(pair)
            
            if valid_pairs:
                return valid_pairs
            else:
                raise ValueError("JSON válido pero sin pares Q&A útiles")
                
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = RETRY_DELAY * (2 ** attempt)
                print(f"\n⚠️  Error: {e}. Reintentando en {wait_time:.1f}s...", file=sys.stderr)
                time.sleep(wait_time)
            else:
                print(f"\n❌ Error crítico tras {max_retries} intentos: {e}", file=sys.stderr)
                return None
    
    return None


def process_chunk_file(chunk_file: Path, progress: Dict, start_chunk: Optional[int] = None, end_chunk: Optional[int] = None) -> bool:
    """
    Procesa un archivo de chunks y genera su archivo de Q&A correspondiente.
    
    Args:
        chunk_file: Path al archivo de chunks
        progress: Diccionario de progreso
        start_chunk: Índice inicial del chunk (opcional, para dividir archivos grandes)
        end_chunk: Índice final del chunk (opcional, para dividir archivos grandes)
        
    Returns:
        True si se procesó exitosamente, False en caso contrario
    """
    file_key = chunk_file.name
    
    # Si hay rango, agregar al file_key para tracking independiente
    if start_chunk is not None and end_chunk is not None:
        file_key_with_range = f"{file_key}:{start_chunk}-{end_chunk}"
        output_file = QA_OUTPUT_DIR / f"{chunk_file.stem}_qa_{start_chunk}_{end_chunk}.json"
    else:
        file_key_with_range = file_key
        output_file = QA_OUTPUT_DIR / f"{chunk_file.stem}_qa.json"
    
    # Verificar si ya se completó este archivo/rango
    if file_key_with_range in progress and progress[file_key_with_range].get('completed', False):
        print(f"✓ {file_key_with_range} ya procesado, saltando...")
        return True
    
    # Cargar chunks
    with open(chunk_file, 'r', encoding='utf-8') as f:
        all_chunks = json.load(f)
    
    # Aplicar rango si se especificó
    if start_chunk is not None and end_chunk is not None:
        chunks = all_chunks[start_chunk:end_chunk]
        chunk_offset = start_chunk  # Para mantener índices correctos
    else:
        chunks = all_chunks
        chunk_offset = 0
    
    # Inicializar progreso para este archivo/rango si no existe
    if file_key_with_range not in progress:
        progress[file_key_with_range] = {
            'total_chunks': len(chunks),
            'processed_chunks': 0,
            'failed_chunks': 0,
            'completed': False,
            'start_chunk': start_chunk,
            'end_chunk': end_chunk
        }
    
    # Cargar Q&A existentes si hay
    qa_data = []
    if output_file.exists():
        with open(output_file, 'r', encoding='utf-8') as f:
            qa_data = json.load(f)
    
    start_idx = progress[file_key_with_range]['processed_chunks']
    
    print(f"\n📄 Procesando {file_key_with_range}")
    print(f"   Total chunks: {len(chunks)}")
    if start_chunk is not None:
        print(f"   Rango: {start_chunk}-{end_chunk} (de {len(all_chunks)} totales)")
    print(f"   Iniciando desde chunk: {start_idx}")
    
    for idx in tqdm(range(start_idx, len(chunks)), desc=f"  {file_key_with_range}", initial=start_idx, total=len(chunks)):
        chunk_item = chunks[idx]
        chunk_text = chunk_item.get('text', '')
        
        if not chunk_text or len(chunk_text) < 50:
            progress[file_key_with_range]['processed_chunks'] += 1
            continue
        
        # Generar Q&A con retry
        qa_pairs = generate_qa_with_retry(chunk_text, chunk_item)
        
        if qa_pairs:
            for qa in qa_pairs:
                qa_entry = {
                    'question': qa['question'],
                    'answer': qa['answer'],
                    'source': chunk_item.get('source', 'unknown'),
                    'chunk_index': chunk_item.get('chunk_index', idx + chunk_offset),
                }
                # Copiar metadatos adicionales si existen
                for key in ['title', 'url', 'page', 'section']:
                    if key in chunk_item:
                        qa_entry[key] = chunk_item[key]
                qa_data.append(qa_entry)
        else:
            progress[file_key_with_range]['failed_chunks'] += 1
        
        progress[file_key_with_range]['processed_chunks'] += 1
        
        # Guardar progreso cada 10 chunks
        if (idx + 1) % 10 == 0:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(qa_data, f, indent=2, ensure_ascii=False)
            save_progress(progress)
        
        # Pequeño delay para no saturar la API
        time.sleep(0.5)
    
    # Guardar archivo final
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(qa_data, f, indent=2, ensure_ascii=False)
    
    # Marcar como completado
    progress[file_key_with_range]['completed'] = True
    save_progress(progress)
    
    print(f"   ✅ Completado: {len(qa_data)} pares Q&A generados")
    print(f"   ❌ Chunks fallidos: {progress[file_key_with_range]['failed_chunks']}")
    
    return True


def main():
    """Procesa todos los archivos de chunks y genera Q&A."""
    
    global openai_client
    
    # Parsear argumentos de línea de comandos
    parser = argparse.ArgumentParser(description='Genera Q&A usando GPT-5.1 con soporte para ejecución paralela')
    parser.add_argument('--worker-id', type=int, default=None, 
                        help='ID del worker (0-4) para procesamiento paralelo. Si no se especifica, procesa todos los archivos.')
    parser.add_argument('--total-workers', type=int, default=5,
                        help='Número total de workers (default: 5)')
    parser.add_argument('--files', type=str, default=None,
                        help='Lista de archivos específicos separados por coma (ej: "file1.json,file2.json"). Si se especifica, ignora worker-id.')
    args = parser.parse_args()
    
    # Verificar API Key
    print("🔍 Verificando OpenAI API Key...")
    if not OPENAI_API_KEY or len(OPENAI_API_KEY) < 10:
        print("❌ OPENAI_API_KEY no está configurada.", file=sys.stderr)
        print("\nPor favor, configura la variable de entorno:")
        print("  export OPENAI_API_KEY='tu-api-key'")
        print("  O agrégala al archivo .env")
        return
    
    # Inicializar cliente OpenAI
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
    
    if args.worker_id is not None:
        print(f"✅ OpenAI API configurada - Worker {args.worker_id}/{args.total_workers - 1} con modelo '{OPENAI_MODEL}'")
    else:
        print(f"✅ OpenAI API configurada con modelo '{OPENAI_MODEL}'")
    
    # Cargar progreso
    progress = load_progress()
    
    # Obtener todos los archivos de chunks
    all_chunk_files = sorted(PROCESSED_DIR.glob('*_chunks.json'))
    
    if not all_chunk_files:
        print("❌ No se encontraron archivos de chunks en datasets/processed", file=sys.stderr)
        return
    
    # Filtrar archivos según --files o --worker-id
    if args.files is not None:
        # Modo manual: procesar lista específica de archivos (con soporte para rangos)
        file_specs = [f.strip() for f in args.files.split(',')]
        chunk_files_with_ranges = []
        
        for spec in file_specs:
            # Parsear formato "file.json:start-end" o "file.json"
            if ':' in spec:
                file_name, range_str = spec.split(':', 1)
                if '-' in range_str:
                    start, end = map(int, range_str.split('-'))
                else:
                    start, end = None, None
            else:
                file_name = spec
                start, end = None, None
            
            # Buscar el archivo
            matching_files = [f for f in all_chunk_files if f.name == file_name]
            if matching_files:
                chunk_files_with_ranges.append((matching_files[0], start, end))
            else:
                print(f"⚠️  Advertencia: archivo no encontrado: {file_name}", file=sys.stderr)
        
        print(f"\n📋 Modo manual: procesando {len(chunk_files_with_ranges)} archivos/rangos:")
        for f, start, end in chunk_files_with_ranges:
            if start is not None and end is not None:
                print(f"   - {f.name} (chunks {start}-{end})")
            else:
                print(f"   - {f.name}")
    elif args.worker_id is not None:
        # Modo automático: usar módulo para distribuir
        if args.worker_id < 0 or args.worker_id >= args.total_workers:
            print(f"❌ worker-id debe estar entre 0 y {args.total_workers - 1}", file=sys.stderr)
            return
        chunk_files_with_ranges = [(f, None, None) for i, f in enumerate(all_chunk_files) if i % args.total_workers == args.worker_id]
        print(f"\n👷 Worker {args.worker_id} procesará {len(chunk_files_with_ranges)} de {len(all_chunk_files)} archivos:")
        for f, _, _ in chunk_files_with_ranges:
            print(f"   - {f.name}")
    else:
        # Sin filtro: procesar todos
        chunk_files_with_ranges = [(f, None, None) for f in all_chunk_files]
    
    print(f"\n📚 Encontrados {len(chunk_files_with_ranges)} archivos/rangos de chunks")
    print(f"   Generando {QA_PAIRS_PER_CHUNK} pares Q&A por chunk")
    print(f"   Directorio de salida: {QA_OUTPUT_DIR}")
    
    # Procesar cada archivo/rango
    total_items = len(chunk_files_with_ranges)
    completed_items = sum(1 for f, s, e in chunk_files_with_ranges 
                         if progress.get(f"{f.name}:{s}-{e}" if s is not None else f.name, {}).get('completed', False))
    
    print(f"\n📊 Progreso general: {completed_items}/{total_items} archivos/rangos completados")
    
    for chunk_file, start_chunk, end_chunk in chunk_files_with_ranges:
        try:
            process_chunk_file(chunk_file, progress, start_chunk, end_chunk)
        except KeyboardInterrupt:
            print("\n\n⚠️  Proceso interrumpido por el usuario.")
            print("El progreso se ha guardado. Puedes reanudar ejecutando el script nuevamente.")
            save_progress(progress)
            return
        except Exception as e:
            print(f"\n❌ Error procesando {chunk_file.name}: {e}", file=sys.stderr)
            save_progress(progress)
            continue
    
    # Resumen final
    print("\n" + "="*80)
    print("✅ Generación de Q&A completada!")
    print("="*80)
    
    total_qa = 0
    total_failed = 0
    for qa_file in QA_OUTPUT_DIR.glob('*_qa.json'):
        with open(qa_file, 'r', encoding='utf-8') as f:
            qa_data = json.load(f)
            total_qa += len(qa_data)
    
    for file_progress in progress.values():
        total_failed += file_progress.get('failed_chunks', 0)
    
    print(f"Total de pares Q&A generados: {total_qa:,}")
    print(f"Total de chunks fallidos: {total_failed}")
    print(f"Archivos de Q&A creados: {len(list(QA_OUTPUT_DIR.glob('*_qa.json')))}")
    print(f"Ubicación: {QA_OUTPUT_DIR}")


if __name__ == '__main__':
    main()
