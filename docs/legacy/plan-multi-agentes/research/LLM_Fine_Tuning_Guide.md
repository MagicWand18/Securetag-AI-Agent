# Guía de Fine-Tuning para securetag-ai-agent

**Modelo Base**: Mixtral_AI_CyberCoder_7b.Q4_K_M.gguf  
**Objetivo**: Fine-tuning con datos de ciberseguridad y despliegue en RunPod  
**Fecha**: 2025-11-20

---

## 📚 Pregunta 1: Conversión de PDFs a Datasets de Entrenamiento

### Contexto
Tienes PDFs de ciberseguridad (ISO 27001, NIST, PCI-DSS, OWASP) que quieres convertir en datasets para fine-tuning.

### ¿Qué es TOON y aplica aquí?

**Token-Oriented Object Notation (TOON)** es un formato de serialización diseñado para **reducir el consumo de tokens** en interacciones con LLMs (30-60% menos tokens que JSON). Es útil para:
- Prompts más eficientes
- Reducir costos de inferencia
- Intercambio de datos estructurados con LLMs

**❌ TOON NO aplica para preparación de datasets de entrenamiento**. TOON es para *inferencia* (prompts/respuestas), no para *entrenamiento*. Para fine-tuning, el formato estándar es **JSONL** (JSON Lines).

---

### Pipeline de Conversión: PDF → Dataset JSONL

#### Paso 1: Extracción de Contenido de PDFs

**Herramientas Recomendadas**:

```bash
# Instalar dependencias
pip install pdfplumber pypdf pymupdf docling unsloth
pip install pdf2image pytesseract  # Para PDFs escaneados
```

**Script de Extracción** (`extract_pdfs.py`):

```python
import pdfplumber
import json
from pathlib import Path

def extract_text_from_pdf(pdf_path):
    """Extrae texto de PDF preservando estructura"""
    text_chunks = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            # Extraer texto
            text = page.extract_text()
            
            # Extraer tablas si existen
            tables = page.extract_tables()
            
            if text:
                text_chunks.append({
                    'source': pdf_path.name,
                    'page': page_num,
                    'type': 'text',
                    'content': text.strip()
                })
            
            # Convertir tablas a texto estructurado
            for table_idx, table in enumerate(tables):
                if table:
                    table_text = '\\n'.join([' | '.join(row) for row in table])
                    text_chunks.append({
                        'source': pdf_path.name,
                        'page': page_num,
                        'type': 'table',
                        'content': table_text
                    })
    
    return text_chunks

# Procesar todos los PDFs
pdf_dir = Path('./cybersecurity_pdfs')
all_chunks = []

for pdf_file in pdf_dir.glob('*.pdf'):
    print(f"Procesando: {pdf_file.name}")
    chunks = extract_text_from_pdf(pdf_file)
    all_chunks.extend(chunks)

# Guardar chunks crudos
with open('raw_chunks.json', 'w', encoding='utf-8') as f:
    json.dump(all_chunks, f, indent=2, ensure_ascii=False)

print(f"Total de chunks extraídos: {len(all_chunks)}")
```

**Para PDFs Escaneados** (con OCR):

```python
from pdf2image import convert_from_path
import pytesseract

def extract_text_ocr(pdf_path):
    """Extrae texto de PDFs escaneados usando OCR"""
    images = convert_from_path(pdf_path)
    text_chunks = []
    
    for page_num, image in enumerate(images, 1):
        text = pytesseract.image_to_string(image, lang='spa+eng')
        if text.strip():
            text_chunks.append({
                'source': pdf_path.name,
                'page': page_num,
                'type': 'ocr_text',
                'content': text.strip()
            })
    
    return text_chunks
```

---

#### Paso 2: Chunking y Limpieza

Los LLMs tienen límites de contexto. Divide el texto en chunks manejables:

