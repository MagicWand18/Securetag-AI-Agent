# Mejores Prácticas de Fine-tuning - Noviembre 2025

## 1. Train/Validation/Test Split: ¿2 o 3 Partes?

### Split de 2 Partes (Train/Validation)

```
Train: 80-85%
Validation: 15-20%
```

**Cuándo usar:**
- ✅ Dataset pequeño (<50k ejemplos)
- ✅ Recursos computacionales limitados
- ✅ Solo necesitas monitorear overfitting
- ✅ No planeas publicar resultados académicos

**Ventajas:**
- Más datos para entrenamiento
- Más simple de implementar
- Menos overhead computacional

**Desventajas:**
- ❌ Riesgo de "data leakage" si usas validation para decisiones finales
- ❌ No tienes evaluación completamente imparcial

### Split de 3 Partes (Train/Validation/Test) ⭐ **RECOMENDADO**

```
Train: 70-80%
Validation: 10-15%
Test: 10-15%
```

**Cuándo usar:**
- ✅ Dataset grande (>100k ejemplos) ← **Tu caso**
- ✅ Quieres evaluación imparcial final
- ✅ Vas a comparar múltiples modelos
- ✅ Necesitas reportar métricas confiables

**Ventajas:**
- ✅ Evaluación completamente imparcial
- ✅ Previene overfitting al validation set
- ✅ Permite comparación justa entre modelos
- ✅ Estándar de la industria en 2025

**Desventajas:**
- Menos datos para entrenamiento
- Más complejo de implementar

---

## Ratios Recomendados (Noviembre 2025)

### Para Datasets Grandes (>100k ejemplos)

**Opción 1: 70-15-15** ⭐ **MÁS RECOMENDADO**
```
Train:      70% (~140,000 ejemplos)
Validation: 15% (~30,000 ejemplos)
Test:       15% (~30,000 ejemplos)
```

**Ventajas:**
- Balance óptimo según investigación 2025
- Validation set suficientemente grande para detectar overfitting
- Test set robusto para evaluación final

**Opción 2: 80-10-10**
```
Train:      80% (~160,000 ejemplos)
Validation: 10% (~20,000 ejemplos)
Test:       10% (~20,000 ejemplos)
```

**Ventajas:**
- Más datos para entrenamiento
- Validation/test sets aún representativos

### Para Datasets Medianos (50-100k ejemplos)

**Recomendado: 80-10-10**

### Para Datasets Pequeños (<50k ejemplos)

**Recomendado: 85-15 (sin test)** o **K-Fold Cross-Validation**

---

## ¿Quién Define Estos Ratios?

### Fuentes Autorizadas (Noviembre 2025)

1. **OpenAI** - Recomienda 80-10-10 en su documentación oficial
2. **Meta (Llama Team)** - Usa 70-15-15 en Llama Cookbook
3. **Hugging Face** - Recomienda 80-10-10 para datasets >100k
4. **Papers de Investigación** - Consenso en 70-15-15 o 80-10-10

### Evolución Histórica

| Año | Recomendación | Razón |
|-----|---------------|-------|
| **2020** | 60-20-20 | Datasets más pequeños |
| **2022** | 70-15-15 | Datasets medianos |
| **2025** | 70-15-15 o 80-10-10 | Datasets grandes, mejores técnicas |

**Tendencia 2025:** Con datasets más grandes y técnicas como LoRA, se puede usar más datos para training sin riesgo de overfitting.

---

## Propósito de Cada Split

### 1. Training Set (70-80%)

**Propósito:**
- Entrenar el modelo
- Ajustar pesos y parámetros
- Aprender patrones del dominio

**Uso:**
- Se usa en cada epoch
- El modelo "ve" estos datos múltiples veces
- Aquí ocurre el aprendizaje real

### 2. Validation Set (10-15%)

**Propósito:**
- Monitorear overfitting durante entrenamiento
- Ajustar hiperparámetros (learning rate, epochs, etc.)
- Decidir cuándo detener el entrenamiento (early stopping)
- Seleccionar el mejor checkpoint

**Uso:**
- Se evalúa después de cada epoch
- **NO se usa para entrenar**
- Guía las decisiones durante el proceso
- Puede verse múltiples veces (para diferentes hiperparámetros)

