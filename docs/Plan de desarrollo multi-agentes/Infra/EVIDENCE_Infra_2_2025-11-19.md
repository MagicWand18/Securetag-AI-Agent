# Documento de Evidencia - Infra

**Agente**: Infra  
**Iteración**: 2  
**Fecha**: 2025-11-19 16:55  
**Estatus**: Completado

## 📋 Reporte Técnico

Se completó la investigación e implementación de infraestructura LLM para el proyecto Securetag, evaluando tres opciones de despliegue y implementando la solución recomendada para desarrollo.

### Archivos Modificados
*   `docker-compose.yml`: Agregado servicio `ollama` con soporte GPU
*   `docs/LLM_Infrastructure_Research.md`: Documento de investigación completo
*   `docs/Ollama_Setup_Guide.md`: Guía de setup y troubleshooting

### Infraestructura Implementada

#### Servicio Ollama
- **Imagen**: `ollama/ollama:latest`
- **Puerto**: 11434
- **GPU**: Configurado con `nvidia-container-toolkit`
- **Volumen**: `./data/ollama` para persistencia de modelos
- **Red**: `securetag-net` (integrado con App/Worker)
- **Health Check**: Verifica disponibilidad cada 30s

#### Variables de Entorno
Agregadas a `securetag-app` y `securetag-worker`:
```yaml
OLLAMA_HOST: http://ollama:11434
```

### Investigación Realizada

#### Opción A: Docker Local (Ollama en Contenedor) ✅ IMPLEMENTADA
- **Costo**: $0
- **Latencia**: <10ms
- **Pros**: Control total, sin costos, ideal para desarrollo
- **Contras**: Requiere GPU NVIDIA, no escalable para producción

#### Opción B: DigitalOcean GPU Droplets
- **Costo**: $547-$2,225/mes
- **GPUs**: RTX 4000 Ada, RTX 6000 Ada, L40S, H100
- **Pros**: Misma infraestructura, GPUs potentes
- **Contras**: Costo continuo alto, billing 24/7

#### Opción C: RunPod.io ⭐ RECOMENDADA PARA PRODUCCIÓN
- **Serverless**: $0.40-$2.17/hora (solo tiempo activo)
- **Pods Spot**: $0.89-$2.49/hora (55% descuento)
- **Pros**: Ahorro 76-97% vs DigitalOcean, auto-scaling
- **Contras**: Latencia adicional, dependencia externa

### Análisis Comparativo

| Criterio | Docker Local | DigitalOcean | RunPod Serverless |
|----------|--------------|--------------|-------------------|
| Costo/mes | $0 | $547-$2,225 | $50-$200* |
| Latencia | <10ms | ~20-50ms | ~100-300ms |
| Escalabilidad | No | Vertical | Auto |
| Idle Cost | $0 | 100% | $0 |

\* *Para 100-1,000 análisis/día*

### Recomendaciones

**Desarrollo**: Docker Local (Opción A) - Implementado ✅  
**Producción**: RunPod Serverless (Opción C) - Documentado para futura implementación

**Justificación**:
- Desarrollo: Costo $0, latencia mínima, control total
- Producción: Ahorro 76-97% en costos, auto-scaling, ideal para SaaS multi-tenant

### Pruebas Realizadas

#### Verificación de Configuración
```bash
# Verificar sintaxis de docker-compose.yml
docker compose config
```
✅ Configuración válida

#### Modelo Actual
```bash
ollama list
```
✅ Modelo `securetag-ai-agent:latest` (4.4 GB) confirmado

## 🚧 Cambios Implementados

*   [x] Investigación de Opción A: Docker Local (Completado)
*   [x] Investigación de Opción B: DigitalOcean GPU Droplets (Completado)
*   [x] Investigación de Opción C: RunPod.io (Completado)
*   [x] Análisis comparativo con tabla de costos (Completado)
*   [x] Documento de investigación (`LLM_Infrastructure_Research.md`) (Completado)
*   [x] Implementación de servicio Ollama en `docker-compose.yml` (Completado)
*   [x] Configuración de variables de entorno `OLLAMA_HOST` (Completado)
*   [x] Guía de setup (`Ollama_Setup_Guide.md`) (Completado)

## 📊 Proyección de Costos (Producción)

### Escenario: 100 análisis/día
- **RunPod Serverless**: $54.25/mes
- **DigitalOcean GPU**: $2,255.70/mes
- **Ahorro**: $2,201.45/mes (97.6%)

### Escenario: 1,000 análisis/día
- **RunPod Serverless**: $542.50/mes
- **DigitalOcean GPU**: $2,255.70/mes
- **Ahorro**: $1,713.20/mes (76%)

## 🔄 Próximos Pasos

### Para Desarrollo (Inmediato)
1. Instalar `nvidia-container-toolkit` (si Linux/Windows WSL2)
2. Ejecutar `docker compose up -d ollama`
3. Cargar modelo usando guía en `docs/Ollama_Setup_Guide.md`
4. Verificar conectividad desde App/Worker

### Para Producción (Futuro)
1. Crear cuenta en RunPod.io
2. Subir modelo `securetag-ai-agent:latest`
3. Configurar endpoint Serverless
4. Implementar cliente API REST
5. Actualizar `OLLAMA_HOST` para apuntar a RunPod

## 💬 Revisiones y comentarios del supervisor
*   **Veredicto**: ✅ **Aprobado**
*   **Comentarios**:
    *   [x] Investigación exhaustiva y muy valiosa. La elección de RunPod para producción es acertada por costos y escalabilidad.
    *   [x] La implementación local con Docker permite a los otros agentes (Worker/Fine-tuning) avanzar sin bloqueo.
    *   [x] **Nota**: El Agente Fine-tuning ya está utilizando esta investigación para el entrenamiento del modelo. Buen trabajo transversal.