```python
def chunk_text(text, max_tokens=512, overlap=50):
    """Divide texto en chunks con overlap"""
    # Aproximación: 1 token ≈ 4 caracteres
    max_chars = max_tokens * 4
    overlap_chars = overlap * 4
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + max_chars
        chunk = text[start:end]
        
        # Buscar punto final para no cortar oraciones
        if end < len(text):
            last_period = chunk.rfind('.')
            if last_period > max_chars * 0.7:  # Al menos 70% del chunk
                end = start + last_period + 1
                chunk = text[start:end]
        
        chunks.append(chunk.strip())
        start = end - overlap_chars
    
    return chunks

# Aplicar chunking
chunked_data = []
for item in all_chunks:
    text_chunks = chunk_text(item['content'])
    for chunk in text_chunks:
        chunked_data.append({
            'source': item['source'],
            'page': item['page'],
            'chunk': chunk
        })
```

---

#### Paso 3: Generar Pares Instrucción-Respuesta

Para fine-tuning efectivo, necesitas formato **instrucción → respuesta**. Usa un LLM para generar Q&A automáticamente:

```python
import ollama

def generate_qa_pairs(chunk, source_info):
    """Genera pares Q&A usando LLM local"""
    
    prompt = f\"\"\"Eres un experto en ciberseguridad. Lee el siguiente texto de {source_info['source']} y genera 3 pares de pregunta-respuesta relevantes para entrenamiento de un modelo de seguridad.

Texto:
{chunk}

Genera en formato JSON:
[
  {{"question": "...", "answer": "..."}},
  {{"question": "...", "answer": "..."}},
  {{"question": "...", "answer": "..."}}
]
\"\"\"
    
    response = ollama.generate(
        model='securetag-ai-agent:latest',
        prompt=prompt
    )
    
    try:
        qa_pairs = json.loads(response['response'])
        return qa_pairs
    except:
        return []

# Generar Q&A para todos los chunks
training_data = []

for idx, item in enumerate(chunked_data[:100]):  # Limitar para prueba
    print(f"Generando Q&A {idx+1}/{len(chunked_data)}")
    
    qa_pairs = generate_qa_pairs(item['chunk'], item)
    
    for qa in qa_pairs:
        training_data.append({
            'instruction': qa['question'],
            'input': '',
            'output': qa['answer'],
            'source': item['source'],
            'page': item['page']
        })

print(f"Total de ejemplos de entrenamiento: {len(training_data)}")
```

---

#### Paso 4: Convertir a Formato JSONL

El formato estándar para fine-tuning es **JSONL** (una línea JSON por ejemplo):

```python
# Formato para Mixtral/Llama (Alpaca format)
def convert_to_jsonl(data, output_file):
    """Convierte a formato JSONL para fine-tuning"""
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for item in data:
            # Formato Alpaca/Instruct
            example = {
                "instruction": item['instruction'],
                "input": item.get('input', ''),
                "output": item['output'],
                "metadata": {
                    "source": item.get('source', ''),
                    "page": item.get('page', '')
                }
            }
            
            # Escribir una línea JSON
            f.write(json.dumps(example, ensure_ascii=False) + '\\n')

# Generar dataset final
convert_to_jsonl(training_data, 'cybersecurity_training.jsonl')

# Dividir en train/validation (80/20)
import random
random.shuffle(training_data)
split_idx = int(len(training_data) * 0.8)

convert_to_jsonl(training_data[:split_idx], 'train.jsonl')
convert_to_jsonl(training_data[split_idx:], 'validation.jsonl')

print("✅ Datasets generados:")
print(f"  - train.jsonl: {split_idx} ejemplos")
print(f"  - validation.jsonl: {len(training_data) - split_idx} ejemplos")
```

---

### Formato JSONL Final

Cada línea en `train.jsonl`:

