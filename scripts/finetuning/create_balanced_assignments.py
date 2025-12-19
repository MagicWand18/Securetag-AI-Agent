#!/usr/bin/env python3
"""
Script para identificar archivos pendientes y crear asignación balanceada de workers.
"""

import json
from pathlib import Path

# Directorios
PROCESSED_DIR = Path(__file__).parents[2] / "datasets" / "processed"
QA_DIR = Path(__file__).parents[2] / "datasets" / "qa_generated"

def get_chunk_count(file_path):
    """Obtiene el número de chunks de un archivo."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return len(data)
    except:
        return 0

def main():
    # Obtener archivos ya procesados
    processed_qa = set()
    for qa_file in QA_DIR.glob("*_chunks_qa.json"):
        # Extraer nombre base (sin _chunks_qa.json)
        base_name = qa_file.name.replace("_chunks_qa.json", "")
        processed_qa.add(base_name)
    
    print(f"✅ Archivos ya procesados (Q&A generado): {len(processed_qa)}")
    
    # Obtener todos los archivos de chunks
    all_chunks = {}
    for chunk_file in PROCESSED_DIR.glob("*_chunks.json"):
        base_name = chunk_file.name.replace("_chunks.json", "")
        chunk_count = get_chunk_count(chunk_file)
        all_chunks[base_name] = {
            'file': chunk_file.name,
            'chunks': chunk_count
        }
    
    print(f"📁 Total de archivos en processed: {len(all_chunks)}")
    
    # Identificar pendientes
    pending = {}
    for base_name, info in all_chunks.items():
        if base_name not in processed_qa:
            pending[base_name] = info
    
    print(f"⏳ Archivos pendientes: {len(pending)}")
    print()
    
    # Ordenar por chunks (descendente)
    sorted_pending = sorted(pending.items(), key=lambda x: x[1]['chunks'], reverse=True)
    
    # Mostrar pendientes
    print("📋 Archivos pendientes (ordenados por chunks):")
    print("-" * 80)
    total_pending_chunks = 0
    for base_name, info in sorted_pending:
        print(f"  {info['file']:<50} {info['chunks']:>6} chunks")
        total_pending_chunks += info['chunks']
    print("-" * 80)
    print(f"  TOTAL PENDIENTE:{' ' * 38} {total_pending_chunks:>6} chunks")
    print()
    
    # Crear asignación balanceada para 3 workers
    workers = [[], [], []]
    worker_chunks = [0, 0, 0]
    
    # Identificar archivos muy grandes (>5000 chunks) para dividir
    large_files = []
    normal_files = []
    
    for base_name, info in sorted_pending:
        if info['chunks'] > 5000:
            large_files.append((base_name, info))
        else:
            normal_files.append((base_name, info))
    
    # Dividir archivos grandes entre workers
    for base_name, info in large_files:
        total_chunks = info['chunks']
        chunks_per_worker = total_chunks // 3
        
        for i in range(3):
            # Calcular rango de chunks para este worker
            start_chunk = i * chunks_per_worker
            if i == 2:  # Último worker toma el resto
                end_chunk = total_chunks
            else:
                end_chunk = (i + 1) * chunks_per_worker
            
            chunk_count = end_chunk - start_chunk
            
            # Agregar con rango específico
            workers[i].append({
                'file': info['file'],
                'start_chunk': start_chunk,
                'end_chunk': end_chunk
            })
            worker_chunks[i] += chunk_count
    
    # Asignar archivos normales con algoritmo greedy
    for base_name, info in normal_files:
        # Encontrar worker con menos chunks
        min_worker = worker_chunks.index(min(worker_chunks))
        workers[min_worker].append({
            'file': info['file'],
            'start_chunk': None,
            'end_chunk': None
        })
        worker_chunks[min_worker] += info['chunks']
    
    print("⚖️  Asignación balanceada (3 workers):")
    print("=" * 80)
    for i in range(3):
        print(f"\nWorker {i}: {worker_chunks[i]:,} chunks")
        print("-" * 80)
        for file_info in workers[i]:
            if isinstance(file_info, dict):
                file_name = file_info['file']
                start = file_info.get('start_chunk')
                end = file_info.get('end_chunk')
                
                # Buscar el total de chunks del archivo
                total_chunks = next((info['chunks'] for name, info in sorted_pending if info['file'] == file_name), 0)
                
                if start is not None and end is not None:
                    chunk_count = end - start
                    print(f"  {file_name:<40} {chunk_count:>6} chunks (rango: {start}-{end})")
                else:
                    print(f"  {file_name:<50} {total_chunks:>6} chunks")
            else:
                # Compatibilidad con formato antiguo
                chunks = next(info['chunks'] for name, info in sorted_pending if info['file'] == file_info)
                print(f"  {file_info:<50} {chunks:>6} chunks")
    
    print()
    print("=" * 80)
    max_diff = max(worker_chunks) - min(worker_chunks)
    avg_chunks = sum(worker_chunks) / 3
    print(f"Diferencia máxima: {max_diff:,} chunks ({max_diff/avg_chunks*100:.1f}%)")
    print()
    
    # Generar worker_assignments.conf
    conf_content = "# Worker Assignment Configuration - PENDIENTES ÚNICAMENTE\n"
    conf_content += "# Generado automáticamente\n"
    conf_content += "# Archivos grandes divididos entre workers con rangos específicos\n\n"
    
    for i in range(3):
        conf_content += f"[worker_{i}]\n"
        conf_content += "files = [\n"
        for file_info in workers[i]:
            if isinstance(file_info, dict):
                file_name = file_info['file']
                start = file_info.get('start_chunk')
                end = file_info.get('end_chunk')
                
                if start is not None and end is not None:
                    conf_content += f'    "{file_name}:{start}-{end}",\n'
                else:
                    conf_content += f'    "{file_name}",\n'
            else:
                conf_content += f'    "{file_info}",\n'
        conf_content += "]\n"
        conf_content += f"# Total: {worker_chunks[i]:,} chunks\n\n"
    
    # Guardar configuración
    conf_path = Path(__file__).parent / "worker_assignments.conf"
    with open(conf_path, 'w', encoding='utf-8') as f:
        f.write(conf_content)
    
    print(f"✅ Configuración guardada en: {conf_path}")
    
    # Generar run_balanced.sh
    bash_content = "#!/bin/bash\n"
    bash_content += "# Script para ejecutar 3 workers con asignación balanceada - PENDIENTES\n"
    bash_content += "# Generado automáticamente\n\n"
    bash_content += 'echo "🚀 Iniciando 3 workers con asignación balanceada (solo pendientes)..."\n'
    bash_content += 'echo ""\n\n'
    
    # Crear directorio de logs si no existe
    bash_content += "mkdir -p logs\n\n"
    
    for i in range(3):
        # Construir lista de archivos con rangos si aplica
        files_list = []
        for file_info in workers[i]:
            if isinstance(file_info, dict):
                file_name = file_info['file']
                start = file_info.get('start_chunk')
                end = file_info.get('end_chunk')
                
                if start is not None and end is not None:
                    files_list.append(f"{file_name}:{start}-{end}")
                else:
                    files_list.append(file_name)
            else:
                files_list.append(file_info)
        
        files_str = ",".join(files_list)
        bash_content += f"# Worker {i}: {worker_chunks[i]:,} chunks\n"
        bash_content += f'echo "Iniciando Worker {i} ({worker_chunks[i]:,} chunks)..."\n'
        bash_content += f'nohup python3 scripts/finetuning/generate_qa.py --files "{files_str}" > logs/worker_{i}.log 2>&1 &\n'
        bash_content += "sleep 2\n\n"
    
    bash_content += 'echo ""\n'
    bash_content += 'echo "✅ 3 workers iniciados con asignación balanceada"\n'
    bash_content += 'echo ""\n'
    bash_content += 'echo "Distribución de carga:"\n'
    for i in range(3):
        bash_content += f'echo "  Worker {i}: {worker_chunks[i]:,} chunks"\n'
    bash_content += 'echo ""\n'
    bash_content += f'echo "Diferencia máxima: {max_diff:,} chunks ({max_diff/avg_chunks*100:.1f}%)"\n'
    bash_content += 'echo ""\n'
    bash_content += 'echo "Para monitorear el progreso:"\n'
    for i in range(3):
        bash_content += f'echo "  tail -f logs/worker_{i}.log"\n'
    bash_content += 'echo ""\n'
    bash_content += 'echo "Para detener todos los workers:"\n'
    bash_content += 'echo "  pkill -f \'generate_qa.py\'"\n'
    
    bash_path = Path(__file__).parent / "run_balanced.sh"
    with open(bash_path, 'w', encoding='utf-8') as f:
        f.write(bash_content)
    
    # Hacer ejecutable
    bash_path.chmod(0o755)
    
    print(f"✅ Script bash guardado en: {bash_path}")
    print()
    print("🚀 Para ejecutar:")
    print(f"   cd {Path(__file__).parents[2]}")
    print("   ./scripts/finetuning/run_balanced.sh")

if __name__ == "__main__":
    main()