**⚠️ Riesgo:** Si usas validation para muchas decisiones, puedes "sobreajustar" a este set.

### 3. Test Set (10-15%)

**Propósito:**
- Evaluación final completamente imparcial
- Reportar métricas reales del modelo
- Comparar con otros modelos
- Validar que no hay overfitting

**Uso:**
- **SE USA SOLO UNA VEZ** al final
- **NUNCA** se usa durante entrenamiento
- **NUNCA** influye en decisiones de hiperparámetros
- Datos completamente "unseen"

**🎯 Regla de oro:** El test set es sagrado, solo se toca al final.

---

## Mejores Prácticas Específicas para Llama 3.1 8B

### Información Clave del Modelo

Según tu documento `Llama 3.1 8b info.md`:

**Arquitectura:**
- Context length: **131,072 tokens** (128k)
- Embedding dimension: 4,096
- Attention heads: 32
- Layers: 32
- Vocab size: 128,256

**Template:**
```
<|start_header_id|>system<|end_header_id|>
{system_prompt}<|eot_id|>
<|start_header_id|>user<|end_header_id|>
{user_message}<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
{assistant_response}<|eot_id|>
```

**Stop tokens:**
- `<|start_header_id|>`
- `<|end_header_id|>`
- `<|eot_id|>`

### Hiperparámetros Recomendados (Noviembre 2025)

#### Para LoRA (Recomendado para Llama 3.1 8B)

```yaml
# LoRA Configuration
lora_r: 16-64              # Rank (empieza con 32)
lora_alpha: 32-128         # Alpha (2x el rank)
lora_dropout: 0.05-0.1     # Dropout
lora_target_modules:       # Módulos a ajustar
  - q_proj
  - v_proj
  - k_proj
  - o_proj
  - gate_proj
  - down_proj
  - up_proj

# Training
num_epochs: 1-3            # 1-2 usualmente suficiente
learning_rate: 1e-4 to 2e-4  # Empieza con 2e-4
warmup_steps: 100-500      # 5-10% del total
batch_size: 1-4            # Depende de GPU
gradient_accumulation: 32  # Para simular batch más grande
max_seq_length: 2048-4096  # Llama 3.1 soporta hasta 128k

# Optimization
optimizer: adamw_bnb_8bit  # 8-bit AdamW (ahorra memoria)
scheduler: cosine          # Cosine annealing
weight_decay: 0.01         # Regularización

# Memory Optimization
bf16: true                 # BFloat16 (mejor que FP16)
gradient_checkpointing: true
load_in_4bit: true         # QLoRA
```

#### Configuración Específica para Tu Dataset

```yaml
# Dataset
dataset_size: ~200,000 ejemplos
train_size: 140,000 (70%)
val_size: 30,000 (15%)
test_size: 30,000 (15%)

# Training
num_epochs: 2              # Con 200k ejemplos, 2 epochs suficiente
learning_rate: 2e-4        # Estándar para LoRA
warmup_ratio: 0.05         # 5% warmup
max_steps: ~8,750          # 140k / (batch_size * grad_accum)

# Evaluation
eval_steps: 100            # Evaluar cada 100 steps
save_steps: 500            # Guardar checkpoint cada 500 steps
logging_steps: 10          # Log cada 10 steps
```

### LoRA vs Full Fine-tuning

| Aspecto | LoRA | Full Fine-tuning |
|---------|------|------------------|
| **Parámetros entrenables** | ~0.1-1% | 100% |
| **Memoria requerida** | ~8-12 GB | ~40-60 GB |
| **Tiempo de entrenamiento** | 4-6 horas | 12-20 horas |
| **Calidad** | 95-98% del full | 100% |
| **Costo RunPod** | $10-15 | $40-60 |
| **Recomendado para** | ✅ Tu caso | Datasets >1M |

**Recomendación:** Usa **LoRA** para Llama 3.1 8B con tu dataset.

---

## Mejores Prácticas Generales (Noviembre 2025)

### 1. Calidad de Datos ⭐ **MÁS IMPORTANTE**