```json
{"instruction": "¿Qué es el principio de mínimo privilegio según ISO 27001?", "input": "", "output": "El principio de mínimo privilegio establece que los usuarios deben tener solo los permisos necesarios para realizar sus funciones, minimizando el riesgo de acceso no autorizado.", "metadata": {"source": "ISO27001.pdf", "page": 42}}
{"instruction": "Explica la diferencia entre autenticación y autorización", "input": "", "output": "La autenticación verifica la identidad del usuario (quién eres), mientras que la autorización determina qué recursos puede acceder (qué puedes hacer).", "metadata": {"source": "NIST_SP800-53.pdf", "page": 15}}
```

---

### Herramientas Alternativas

**Unsloth Synthetic Dataset** (automatizado):
```bash
pip install unsloth

# Notebook que genera Q&A automáticamente
# https://github.com/unslothai/unsloth
```

**Docling** (IBM, para PDFs complejos):
```bash
pip install docling

# Extrae con comprensión de layout (tablas, código, fórmulas)
```

---

## 🔧 Pregunta 2: Fine-Tuning en RunPod con Datasets

### Contexto
Tienes:
- Datasets en formato JSONL (del paso anterior)
- Otros datasets JSON existentes
- Modelo base: Mixtral_AI_CyberCoder_7b (formato GGUF)

### ¿TOON aplica aquí?

**❌ NO**. TOON es para inferencia, no para entrenamiento. Usa **JSONL** estándar.

---

### Pipeline de Fine-Tuning en RunPod

#### Paso 1: Preparar Modelo Base

**Importante**: GGUF es formato de *inferencia* (cuantizado). Para fine-tuning necesitas el modelo **sin cuantizar** (formato HuggingFace/safetensors).

**Opción A: Descargar Mixtral base**
```bash
# En RunPod Pod
git lfs install
git clone https://huggingface.co/mistralai/Mixtral-8x7B-v0.1
```

**Opción B: Si tienes acceso al modelo original pre-cuantización**
```bash
# Subir tu modelo base a RunPod Network Volume
```

---

#### Paso 2: Configurar RunPod Pod para Fine-Tuning

**Crear Pod en RunPod**:
1. Ir a **Pods** (no Serverless)
2. Seleccionar GPU: **A100 80GB** o **H100** (recomendado para Mixtral 8x7B)
3. Template: **RunPod PyTorch** o **Axolotl**
4. Disk: 100 GB mínimo
5. Network Volume: Crear/adjuntar para persistencia

**Conectar via SSH/JupyterLab**

---

#### Paso 3: Instalar Dependencias

```bash
# En el Pod de RunPod
pip install torch transformers accelerate peft bitsandbytes datasets trl

# Opcional: Usar Axolotl (framework de fine-tuning)
pip install axolotl
```

---

#### Paso 4: Subir Datasets

**Método 1: Via RunPod UI**
- Upload `train.jsonl` y `validation.jsonl` a Network Volume

**Método 2: Via SCP**
```bash
# Desde tu laptop
scp train.jsonl validation.jsonl root@<runpod-ip>:/workspace/data/
```

**Método 3: Via Git**
```bash
# En RunPod Pod
git clone https://github.com/tu-usuario/cybersecurity-datasets.git
```

---

#### Paso 5: Script de Fine-Tuning con QLoRA

**QLoRA** (Quantized LoRA) permite fine-tuning de Mixtral 8x7B en una sola GPU A100.

**`finetune_mixtral.py`**:

