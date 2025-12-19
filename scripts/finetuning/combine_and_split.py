#!/usr/bin/env python3
"""
combine_and_split.py

Combina todos los datasets (tus Q&A + Fenrir + Trendyol) y hace split 70-15-15
según mejores prácticas de noviembre 2025 para fine-tuning de Llama 3.1.

Formato de salida: ChatML (messages)
Split: 70% train, 15% validation, 15% test
"""

import json
import random
from pathlib import Path
from typing import List, Dict
import hashlib

# Directorios
BASE_DIR = Path(__file__).parent.parent.parent
QA_DIR = BASE_DIR / "datasets" / "qa_generated"
OUTPUT_DIR = BASE_DIR / "datasets" / "final"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Prompt del sistema en español
SYSTEM_PROMPT_ES = """Eres un asistente experto en ciberseguridad que proporciona análisis técnicos precisos, recomendaciones prácticas y orientación sobre frameworks de seguridad como MITRE ATT&CK, NIST, OWASP, PCI DSS e ISO 27001. Tu objetivo es ayudar a profesionales de seguridad con respuestas claras, técnicas y accionables."""


def load_qa_files(qa_dir: Path) -> List[Dict]:
    """
    Carga archivos de Q&A en formato question/answer y los convierte a messages.
    """
    qa_data = []
    
    # Buscar archivos de Q&A (excluir los de HF que ya están en formato messages)
    qa_files = [f for f in qa_dir.glob("*_chunks_qa*.json") 
                if not f.name.startswith("hf_")]
    
    print(f"\n📁 Cargando tus archivos de Q&A...")
    print(f"   Encontrados {len(qa_files)} archivos")
    
    for qa_file in qa_files:
        try:
            with open(qa_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Convertir cada Q&A a formato messages
            for item in data:
                if not item.get('question') or not item.get('answer'):
                    continue
                
                messages_item = {
                    "messages": [
                        {
                            "role": "system",
                            "content": SYSTEM_PROMPT_ES
                        },
                        {
                            "role": "user",
                            "content": item['question']
                        },
                        {
                            "role": "assistant",
                            "content": item['answer']
                        }
                    ],
                    "metadata": {
                        "source": item.get('source', qa_file.name),
                        "chunk_index": item.get('chunk_index', 0),
                        "language": "es"
                    }
                }
                qa_data.append(messages_item)
            
            print(f"   ✅ {qa_file.name}: {len(data)} pares")
            
        except Exception as e:
            print(f"   ❌ Error en {qa_file.name}: {e}")
    
    return qa_data


def load_hf_files(qa_dir: Path) -> List[Dict]:
    """
    Carga archivos de HF que ya están en formato messages.
    """
    hf_data = []
    
    # Buscar archivos de HF (ya en formato messages)
    hf_files = list(qa_dir.glob("hf_*_messages.json"))
    
    print(f"\n📁 Cargando datasets de Hugging Face...")
    print(f"   Encontrados {len(hf_files)} archivos")
    
    for hf_file in hf_files:
        try:
            with open(hf_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            hf_data.extend(data)
            print(f"   ✅ {hf_file.name}: {len(data):,} ejemplos")
            
        except Exception as e:
            print(f"   ❌ Error en {hf_file.name}: {e}")
    
    return hf_data


def deduplicate_data(data: List[Dict]) -> List[Dict]:
    """
    Elimina duplicados basándose en el contenido del mensaje del usuario.
    """
    seen_hashes = set()
    unique_data = []
    
    for item in data:
        # Obtener el contenido del mensaje del usuario
        user_content = ""
        for msg in item.get("messages", []):
            if msg.get("role") == "user":
                user_content = msg.get("content", "")
                break
        
        # Hash del contenido
        content_hash = hashlib.md5(user_content.encode()).hexdigest()
        
        if content_hash not in seen_hashes:
            seen_hashes.add(content_hash)
            unique_data.append(item)
    
    return unique_data


def stratified_split(data: List[Dict], train_ratio: float, val_ratio: float, test_ratio: float):
    """
    Split estratificado manteniendo proporción de idiomas Y archivos origen.
    
    Garantiza que:
    1. Cada idioma mantenga su proporción en train/val/test
    2. Cada archivo origen esté representado en los 3 splits
    3. El orden sea completamente aleatorio
    """
    from collections import defaultdict
    
    # Agrupar por idioma y archivo origen
    groups = defaultdict(list)
    for item in data:
        lang = item.get('metadata', {}).get('language', 'unknown')
        source = item.get('metadata', {}).get('source', 'unknown')
        key = f"{lang}_{source}"
        groups[key].append(item)
    
    print(f"\n📊 Distribución por idioma y archivo:")
    
    # Estadísticas por idioma
    es_total = sum(len(items) for key, items in groups.items() if key.startswith('es_'))
    en_total = sum(len(items) for key, items in groups.items() if key.startswith('en_'))
    
    print(f"   Español: {es_total:,} ({es_total/len(data)*100:.1f}%)")
    print(f"   Inglés: {en_total:,} ({en_total/len(data)*100:.1f}%)")
    
    # Mostrar archivos únicos
    unique_sources = set(item.get('metadata', {}).get('source', 'unknown') for item in data)
    print(f"\n   Archivos únicos: {len(unique_sources)}")
    
    # Hacer split estratificado por grupo
    train_data = []
    val_data = []
    test_data = []
    
    for key, items in groups.items():
        # Mezclar items de este grupo
        random.shuffle(items)
        
        # Calcular índices de split
        n = len(items)
        train_idx = int(n * train_ratio)
        val_idx = int(n * (train_ratio + val_ratio))
        
        # Split
        group_train = items[:train_idx]
        group_val = items[train_idx:val_idx]
        group_test = items[val_idx:]
        
        # Agregar a los splits globales
        train_data.extend(group_train)
        val_data.extend(group_val)
        test_data.extend(group_test)
        
        # Log para archivos con pocos ejemplos
        if n < 30:
            lang, source = key.split('_', 1)
            print(f"   ⚠️  {source} ({lang}): {n} ejemplos → train:{len(group_train)}, val:{len(group_val)}, test:{len(group_test)}")
    
    # Mezclar completamente cada split (orden aleatorio)
    random.shuffle(train_data)
    random.shuffle(val_data)
    random.shuffle(test_data)
    
    # Verificar que todos los archivos estén en los 3 splits
    train_sources = set(item.get('metadata', {}).get('source') for item in train_data)
    val_sources = set(item.get('metadata', {}).get('source') for item in val_data)
    test_sources = set(item.get('metadata', {}).get('source') for item in test_data)
    
    all_in_train = len(train_sources)
    all_in_val = len(val_sources)
    all_in_test = len(test_sources)
    
    print(f"\n✅ Verificación de cobertura:")
    print(f"   Archivos en train: {all_in_train}/{len(unique_sources)}")
    print(f"   Archivos en validation: {all_in_val}/{len(unique_sources)}")
    print(f"   Archivos en test: {all_in_test}/{len(unique_sources)}")
    
    if all_in_train == all_in_val == all_in_test == len(unique_sources):
        print(f"   🎯 Todos los archivos están en los 3 splits!")
    else:
        missing_in_val = unique_sources - val_sources
        missing_in_test = unique_sources - test_sources
        if missing_in_val:
            print(f"   ⚠️  Archivos faltantes en validation: {missing_in_val}")
        if missing_in_test:
            print(f"   ⚠️  Archivos faltantes en test: {missing_in_test}")
    
    return train_data, val_data, test_data


def main():
    print("="*80)
    print("🚀 Combinación y Split de Datasets - Formato Óptimo Llama 3.1")
    print("="*80)
    print("\nFormato: ChatML (messages)")
    print("Split: 70% train, 15% validation, 15% test")
    print("Estratificación: Por idioma (ES/EN)")
    
    # 1. Cargar datos
    qa_data = load_qa_files(QA_DIR)
    hf_data = load_hf_files(QA_DIR)
    
    # 2. Combinar
    all_data = qa_data + hf_data
    print(f"\n📊 Total antes de deduplicación: {len(all_data):,} ejemplos")
    
    # 3. Deduplicar
    unique_data = deduplicate_data(all_data)
    duplicates = len(all_data) - len(unique_data)
    print(f"   Duplicados eliminados: {duplicates:,}")
    print(f"   Total único: {len(unique_data):,} ejemplos")
    
    # 4. Split estratificado 70-15-15
    random.seed(42)  # Reproducibilidad
    train_data, val_data, test_data = stratified_split(
        unique_data,
        train_ratio=0.70,
        val_ratio=0.15,
        test_ratio=0.15
    )
    
    print(f"\n📈 Distribución final:")
    print(f"   Train:      {len(train_data):,} ({len(train_data)/len(unique_data)*100:.1f}%)")
    print(f"   Validation: {len(val_data):,} ({len(val_data)/len(unique_data)*100:.1f}%)")
    print(f"   Test:       {len(test_data):,} ({len(test_data)/len(unique_data)*100:.1f}%)")
    
    # 5. Guardar archivos
    print(f"\n💾 Guardando archivos...")
    
    train_file = OUTPUT_DIR / "train.jsonl"
    val_file = OUTPUT_DIR / "validation.jsonl"
    test_file = OUTPUT_DIR / "test.jsonl"
    
    with open(train_file, 'w', encoding='utf-8') as f:
        for item in train_data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    print(f"   ✅ {train_file.name}")
    
    with open(val_file, 'w', encoding='utf-8') as f:
        for item in val_data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    print(f"   ✅ {val_file.name}")
    
    with open(test_file, 'w', encoding='utf-8') as f:
        for item in test_data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    print(f"   ✅ {test_file.name}")
    
    # 6. Estadísticas detalladas
    stats = {
        "total_examples": len(unique_data),
        "duplicates_removed": duplicates,
        "train_examples": len(train_data),
        "validation_examples": len(val_data),
        "test_examples": len(test_data),
        "train_ratio": len(train_data) / len(unique_data),
        "validation_ratio": len(val_data) / len(unique_data),
        "test_ratio": len(test_data) / len(unique_data),
        "languages": {
            "spanish": len([x for x in unique_data if x.get('metadata', {}).get('language') == 'es']),
            "english": len([x for x in unique_data if x.get('metadata', {}).get('language') == 'en'])
        },
        "sources": {
            "qa_generated": len(qa_data),
            "fenrir": len([x for x in hf_data if x.get('metadata', {}).get('source') == 'Fenrir-v2.0']),
            "trendyol": len([x for x in hf_data if x.get('metadata', {}).get('source') == 'Trendyol'])
        }
    }
    
    stats_file = OUTPUT_DIR / "dataset_stats.json"
    with open(stats_file, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    print(f"   ✅ {stats_file.name}")
    
    # 7. Resumen final
    print("\n" + "="*80)
    print("✅ Dataset final listo para fine-tuning!")
    print("="*80)
    print(f"\n📁 Archivos generados en: {OUTPUT_DIR}")
    print(f"   - train.jsonl ({len(train_data):,} ejemplos)")
    print(f"   - validation.jsonl ({len(val_data):,} ejemplos)")
    print(f"   - test.jsonl ({len(test_data):,} ejemplos)")
    print(f"   - dataset_stats.json (estadísticas)")
    
    print(f"\n🌍 Distribución de idiomas:")
    print(f"   - Español: {stats['languages']['spanish']:,} ({stats['languages']['spanish']/len(unique_data)*100:.1f}%)")
    print(f"   - Inglés: {stats['languages']['english']:,} ({stats['languages']['english']/len(unique_data)*100:.1f}%)")
    
    print(f"\n📚 Fuentes:")
    print(f"   - Tus Q&A: {stats['sources']['qa_generated']:,}")
    print(f"   - Fenrir v2.0: {stats['sources']['fenrir']:,}")
    print(f"   - Trendyol: {stats['sources']['trendyol']:,}")
    
    print(f"\n💡 Próximo paso:")
    print(f"   Subir a Hugging Face o usar directamente en RunPod")
    print(f"   Formato: ChatML (messages) - Óptimo para Llama 3.1")


if __name__ == "__main__":
    main()
