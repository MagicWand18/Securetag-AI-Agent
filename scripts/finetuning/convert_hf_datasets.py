#!/usr/bin/env python3
"""
convert_hf_datasets.py

Convierte los datasets de Hugging Face (Fenrir y Trendyol) al formato óptimo
para fine-tuning de Llama 3.1 según mejores prácticas de noviembre 2025.

Formato de salida (ChatML/Alpaca híbrido):
{
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}

Este formato es el ÓPTIMO para Llama 3.1 según Hugging Face y Meta.
"""

import json
from pathlib import Path
from typing import List, Dict

# Directorios
BASE_DIR = Path(__file__).parent.parent.parent
HF_DIR = BASE_DIR / "datasets" / "huggingface"
OUTPUT_DIR = BASE_DIR / "datasets" / "qa_generated"  # Mismo directorio que tus Q&A


def convert_to_messages_format(jsonl_file: Path, dataset_name: str) -> List[Dict]:
    """
    Convierte formato system/user/assistant a messages format (ChatML).
    
    Este es el formato ÓPTIMO para Llama 3.1 según mejores prácticas 2025.
    """
    converted_data = []
    
    print(f"\n📁 Procesando {dataset_name}...")
    
    with open(jsonl_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            if not line.strip():
                continue
            
            try:
                item = json.loads(line)
                
                # Convertir a formato messages (ChatML)
                messages_item = {
                    "messages": [
                        {
                            "role": "system",
                            "content": item.get("system", "You are a helpful cybersecurity assistant.")
                        },
                        {
                            "role": "user",
                            "content": item["user"]
                        },
                        {
                            "role": "assistant",
                            "content": item["assistant"]
                        }
                    ],
                    "metadata": {
                        "source": dataset_name,
                        "language": "en",
                        "original_format": "system_user_assistant"
                    }
                }
                
                converted_data.append(messages_item)
                
                if line_num % 10000 == 0:
                    print(f"   Procesadas {line_num:,} líneas...")
                    
            except json.JSONDecodeError as e:
                print(f"   ⚠️  Error en línea {line_num}: {e}")
                continue
            except KeyError as e:
                print(f"   ⚠️  Campo faltante en línea {line_num}: {e}")
                continue
    
    print(f"   ✅ {len(converted_data):,} ejemplos convertidos")
    return converted_data


def main():
    print("="*80)
    print("🚀 Conversión de Datasets de Hugging Face a Formato Óptimo")
    print("="*80)
    print("\nFormato de salida: ChatML (messages)")
    print("Óptimo para: Llama 3.1, Axolotl, Unsloth, TRL")
    print(f"Directorio de salida: {OUTPUT_DIR}")
    print()
    
    files_created = []
    total_examples = 0
    
    # 1. Convertir Fenrir
    fenrir_file = HF_DIR / "Cybersecurity-Dataset-Fenrir-v2.0" / "CyberSec-Dataset_escaped.jsonl"
    if fenrir_file.exists():
        fenrir_data = convert_to_messages_format(fenrir_file, "Fenrir-v2.0")
        
        if fenrir_data:
            fenrir_output = OUTPUT_DIR / "hf_fenrir_v2_messages.json"
            with open(fenrir_output, 'w', encoding='utf-8') as f:
                json.dump(fenrir_data, f, indent=2, ensure_ascii=False)
            
            files_created.append(("Fenrir v2.0", fenrir_output, len(fenrir_data)))
            total_examples += len(fenrir_data)
    else:
        print(f"⚠️  Fenrir no encontrado en {fenrir_file}")
    
    # 2. Convertir Trendyol
    trendyol_file = HF_DIR / "Trendyol-Cybersecurity-Instruction-Tuning-Dataset" / "CyberSec-Dataset_escaped.jsonl"
    if trendyol_file.exists():
        trendyol_data = convert_to_messages_format(trendyol_file, "Trendyol")
        
        if trendyol_data:
            trendyol_output = OUTPUT_DIR / "hf_trendyol_messages.json"
            with open(trendyol_output, 'w', encoding='utf-8') as f:
                json.dump(trendyol_data, f, indent=2, ensure_ascii=False)
            
            files_created.append(("Trendyol", trendyol_output, len(trendyol_data)))
            total_examples += len(trendyol_data)
    else:
        print(f"⚠️  Trendyol no encontrado en {trendyol_file}")
    
    # 3. Resumen
    if files_created:
        print("\n" + "="*80)
        print("✅ Conversión completada!")
        print("="*80)
        print(f"\n📊 Estadísticas:")
        print(f"   Total de ejemplos: {total_examples:,}")
        print(f"\n📁 Archivos generados:")
        for name, path, count in files_created:
            print(f"   - {name}: {path.name} ({count:,} ejemplos)")
        print(f"\n💡 Próximo paso:")
        print(f"   Esperar a que terminen los workers de Q&A")
        print(f"   Luego ejecutar: python3 scripts/finetuning/combine_and_split.py")
    else:
        print("\n❌ No se encontraron datasets para convertir")


if __name__ == "__main__":
    main()