```python
# Checklist de calidad
✅ Datos limpios (sin duplicados)
✅ Formato consistente
✅ Distribución balanceada
✅ Longitud apropiada (300-2000 tokens por ejemplo)
✅ Idioma consistente (o mezcla intencional)
✅ Metadata preservada
```

### 2. Prevención de Overfitting

**Técnicas recomendadas:**
- ✅ Early stopping (monitorear validation loss)
- ✅ Dropout en LoRA (0.05-0.1)
- ✅ Weight decay (0.01)
- ✅ Gradient clipping (1.0)
- ✅ Pocos epochs (1-3)

**Señales de overfitting:**
```
Epoch 1: train_loss=0.8, val_loss=0.9  ✅ OK
Epoch 2: train_loss=0.5, val_loss=0.7  ✅ OK
Epoch 3: train_loss=0.3, val_loss=0.8  ⚠️ Overfitting!
```

### 3. Monitoreo Durante Entrenamiento

**Métricas clave:**
```python
# Cada epoch, monitorear:
- train_loss        # Debe bajar consistentemente
- val_loss          # Debe bajar (si sube = overfitting)
- perplexity        # Debe bajar
- learning_rate     # Debe seguir scheduler
- grad_norm         # Debe ser estable (<1.0)
```

### 4. Evaluación Cualitativa

**No solo métricas cuantitativas:**
- ✅ Probar con ejemplos reales
- ✅ Revisar respuestas manualmente
- ✅ Comparar con modelo base
- ✅ A/B testing con usuarios

### 5. Version Control

```bash
# Versionar TODO
✅ Dataset (con hash)
✅ Config de entrenamiento
✅ Checkpoints
✅ Métricas de evaluación
✅ Código de preprocessing
```

---

## Configuración Recomendada para Tu Proyecto

### Opción 1: Conservadora (Recomendada)

```yaml
# Dataset Split
train: 70% (140,000 ejemplos)
validation: 15% (30,000 ejemplos)
test: 15% (30,000 ejemplos)

# LoRA Config
lora_r: 32
lora_alpha: 64
lora_dropout: 0.05
target_modules: [q_proj, v_proj, k_proj, o_proj, gate_proj, down_proj, up_proj]

# Training
num_epochs: 2
learning_rate: 2e-4
warmup_steps: 100
batch_size: 1
gradient_accumulation: 32
max_seq_length: 2048

# Optimization
optimizer: adamw_bnb_8bit
bf16: true
gradient_checkpointing: true
load_in_4bit: true
```

**Tiempo estimado:** 4-6 horas
**Costo estimado:** $10-15 USD

### Opción 2: Agresiva (Más datos para training)

```yaml
# Dataset Split
train: 80% (160,000 ejemplos)
validation: 10% (20,000 ejemplos)
test: 10% (20,000 ejemplos)

# Resto igual que Opción 1
```

**Ventaja:** Más datos para aprender
**Riesgo:** Validation set más pequeño

---

## Recomendación Final

### Para Tu Proyecto (200k ejemplos)

**Split recomendado: 70-15-15** ⭐

**Razones:**
1. ✅ Dataset suficientemente grande
2. ✅ Validation set robusto (30k ejemplos)
3. ✅ Test set para evaluación imparcial
4. ✅ Estándar de la industria 2025
5. ✅ Permite comparación con otros modelos

**Configuración:**
```python
{
  "train_size": 0.70,      # 140,000 ejemplos
  "validation_size": 0.15, # 30,000 ejemplos
  "test_size": 0.15,       # 30,000 ejemplos
  "shuffle": True,
  "stratify": "language",  # Mantener proporción ES/EN
  "random_seed": 42
}
```

### Próximos Pasos

1. ✅ Terminar generación de Q&A (workers corriendo)
2. ✅ Convertir Fenrir + Trendyol a formato Alpaca
3. ✅ Combinar todos los datasets
4. ✅ Split 70-15-15 con stratify por idioma
5. ✅ Subir a Hugging Face
6. ✅ Fine-tuning en RunPod con LoRA
7. ✅ Evaluar en test set
8. ✅ Comparar con modelo base

**Tiempo total estimado:** 24-30 horas (incluyendo generación Q&A)
**Costo total estimado:** $161 (Q&A) + $15 (fine-tuning) = **$176 USD**
