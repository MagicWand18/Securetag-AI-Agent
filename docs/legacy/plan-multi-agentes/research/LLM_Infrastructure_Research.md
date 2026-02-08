# Investigación de Infraestructura LLM - Securetag

**Fecha**: 2025-11-19  
**Agente**: Infra  
**Iteración**: 2

## 📊 Contexto

El proyecto Securetag utiliza actualmente el modelo `securetag-ai-agent:latest` (4.4 GB) corriendo en Ollama localmente. Este modelo se usa para análisis de hallazgos de seguridad. Se requiere determinar la mejor estrategia de despliegue considerando el futuro deployment en DigitalOcean.

## 🔍 Opciones Investigadas

### Opción A: Docker Local (Ollama en Contenedor)

**Descripción**: Containerizar Ollama con el modelo dentro de Docker Compose.

**Requisitos Técnicos**:
- **GPU**: NVIDIA con compute capability 5.0+ (RTX 30/40 series recomendado)
- **Driver**: NVIDIA driver 531+
- **Software**: `nvidia-container-toolkit` para acceso GPU en Docker
- **RAM**: Mínimo 8 GB (16 GB recomendado para modelo de 4.4 GB)
- **Storage**: ~10 GB (modelo + overhead)
- **CPU**: Puede correr en CPU pero con latencia significativamente mayor