```python
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer
from datasets import load_dataset

# Configuración de cuantización 4-bit (QLoRA)
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

# Cargar modelo base Mixtral
model_name = "mistralai/Mixtral-8x7B-v0.1"  # O tu modelo custom
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)

tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token

# Preparar modelo para QLoRA
model = prepare_model_for_kbit_training(model)

# Configuración LoRA
lora_config = LoraConfig(
    r=16,  # Rank de matrices LoRA
    lora_alpha=32,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],  # Atención
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)

model = get_peft_model(model, lora_config)

# Cargar datasets JSONL
dataset = load_dataset('json', data_files={
    'train': '/workspace/data/train.jsonl',
    'validation': '/workspace/data/validation.jsonl'
})

# Formatear datos para entrenamiento
def format_instruction(example):
    """Convierte a formato de prompt"""
    if example['input']:
        prompt = f"### Instruction:\\n{example['instruction']}\\n\\n### Input:\\n{example['input']}\\n\\n### Response:\\n{example['output']}"
    else:
        prompt = f"### Instruction:\\n{example['instruction']}\\n\\n### Response:\\n{example['output']}"
    
    return {"text": prompt}

dataset = dataset.map(format_instruction)

# Configuración de entrenamiento
training_args = TrainingArguments(
    output_dir="/workspace/models/securetag-ai-finetuned",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    fp16=True,
    save_strategy="epoch",
    logging_steps=10,
    evaluation_strategy="epoch",
    warmup_steps=100,
    optim="paged_adamw_8bit",  # Optimizador para QLoRA
)

# Trainer
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset['train'],
    eval_dataset=dataset['validation'],
    tokenizer=tokenizer,
    args=training_args,
    max_seq_length=2048,
    dataset_text_field="text",
)

# Entrenar
print("🚀 Iniciando fine-tuning...")
trainer.train()

# Guardar modelo fine-tuned
model.save_pretrained("/workspace/models/securetag-ai-finetuned")
tokenizer.save_pretrained("/workspace/models/securetag-ai-finetuned")

print("✅ Fine-tuning completado!")
```

---

#### Paso 6: Ejecutar Fine-Tuning

```bash
# En RunPod Pod
python finetune_mixtral.py

# Monitorear GPU
watch -n 1 nvidia-smi
```

**Tiempo estimado**: 6-12 horas para 3 epochs con ~10k ejemplos en A100 80GB.

---

#### Paso 7: Convertir a GGUF (Opcional)

Después del fine-tuning, convierte a GGUF para inferencia eficiente:

```bash
# Instalar llama.cpp
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make

# Convertir modelo fine-tuned a GGUF
python convert.py /workspace/models/securetag-ai-finetuned --outtype f16 --outfile securetag-ai-finetuned-f16.gguf

# Cuantizar a Q4_K_M (como tu modelo original)
./quantize securetag-ai-finetuned-f16.gguf securetag-ai-finetuned-Q4_K_M.gguf Q4_K_M
```

---

### Combinar con Datasets JSON Existentes

Si tienes datasets JSON (no JSONL):

```python
import json

# Leer JSON
with open('existing_dataset.json', 'r') as f:
    data = json.load(f)

# Convertir a JSONL
with open('existing_dataset.jsonl', 'w') as f:
    for item in data:
        f.write(json.dumps(item) + '\\n')

# Combinar con otros datasets
!cat train.jsonl existing_dataset.jsonl > combined_train.jsonl
```

---

## 🚀 Pregunta 3: Desplegar Modelo Fine-Tuned en RunPod para Consumo desde DigitalOcean

### Contexto
Tienes:
- Modelo fine-tuned (formato GGUF)
- Modelfile personalizado de Ollama
- Contenedores Docker en DigitalOcean que necesitan consumir el modelo

---

### Pipeline de Despliegue

#### Paso 1: Preparar Modelo y Modelfile

**Tu Modelfile personalizado** (`Modelfile`):
```dockerfile
FROM ./securetag-ai-finetuned-Q4_K_M.gguf

TEMPLATE """### Instruction:
{{ .Prompt }}

### Response:
"""

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER repeat_penalty 1.1

SYSTEM """Eres un asistente experto en ciberseguridad especializado en análisis de vulnerabilidades, compliance (ISO 27001, NIST, PCI-DSS) y mejores prácticas de seguridad."""
```

---

#### Paso 2: Crear Endpoint Serverless en RunPod

**Opción A: RunPod Serverless con Ollama**

**1. Crear Dockerfile personalizado**:

