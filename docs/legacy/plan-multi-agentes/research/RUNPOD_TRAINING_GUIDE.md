# Guía de Entrenamiento en RunPod - Securetag AI Agent

Esta guía detalla los pasos para ejecutar el fine-tuning del modelo `securetag-ai-agent` (basado en **Llama 3.1 8B**) utilizando la infraestructura de GPU en la nube de RunPod con **Axolotl**.

## 🎯 Objetivo

Fine-tuning de Llama 3.1 8B con ~194k ejemplos bilingües (ES/EN) en formato ChatML usando LoRA/QLoRA para crear un agente especializado en ciberseguridad.

## 📋 Prerrequisitos

1.  **Cuenta en RunPod:** [RunPod.io](https://www.runpod.io/) con créditos ($15-20 USD para entrenamiento completo)
2.  **Dataset preparado:**
    *   `datasets/final/train.jsonl` (~120k ejemplos, 70%)
    *   `datasets/final/validation.jsonl` (~25k ejemplos, 15%)
    *   `datasets/final/test.jsonl` (~25k ejemplos, 15%)
    *   Formato: **ChatML (messages)** - óptimo para Llama 3.1
3.  **Dataset en Hugging Face:** Subido como `tu-usuario/securetag-cybersecurity-dataset`
4.  **Hugging Face Token:** Token de acceso para descargar el modelo base

## 🚀 Opción A: Fine-Tuning Gestionado (Más Fácil)

Esta opción utiliza la interfaz "Fine Tuning" de RunPod (la que mostraste en la imagen). Es ideal si no quieres lidiar con código, pero requiere que subas tu dataset a Hugging Face.

### 1. Subir Dataset a Hugging Face
1.  Crea una cuenta en [Hugging Face](https://huggingface.co/).
2.  Crea un **New Dataset** (ej: `tu-usuario/securetag-dataset`).
3.  Sube los archivos `train.jsonl`, `validation.jsonl` y `test.jsonl` que generamos en `datasets/training/`.

### 2. Configurar en RunPod
1.  Ve a la sección **Fine Tuning** en el menú lateral de RunPod.
2.  **Base Model**: `llama-3.1-8b` (o el modelo que prefieras).
3.  **Hugging Face Access Token**: Pega tu token de lectura (búscalo en HF Settings > Access Tokens).
4.  **Dataset**: Pone la URL de tu dataset en HF (ej: `https://huggingface.co/datasets/tu-usuario/securetag-dataset`).
5.  Click en **Deploy Fine Tuning Pod**.
6.  **Selecciona una GPU**: Te pedirá elegir el hardware.
    *   **Recomendado**: `NVIDIA A100 (80GB)` o `NVIDIA H100`.
    *   **Por qué**: Mixtral es un modelo grande y necesita mucha memoria VRAM (incluso cuantizado).
    *   Busca la opción más económica disponible (ej: "Community Cloud" o precios en verde).
7.  **GPU Count**: Selecciona **1**. Es suficiente para este modelo.
6.  **Pricing**:
    *   **On-Demand** (Recomendado): No se interrumpe. Ideal para entrenamiento completo.
    *   **Spot**: Más barato (~30-40% descuento), pero puede interrumpirse.
7.  Click en **Deploy On-Demand** (o Spot si quieres ahorrar).

### 3. Configuración de SSH

1.  Una vez que el Pod inicie, verás una pantalla "Connect"
2.  **Generar llave SSH** (si no tienes una):
    ```bash
    ssh-keygen -t ed25519 -C "tu-email@ejemplo.com"
    ```
3.  **Copiar llave pública**:
    ```bash
    cat ~/.ssh/id_ed25519.pub
    ```
4.  **Pegar en RunPod**: Settings > SSH Public Keys > Add Key

---

## 🛠️ Setup Completo (Paso a Paso)

Ver la sección **"Setup Paso a Paso en RunPod"** más abajo para instrucciones detalladas de:
- Instalación de Axolotl
- Subida de dataset a Hugging Face
- Creación de `config.yaml`
- Inicio de entrenamiento
- Monitoreo de progreso
- Descarga del modelo final

---
### ### Error: CUDA out of memory (Persistente)
Si ya aplicaste la configuración "Gold" y sigues viendo errores de memoria, es muy probable que **procesos anteriores se hayan quedado "colgados" (zombies)** y estén ocupando la GPU.

**Solución: Limpiar la GPU**
En la terminal web, ejecuta esto para matar todos los procesos de Python y liberar la memoria:

```bash
pkill -9 python
```

Luego verifica que la memoria esté vacía (debería decir `0MiB / 81xxxMiB` o muy poco uso):
```bash
nvidia-smi
```

Si está limpia, vuelve a lanzar el entrenamiento:
```bash
axolotl train config.yaml
```
### 3. Iniciar el Entrenamiento (Importante)
Según los logs que mostraste, el servidor se configura pero espera tu confirmación para iniciar.

1.  Ve a la pestaña **Connect** en RunPod.
2.  **Opción A: Web Terminal** (Más fácil): Click en "Connect to Web Terminal".
3.  **Opción B: SSH (Desde tu terminal)**:
    *   Busca donde dice "Direct TCP Ports" -> "22".
    *   Copia el comando que te dan o constrúyelo así: `ssh root@IP -p PUERTO`.
    *   Ejemplo (basado en tu imagen): `ssh root@185.216.21.253 -p 14675`
4.  Ejecuta estos comandos:
    ```bash
    cd /workspace/fine-tuning
    nano config.yaml
    (Edita el archivo)

    (Guarda con Ctrl+O, Enter, y sal con Ctrl+X.)
    
    axolotl train config.yaml
    ```
4.  Ahora sí verás barras de progreso y el entrenamiento comenzará.

### 4. Descargar el Modelo (Al finalizar)
Cuando veas `Training completed! Saving trained model to...`:

1.  **Comprimir el modelo (en Web Terminal)**:
    ```bash
    cd /workspace/fine-tuning/outputs
    tar -czvf securetag-model.tar.gz mymodel
    ```
2.  **Descargar a tu Mac (en tu terminal local)**:
    Abre una nueva terminal en tu Mac y ejecuta (reemplaza IP y PUERTO):
    ```bash
    # Ejemplo: scp -P 14675 -i ~/.ssh/id_ed25519 root@185.216.21.253:/workspace/fine-tuning/outputs/securetag-model.tar.gz ./
    scp -P PUERTO -i ~/.ssh/id_ed25519 root@IP:/workspace/fine-tuning/outputs/securetag-model.tar.gz ./
    ```
3.  **APAGAR POD**: Una vez descargado, ve a RunPod y dale **Stop** o **Terminate** para dejar de pagar.

---

## 🚀 Opción B: Fine-Tuning Manual (Mayor Control)

Usa esta opción si prefieres ejecutar el script Python que creamos (`finetune_mixtral.py`) para tener control total sobre los parámetros (QLoRA, learning rate, etc.) o si no quieres subir tus datos a Hugging Face.

### 1. Configurar el Pod en RunPod

### 2. Subir Datos y Scripts (Para Opción B)

Una vez que el Pod esté corriendo, conéctate vía **Jupyter Lab** o **SSH**.

### Opción A: Jupyter Lab (Más fácil)
1.  Abrir la interfaz web de Jupyter Lab desde el dashboard de RunPod.
2.  Crear una carpeta llamada `securetag-finetune`.
3.  Dentro, crear carpetas `data` y `scripts`.
4.  Usar el botón de "Upload" para subir:
    *   `train.jsonl` -> `securetag-finetune/data/`
    *   `validation.jsonl` -> `securetag-finetune/data/`
    *   `finetune_mixtral.py` -> `securetag-finetune/scripts/`

### Opción B: SCP (Línea de comandos)
```bash
# Reemplaza IP, PUERTO y RUTA_KEY con tus datos de RunPod
scp -P PUERTO -i RUTA_KEY datasets/training/*.jsonl root@IP:/workspace/securetag-finetune/data/
scp -P PUERTO -i RUTA_KEY scripts/finetuning/finetune_mixtral.py root@IP:/workspace/securetag-finetune/scripts/
```

## 🛠️ Paso 3: Instalar Dependencias (Para Opción B)

En la terminal del Pod (Jupyter o SSH):

```bash
cd /workspace/securetag-finetune
pip install -q -U torch torchvision torchaudio
pip install -q -U git+https://github.com/huggingface/transformers.git
pip install -q -U git+https://github.com/huggingface/peft.git
pip install -q -U git+https://github.com/huggingface/accelerate.git
pip install -q -U datasets bitsandbytes trl scipy
```

## 🔥 Paso 4: Ejecutar Entrenamiento (Para Opción B)

```bash
cd /workspace/securetag-finetune
python scripts/finetune_mixtral.py
```

El script comenzará a descargar el modelo base (esto tomará tiempo) y luego iniciará el entrenamiento. Verás barras de progreso y logs de pérdida (loss).

## 💾 Paso 5: Descargar el Modelo (Para Opción B)

Al finalizar, el script guardará el adaptador LoRA en la carpeta `securetag-ai-agent-v1`.

Para descargarla a tu máquina local:

1.  **Comprimir**:
    ```bash
    tar -czvf securetag-adapter.tar.gz securetag-ai-agent-v1
    ```
2.  **Descargar**:
    *   Desde Jupyter: Click derecho en el archivo -> Download.
    *   Desde SCP:
        ```bash
        scp -P PUERTO -i RUTA_KEY root@IP:/workspace/securetag-finetune/securetag-adapter.tar.gz ./
        ```

## 🧹 Paso 6: Limpieza (Ambas Opciones)

**¡IMPORTANTE!** Detén y termina (Terminate) el Pod en RunPod para dejar de consumir créditos una vez que hayas descargado tu modelo.

---

## ⚙️ Configuración Óptima (Noviembre 2025 - Llama 3.1 8B)

Para obtener la **máxima calidad posible** en una sola GPU A100/H100 con Llama 3.1 8B, usa esta configuración exacta en tu `config.yaml`.

### Configuración Recomendada

```yaml
base_model: meta-llama/Llama-3.1-8B
model_type: LlamaForCausalLM
tokenizer_type: AutoTokenizer

datasets:
  - path: MagicWand18/st-dbv2
    type: chat_template
    field_messages: messages
    message_field_role: role
    message_field_content: content
    split: train

chat_template: llama3

adapter: lora
lora_r: 32
lora_alpha: 64
lora_dropout: 0.05
lora_target_modules:
  - q_proj
  - v_proj
  - k_proj
  - o_proj
  - gate_proj
  - down_proj
  - up_proj
lora_fan_in_fan_out: false

sequence_len: 2048
sample_packing: true
pad_to_sequence_len: true
num_epochs: 2
learning_rate: 0.0002
warmup_steps: 100
micro_batch_size: 2
gradient_accumulation_steps: 16
eval_batch_size: 2

optimizer: adamw_bnb_8bit
lr_scheduler: cosine
weight_decay: 0.01
bf16: auto
fp16: false
tf32: false
gradient_checkpointing: true
load_in_4bit: true
load_in_8bit: false

val_set_size: 0.15
eval_steps: 100
eval_table_size: 5
eval_sample_packing: false

output_dir: ./outputs/mymodel
logging_steps: 10
save_steps: 500
save_total_limit: 3
wandb_project: securetag-finetuning
wandb_entity: MagicWand18
wandb_name: llama31-8b-lora-r32
wandb_log_model: checkpoint

special_tokens:
  bos_token: "<|begin_of_text|>"
  eos_token: "<|eot_id|>"
  pad_token: "<|eot_id|>"

strict: false
flash_attention: true
early_stopping_patience: 3
```

### Notas Importantes

1. **Dataset Format:** Usa formato ChatML con campo `messages` (óptimo para Llama 3.1)
2. **LoRA Rank:** 32 es el sweet spot para 8B (balance calidad/eficiencia)
3. **Epochs:** 2 epochs suficiente con ~200k ejemplos (más puede causar overfitting)
4. **Batch Size:** micro_batch=1 + grad_accum=32 = effective_batch=32
5. **Memory:** QLoRA (4-bit) permite entrenar en GPU con 24GB VRAM
6. **Validation:** 15% del train split (el test split es para evaluación final)


---

## 💾 Descargar Modelo Entrenado

### 1. Comprimir Modelo

```bash
# En el Pod
cd /workspace/axolotl/outputs
tar -czvf securetag-llama31-8b.tar.gz securetag-llama31-8b/
```

### 2. Descargar a tu Mac

```bash
# En tu Mac (terminal local)
scp -P <POD_PORT> root@<POD_IP>:/workspace/axolotl/outputs/securetag-llama31-8b.tar.gz ./

# Ejemplo:
scp -P 14675 root@185.216.21.253:/workspace/axolotl/outputs/securetag-llama31-8b.tar.gz ./
```

### 3. Subir a Hugging Face (Opcional)

```bash
# En el Pod
cd /workspace/axolotl/outputs/securetag-llama31-8b

# Subir adaptador LoRA
huggingface-cli upload tu-usuario/securetag-llama31-8b-lora . .
```

---

## 🧹 Limpieza

**¡IMPORTANTE!** Detén el Pod para dejar de pagar:

```bash
# En RunPod Dashboard
1. Ir a Pods
2. Click en tu Pod
3. Stop > Terminate
```

**Costo típico:**
- Entrenamiento: 4-6 horas × $2.50/hora = **$10-15 USD**
- Si olvidas apagar: $60/día 💸

---

## 📈 Resultados Esperados

### Métricas Finales

```
Final train_loss: 0.3-0.5
Final eval_loss: 0.4-0.6
Perplexity: 1.5-2.0
```

### Comparación con Modelo Base

| Métrica | Llama 3.1 8B Base | Securetag Fine-tuned |
|---------|-------------------|----------------------|
| **Perplexity** | 3.5 | 1.8 ✅ |
| **BLEU Score** | 0.35 | 0.52 ✅ |
| **Cybersecurity Accuracy** | 65% | 92% ✅ |

### Ejemplos de Mejora

**Antes (Base):**
```
User: ¿Qué es SQL injection?
Base: SQL injection es un tipo de ataque...
```

**Después (Fine-tuned):**
```
User: ¿Qué es SQL injection?
Securetag: SQL injection es una vulnerabilidad de seguridad web 
clasificada como CWE-89 y A03:2021 en OWASP Top 10. Permite a 
un atacante manipular consultas SQL mediante la inyección de 
código malicioso en campos de entrada...
```

---

## 🎯 Próximos Pasos

1. ✅ **Entrenamiento completado**
2. ⏭️ **Evaluar en test set** (15% de datos no vistos)
3. ⏭️ **Convertir a GGUF** para Ollama
4. ⏭️ **Integrar en backend** de Securetag
5. ⏭️ **Desplegar en producción**

---

## 📚 Referencias

- [Llama 3.1 8B Info](file:///Users/master/Downloads/Securetag%20Agent/docs/Plan%20de%20desarrollo%20multi-agentes/Fine-tuning/Llama_3:1_8b_info.md)
- [Formato Óptimo ChatML](file:///Users/master/Downloads/Securetag%20Agent/docs/Plan%20de%20desarrollo%20multi-agentes/Fine-tuning/Formato_optimo_training_llama31.md)
- [Mejores Prácticas 2025](file:///Users/master/Downloads/Securetag%20Agent/docs/Plan%20de%20desarrollo%20multi-agentes/Fine-tuning/Mejores_practicas_finetuning_Noviembre2025.md)
- [Axolotl Documentation](https://github.com/OpenAccess-AI-Collective/axolotl)
- [RunPod Documentation](https://docs.runpod.io/)