**Configuración Docker Compose**:
```yaml
services:
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ./data/ollama:/root/.ollama
    ports:
      - "11434:11434"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

**Pros**:
- ✅ Control total del entorno
- ✅ Sin costos adicionales de hosting
- ✅ Latencia mínima (local)
- ✅ Privacidad total de datos
- ✅ Fácil integración con stack actual
- ✅ Ideal para desarrollo

**Contras**:
- ❌ Requiere GPU NVIDIA en máquina de desarrollo
- ❌ No escalable para producción multi-tenant
- ❌ Rendimiento limitado en CPU
- ❌ No disponible en DigitalOcean Droplets estándar

---

### Opción B: DigitalOcean GPU Droplets

**Descripción**: Usar GPU Droplets de DigitalOcean para hospedar Ollama.

**Disponibilidad 2025**:
- **GPUs Disponibles**: RTX 4000 Ada, RTX 6000 Ada, L40S, H100, H200
- **Regiones**: NYC2, TOR1, ATL1, AMS3, EU
- **Estado**: General Availability desde Mayo 2025

**Pricing (estimado)**:
- **RTX A4000**: ~$0.76/hora (~$547/mes)
- **RTX 4000 Ada**: ~$1.00/hora (~$720/mes)
- **NVIDIA A100**: ~$3.09/hora (~$2,225/mes)
- **Billing**: Por segundo, mínimo 5 minutos

**Requisitos**:
- **Setup**: Instalar Docker + nvidia-container-toolkit + Ollama
- **Networking**: Configurar firewall para acceso desde App/Worker
- **Storage**: Volumen persistente para modelos

**Pros**:
- ✅ Infraestructura profesional en mismo proveedor
- ✅ GPUs potentes (RTX 4000+, H100)
- ✅ Escalabilidad vertical (cambiar GPU)
- ✅ SLA y soporte de DigitalOcean
- ✅ Misma red privada que App/Worker

**Contras**:
- ❌ Costo continuo (~$547-$2,225/mes)
- ❌ Billing corre aunque esté idle
- ❌ Requiere gestión de servidor
- ❌ Overkill para desarrollo/testing

---

### Opción C: RunPod.io

**Descripción**: Plataforma especializada en hosting de GPU para ML/AI.

#### C1: RunPod Serverless

**Pricing**:
- **T4 GPU**: $0.40/hora (solo tiempo activo)
- **A100 80GB**: $2.17/hora (solo tiempo activo)
- **Billing**: Por segundo de procesamiento activo
- **Idle Cost**: $0 (escala a cero)

**Características**:
- FlashBoot: Cold start ~500ms
- Auto-scaling basado en demanda
- API REST para inferencia
- Sin costos de ingress/egress

**Pros**:
- ✅ **Costo óptimo**: Solo pagas por inferencia activa
- ✅ Escala a cero cuando no se usa
- ✅ Ideal para tráfico variable
- ✅ Sin gestión de infraestructura
- ✅ Cold start rápido (500ms)
- ✅ Hasta 15% más barato que competidores

**Contras**:
- ❌ Latencia adicional (cold start + red)
- ❌ Requiere integración API (cambio en código)
- ❌ Dependencia de servicio externo
- ❌ Menos control del entorno

#### C2: RunPod Pods (On-Demand/Spot)

**Pricing**:
- **A100 80GB On-Demand**: $1.99/hora (~$1,433/mes)
- **A100 80GB Spot**: $0.89/hora (~$641/mes)
- **H100 80GB On-Demand**: $4.49/hora (~$3,233/mes)
- **H100 80GB Spot**: $2.49/hora (~$1,793/mes)

**Características**:
- Pods dedicados con control total
- Spot: 55% descuento pero puede interrumpirse
- Savings Plans: 15-25% descuento con compromiso 3-6 meses

**Pros**:
- ✅ Más barato que DigitalOcean
- ✅ Spot Pods muy económicos
- ✅ Control total del contenedor
- ✅ Especializado en ML/AI

**Contras**:
- ❌ Spot Pods pueden interrumpirse
- ❌ Fuera de infraestructura DigitalOcean
- ❌ Latencia de red externa

---

## 📊 Tabla Comparativa

| Criterio | Docker Local | DigitalOcean GPU | RunPod Serverless | RunPod Pods (Spot) |
|----------|--------------|------------------|-------------------|-------------------|
| **Costo Mensual** | $0 | $547-$2,225 | ~$50-$200* | ~$641-$1,793 |
| **GPU Requerida** | NVIDIA local | RTX 4000+, H100 | T4, A100 (managed) | A100, H100 |
| **RAM Recomendada** | 16 GB | Incluida | Incluida | Incluida |
| **Latencia** | <10ms | ~20-50ms | ~100-300ms | ~50-100ms |
| **Escalabilidad** | No | Vertical | Auto (horizontal) | Manual |
| **Idle Cost** | $0 | 100% | $0 | 100% |
| **Setup Complexity** | Media | Alta | Baja | Media |
| **Integración** | Nativa | Nativa | API REST | Nativa |
| **Privacidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Disponibilidad** | Depende dev | 99.9% SLA | 99.9% | Variable (Spot) |

\* *Estimado para uso intermitente (10-20 hrs/mes de inferencia)*

---

## 🎯 Recomendaciones

### Para Desarrollo/Testing (AHORA)

**Recomendación**: **Opción A - Docker Local**

**Justificación**:
1. **Costo cero**: No hay gastos adicionales durante desarrollo
2. **Latencia mínima**: Respuesta instantánea para debugging
3. **Control total**: Fácil modificar modelo y configuración
4. **Privacidad**: Datos sensibles no salen de la máquina
5. **Ya funciona**: El setup actual ya está operativo

**Implementación**:
- Agregar servicio `ollama` a `docker-compose.yml`
- Documentar cómo cargar modelo `securetag-ai-agent:latest`
- Configurar variables de entorno para App/Worker

**Requisito**: Máquina de desarrollo con GPU NVIDIA (ya disponible según `ollama list`)

---

### Para Producción (DESPLIEGUE EN DIGITALOCEAN)

**Recomendación**: **Opción C1 - RunPod Serverless**

**Justificación**:

1. **Costo-efectividad**: 
   - Solo pagas por tiempo de inferencia activo
   - Estimado: $50-$200/mes vs $547-$2,225/mes (DigitalOcean)
   - Ahorro: ~75-90% en costos

2. **Escalabilidad**:
   - Auto-scaling según demanda
   - Perfecto para SaaS multi-tenant con tráfico variable
   - No requiere provisionar GPU para picos

3. **Simplicidad operacional**:
   - Sin gestión de servidores GPU
   - Sin preocupación por actualizaciones de drivers
   - Infraestructura managed

4. **Patrón de uso**:
   - Análisis de seguridad es intermitente (no 24/7)
   - Usuario espera ~5-30 segundos por análisis
   - Cold start de 500ms es aceptable

**Trade-offs aceptables**:
- Latencia adicional: 100-300ms (aceptable para análisis no real-time)
- Dependencia externa: Mitigado con SLA 99.9%
- Cambio de código: Mínimo (cambiar de Ollama local a API REST)

---

### Alternativa para Producción (si se requiere control total)

**Recomendación Secundaria**: **Opción C2 - RunPod Pods Spot**

**Cuándo usar**:
- Si se requiere control total del entorno Ollama
- Si la latencia debe ser <100ms
- Si se prefiere arquitectura similar a desarrollo

**Ventajas sobre DigitalOcean**:
- 55% más barato ($641 vs $1,433/mes para A100)
- Especializado en ML/AI
- Mejor precio/rendimiento

**Desventaja**:
- Pods Spot pueden interrumpirse (mitigable con auto-restart)

---

## 🚀 Plan de Implementación Recomendado

### Fase 1: Desarrollo (Inmediato)
1. Agregar servicio `ollama` a `docker-compose.yml`
2. Configurar GPU access con `nvidia-container-toolkit`
3. Documentar proceso de carga de modelo
4. Actualizar variables de entorno en App/Worker

### Fase 2: Preparación para Producción
1. Crear cuenta en RunPod.io
2. Subir modelo `securetag-ai-agent:latest` a RunPod
3. Configurar endpoint Serverless
4. Implementar cliente API REST en App/Worker
5. Testing de latencia y throughput

### Fase 3: Despliegue
1. Configurar variable de entorno `OLLAMA_HOST` para apuntar a RunPod
2. Desplegar App/Worker en DigitalOcean (sin GPU)
3. Monitorear costos y latencia
4. Ajustar según métricas reales

---

## 📈 Proyección de Costos (Producción)

### Escenario: 100 análisis/día

**RunPod Serverless**:
- Tiempo por análisis: ~30 segundos
- Total mensual: 100 × 30 × 30 = 25 horas
- Costo (A100): 25 hrs × $2.17 = **$54.25/mes**

**DigitalOcean GPU Droplet**:
- Costo fijo: 730 hrs × $3.09 = **$2,255.70/mes**

**Ahorro**: **$2,201.45/mes (97.6%)**

### Escenario: 1,000 análisis/día

**RunPod Serverless**:
- Total mensual: 1,000 × 30 × 30 = 250 horas
- Costo (A100): 250 hrs × $2.17 = **$542.50/mes**

**DigitalOcean GPU Droplet**:
- Costo fijo: **$2,255.70/mes**

**Ahorro**: **$1,713.20/mes (76%)**

> [!NOTE]
> RunPod Serverless es más económico hasta ~1,040 análisis/día. Para volúmenes mayores, considerar RunPod Pods On-Demand.

---

## ✅ Conclusión

**Desarrollo**: Docker Local (Opción A)  
**Producción**: RunPod Serverless (Opción C1)

Esta estrategia dual optimiza:
- **Costo**: $0 en desarrollo, ~$50-$500/mes en producción
- **Experiencia de desarrollo**: Latencia mínima, control total
- **Escalabilidad**: Auto-scaling en producción
- **Simplicidad**: Infraestructura managed en producción

**Próximos pasos**: Implementar Fase 1 (Docker Local) para continuar desarrollo.