```dockerfile
# Dockerfile
FROM ollama/ollama:latest

# Copiar modelo GGUF y Modelfile
COPY securetag-ai-finetuned-Q4_K_M.gguf /models/
COPY Modelfile /models/Modelfile

# Script de inicio
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
```

**`start.sh`**:
```bash
#!/bin/bash

# Iniciar Ollama server
ollama serve &

# Esperar a que Ollama esté listo
sleep 5

# Crear modelo desde Modelfile
cd /models
ollama create securetag-ai-agent:finetuned -f Modelfile

# Mantener contenedor vivo
tail -f /dev/null
```

**2. Build y Push a Docker Hub**:

```bash
# En tu laptop o RunPod Pod
docker build -t tu-usuario/securetag-ollama:latest .
docker push tu-usuario/securetag-ollama:latest
```

**3. Crear Serverless Endpoint en RunPod**:

- Ir a **Serverless** → **New Endpoint**
- **Container Image**: `tu-usuario/securetag-ollama:latest`
- **GPU**: RTX 4090 o A100 (según tamaño del modelo)
- **Container Disk**: 20 GB
- **Network Volume**: Opcional (para cachear modelo)
- **Environment Variables**:
  ```
  OLLAMA_HOST=0.0.0.0:11434
  ```

**4. Configurar Handler (opcional para RunPod Serverless)**:

Si usas RunPod Serverless Workers, necesitas un `handler.py`:

```python
import runpod
import requests

def handler(event):
    """Handler para RunPod Serverless"""
    prompt = event['input']['prompt']
    
    # Llamar a Ollama local
    response = requests.post('http://localhost:11434/api/generate', json={
        'model': 'securetag-ai-agent:finetuned',
        'prompt': prompt,
        'stream': False
    })
    
    result = response.json()
    
    return {
        'response': result.get('response', ''),
        'model': 'securetag-ai-agent:finetuned'
    }

runpod.serverless.start({"handler": handler})
```

---

#### Paso 3: Obtener Endpoint URL

Después de desplegar, RunPod te dará:
- **Endpoint ID**: `abc123xyz`
- **Endpoint URL**: `https://api.runpod.ai/v2/abc123xyz/runsync`
- **API Key**: Tu API key de RunPod

---

#### Paso 4: Configurar Docker Compose en DigitalOcean

**Actualizar `docker-compose.yml`**:

```yaml
services:
  securetag-app:
    # ... configuración existente ...
    environment:
      # ... otras variables ...
      OLLAMA_HOST: https://api.runpod.ai/v2/abc123xyz
      RUNPOD_API_KEY: ${RUNPOD_API_KEY}
      OLLAMA_MODEL: securetag-ai-agent:finetuned
```

**Archivo `.env` en DigitalOcean**:
```bash
RUNPOD_API_KEY=tu-api-key-de-runpod
```

---

#### Paso 5: Adaptar Código para Consumir RunPod

**Opción A: Usar API de RunPod directamente**

Actualizar `src/utils/llm.ts` (o equivalente):

```typescript
import axios from 'axios';

export async function generateWithLLM(prompt: string): Promise<string> {
  const runpodEndpoint = process.env.OLLAMA_HOST;
  const apiKey = process.env.RUNPOD_API_KEY;
  
  if (runpodEndpoint?.includes('runpod.ai')) {
    // Usar RunPod Serverless
    const response = await axios.post(
      `${runpodEndpoint}/runsync`,
      {
        input: {
          prompt: prompt,
          model: process.env.OLLAMA_MODEL || 'securetag-ai-agent:finetuned'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.output.response;
  } else {
    // Usar Ollama local (desarrollo)
    const response = await axios.post(`${runpodEndpoint}/api/generate`, {
      model: process.env.OLLAMA_MODEL || 'securetag-ai-agent:latest',
      prompt: prompt,
      stream: false
    });
    
    return response.data.response;
  }
}
```

**Opción B: Proxy Ollama → RunPod**

Crear servicio proxy que traduce API de Ollama a RunPod:

