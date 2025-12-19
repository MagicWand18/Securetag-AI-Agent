#!/usr/bin/env python3
"""process_chunks.py

Lee todos los archivos JSON en `datasets/raw`, los divide en fragmentos (chunks) y guarda
un archivo JSON de chunks por cada archivo de origen en `datasets/processed`.

Cada chunk contiene:
- `source`: nombre del archivo original
- `chunk_index`: índice del fragmento dentro del archivo
- `text`: texto del fragmento
- opcionalmente `metadata` del registro original

El tamaño del chunk y el solapamiento pueden configurarse mediante variables de entorno:
    CHUNK_SIZE   (default 1000 caracteres)
    CHUNK_OVERLAP (default 200 caracteres)
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Cargar .env (si existe)
load_dotenv()

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))

RAW_DIR = Path(__file__).parents[2] / "datasets" / "raw"
PROCESSED_DIR = Path(__file__).parents[2] / "datasets" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

def split_text(text: str):
    """Divide *text* en fragmentos de CHUNK_SIZE con solapamiento CHUNK_OVERLAP.
    Devuelve una lista de strings.
    """
    chunks = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + CHUNK_SIZE, length)
        chunks.append(text[start:end])
        # Avanzar con solapamiento
        start = end - CHUNK_OVERLAP if end - CHUNK_OVERLAP > start else end
    return chunks

def process_file(file_path: Path):
    """Procesa un archivo JSON y devuelve una lista de chunks.
    Extrae todo el texto presente en cualquier estructura JSON, lo concatena y lo divide
    en fragmentos según CHUNK_SIZE y CHUNK_OVERLAP.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Función recursiva para extraer texto de cualquier tipo de objeto JSON
    def extract_text(obj):
        if isinstance(obj, str):
            return obj
        if isinstance(obj, dict):
            return " ".join(extract_text(v) for v in obj.values() if v is not None)
        if isinstance(obj, list):
            return " ".join(extract_text(item) for item in obj if item is not None)
        return ""

    full_text = extract_text(data).strip()
    if len(full_text) < 50:
        print(f"[WARN] Archivo {file_path.name} tiene poco texto, se omite.")
        return []

    chunk_texts = split_text(full_text)
    chunks_out = []
    for idx, chunk in enumerate(chunk_texts):
        chunk_obj = {
            "source": file_path.name,
            "chunk_index": idx,
            "text": chunk,
        }
        # Añadir metadatos básicos si están presentes en el JSON original
        for key in ["title", "url", "page", "section", "name"]:
            if isinstance(data, dict) and key in data:
                chunk_obj[key] = data[key]
        chunks_out.append(chunk_obj)
    # Guardar archivo de chunks
    out_path = PROCESSED_DIR / f"{file_path.stem}_chunks.json"
    with open(out_path, "w", encoding="utf-8") as out_f:
        json.dump(chunks_out, out_f, ensure_ascii=False, indent=2)
    return chunks_out


def main():
    total_chunks = 0
    processed_files = 0
    for json_file in RAW_DIR.glob("*.json"):
        chunks = process_file(json_file)
        if chunks:
            total_chunks += len(chunks)
            processed_files += 1
            print(f"[INFO] {json_file.name} -> {len(chunks)} chunks")
    print("\n=== Resumen ===")
    print(f"Archivos raw procesados: {processed_files}")
    print(f"Total de chunks generados: {total_chunks}")
    print(f"Archivos de chunks creados en: {PROCESSED_DIR}")

if __name__ == "__main__":
    main()
