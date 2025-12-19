import json
import glob
import random
from pathlib import Path
from typing import List, Dict
import hashlib

def load_qa_files(input_dir: Path) -> List[Dict]:
    """Carga todos los archivos JSON de Q&A generados."""
    qa_pairs = []
    files = list(input_dir.glob("*.json"))
    
    print(f"📚 Encontrados {len(files)} archivos de Q&A")
    
    for file_path in files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            # Manejar diferentes estructuras posibles
            pairs = []
            if isinstance(data, list):
                pairs = data
            elif isinstance(data, dict):
                if 'qa_pairs' in data:
                    pairs = data['qa_pairs']
                elif 'pairs' in data:
                    pairs = data['pairs']
            
            # Añadir metadata de origen
            for pair in pairs:
                pair['source_file'] = file_path.name
                qa_pairs.append(pair)
                
            print(f"  ✓ {file_path.name}: {len(pairs)} pares")
            
        except Exception as e:
            print(f"  ❌ Error cargando {file_path.name}: {e}")
            
    return qa_pairs

def format_alpaca(qa_pair: Dict) -> Dict:
    """Convierte un par Q&A al formato Alpaca."""
    
    # Extraer campos
    question = qa_pair.get('question', '')
    answer = qa_pair.get('answer', '')
    context = qa_pair.get('context', '')
    
    # Construir instrucción
    instruction = question
    
    # Construir input (contexto opcional)
    input_text = ""
    if context:
        input_text = f"Contexto:\n{context}"
    
    return {
        "instruction": instruction,
        "input": input_text,
        "output": answer
    }

def main():
    # Configuración
    base_dir = Path(__file__).parent.parent.parent
    input_dir = base_dir / "datasets" / "qa_generated"
    output_dir = base_dir / "datasets" / "training"
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("🚀 Iniciando conversión a JSONL (Formato Alpaca)...")
    
    # 1. Cargar datos
    raw_pairs = load_qa_files(input_dir)
    print(f"\n📊 Total de pares Q&A cargados: {len(raw_pairs)}")
    
    if not raw_pairs:
        print("❌ No se encontraron datos para procesar.")
        return

    # 2. Convertir y limpiar
    alpaca_data = []
    seen_hashes = set()
    
    for pair in raw_pairs:
        # Validar campos mínimos
        if not pair.get('question') or not pair.get('answer'):
            continue
            
        formatted = format_alpaca(pair)
        
        # Deduplicación simple basada en instrucción + input
        content_hash = hashlib.md5(
            (formatted['instruction'] + formatted['input']).encode()
        ).hexdigest()
        
        if content_hash not in seen_hashes:
            seen_hashes.add(content_hash)
            alpaca_data.append(formatted)
            
    print(f"✨ Pares únicos después de limpieza: {len(alpaca_data)}")
    
    # 3. Split Train/Validation (80/20)
    random.seed(42) # Reproducibilidad
    random.shuffle(alpaca_data)
    
    split_idx = int(len(alpaca_data) * 0.8)
    train_data = alpaca_data[:split_idx]
    val_data = alpaca_data[split_idx:]
    
    print(f"\n📈 Distribución:")
    print(f"  - Training: {len(train_data)} (80%)")
    print(f"  - Validation: {len(val_data)} (20%)")
    
    # 4. Guardar archivos
    train_file = output_dir / "train.jsonl"
    val_file = output_dir / "validation.jsonl"
    
    with open(train_file, 'w', encoding='utf-8') as f:
        for item in train_data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
            
    with open(val_file, 'w', encoding='utf-8') as f:
        for item in val_data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
            
    print(f"\n✅ Archivos generados exitosamente:")
    print(f"  - {train_file}")
    print(f"  - {val_file}")

if __name__ == "__main__":
    main()