```typescript
// src/services/ollama-proxy.ts
import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

app.post('/api/generate', async (req, res) => {
  const { model, prompt, stream } = req.body;
  
  // Traducir a formato RunPod
  const runpodResponse = await axios.post(
    `${process.env.RUNPOD_ENDPOINT}/runsync`,
    {
      input: { prompt, model }
    },
    {
      headers: { 'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}` }
    }
  );
  
  // Traducir respuesta a formato Ollama
  res.json({
    model: model,
    response: runpodResponse.data.output.response,
    done: true
  });
});

app.listen(11434, () => console.log('Ollama proxy running on :11434'));
```

---

#### Paso 6: Desplegar en DigitalOcean

```bash
# En DigitalOcean Droplet
git pull origin main

# Actualizar variables de entorno
echo "RUNPOD_API_KEY=tu-api-key" >> .env

# Reiniciar servicios
docker compose down
docker compose up -d

# Verificar logs
docker compose logs -f securetag-app
```

---

### Verificación End-to-End

**Test desde DigitalOcean**:

```bash
# Dentro del contenedor securetag-app
curl -X POST http://localhost:8080/api/analyze -H "Content-Type: application/json" -d '{
  "code": "SELECT * FROM users WHERE id = " + userId,
  "type": "sql_injection"
}'
```

Debería usar el modelo fine-tuned en RunPod.

---

## 📊 Arquitectura Final

```
┌─────────────────────────────────────────────────────────┐
│                    DigitalOcean                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ securetag-app│  │securetag-work│  │ securetag-db │  │
│  │              │  │     er       │  │              │  │
│  └──────┬───────┘  └──────────────┘  └──────────────┘  │
│         │                                               │
│         │ HTTPS Request                                 │
└─────────┼───────────────────────────────────────────────┘
          │
          │ API Call
          ▼
┌─────────────────────────────────────────────────────────┐
│                    RunPod Serverless                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Ollama + securetag-ai-agent:finetuned (GGUF)   │   │
│  │  - Auto-scaling                                  │   │
│  │  - Pay per inference                             │   │
│  │  - Cold start ~500ms                             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 💰 Estimación de Costos

### Fine-Tuning (Una vez)
- **RunPod A100 80GB**: $1.99/hora
- **Tiempo**: ~8 horas
- **Costo**: ~$16 (una sola vez)

### Inferencia (Producción)
- **RunPod Serverless A100**: $2.17/hora (solo tiempo activo)
- **100 análisis/día**: ~25 hrs/mes = **$54/mes**
- **1,000 análisis/día**: ~250 hrs/mes = **$542/mes**

**Ahorro vs DigitalOcean GPU Droplet**: 76-97%

---

## 🎯 Resumen de Respuestas

### 1. PDF → Dataset
- **TOON**: ❌ No aplica (es para inferencia)
- **Formato**: JSONL (JSON Lines)
- **Pipeline**: PDF → Extracción → Chunking → Q&A Generation → JSONL

### 2. Fine-Tuning en RunPod
- **TOON**: ❌ No aplica
- **Formato**: JSONL estándar
- **Método**: QLoRA (4-bit) para eficiencia
- **Output**: Modelo HuggingFace → Convertir a GGUF

### 3. Despliegue RunPod → DigitalOcean
- **Método**: RunPod Serverless Endpoint
- **Formato**: GGUF + Modelfile en contenedor Ollama
- **Consumo**: API REST desde DigitalOcean
- **Ventaja**: Auto-scaling, pay-per-use

---

## 📚 Recursos Adicionales

- **Unsloth**: https://github.com/unslothai/unsloth (Dataset generation)
- **Axolotl**: https://github.com/OpenAccess-AI-Collective/axolotl (Fine-tuning framework)
- **llama.cpp**: https://github.com/ggerganov/llama.cpp (GGUF conversion)
- **RunPod Docs**: https://docs.runpod.io/serverless/endpoints
- **PEFT/LoRA**: https://huggingface.co/docs/peft
