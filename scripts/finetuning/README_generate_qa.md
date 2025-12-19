# Guía de uso: generate_qa.py

## Descripción

Script robusto para generar pares Q&A usando OpenAI GPT-5.1. Procesa todos los archivos de chunks en `datasets/processed` y genera un archivo de Q&A por cada uno.

## Características principales

✅ **Procesamiento por archivo**: Genera un JSON de Q&A por cada archivo de chunks  
✅ **Retry automático**: Backoff exponencial ante errores de API o conexión  
✅ **Seguimiento de progreso**: Archivo `.progress.json` rastrea el estado  
✅ **Resume capability**: Puede retomar desde donde quedó si se interrumpe  
✅ **Guardado incremental**: Guarda cada 10 chunks para evitar pérdida de datos  
✅ **Manejo de interrupciones**: Ctrl+C guarda el progreso antes de salir  

## Requisitos

```bash
# Variables de entorno en .env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.1              # Opcional, default: gpt-5.1
QA_PAIRS_PER_CHUNK=3              # Opcional, default: 3
MAX_RETRIES=5                     # Opcional, default: 5
RETRY_DELAY=2.0                   # Opcional, default: 2.0 segundos
```

## Uso

```bash
# Primera ejecución (procesa todos los archivos)
python3 scripts/finetuning/generate_qa.py

# Si se interrumpe o falla, simplemente vuelve a ejecutar
# El script retomará desde donde quedó
python3 scripts/finetuning/generate_qa.py
```

## Estructura de salida

```
datasets/qa_generated/
├── .progress.json                              # Estado de progreso
├── json_mitre_enterprise_chunks_qa.json        # ~4,602 Q&A pairs
├── json_mitre_ics_chunks_qa.json               # ~381 Q&A pairs
├── json_mitre_mobile_chunks_qa.json            # ~597 Q&A pairs
├── json_nist_sp800-53_chunks_qa.json           # ~3,504 Q&A pairs
├── markdown_cheatsheets_owasp_chunks_qa.json   # ~7,992 Q&A pairs
├── markdown_mastg_chunks_qa.json               # ~3,438 Q&A pairs
├── markdown_Web_Application_Security_Testing_chunks_qa.json  # ~3,975 Q&A pairs
├── pdf_pci-dss-v4_0_1-la_chunks_qa.json        # ~5,967 Q&A pairs
├── pdf_iso_27001_2022_chunks_qa.json           # ~285 Q&A pairs
├── pdf_nist.sp.800-61r3_chunks_qa.json         # ~711 Q&A pairs
├── pdf_nistspecialpublication800-115_chunks_qa.json  # ~1,002 Q&A pairs
├── pdf_osstmm.3_chunks_qa.json                 # ~1,965 Q&A pairs
├── xml_cwe_hardware_design_chunks_qa.json      # ~759 Q&A pairs
├── xml_cwe_software_development_chunks_qa.json # ~1,869 Q&A pairs
├── markdown_OWASP_Top_10_Proactive_Controls_chunks_qa.json  # ~342 Q&A pairs
├── markdown_masvs_chunks_qa.json               # ~162 Q&A pairs
└── markdown_index_chunks_qa.json               # ~3 Q&A pairs
```

**Total estimado**: ~37,554 pares Q&A (12,518 chunks × 3 pares/chunk)

## Manejo de errores

El script maneja automáticamente:

- **Rate limits**: Espera con backoff exponencial (2s, 4s, 8s, 16s, 32s)
- **Errores de API**: Reintenta hasta 5 veces con delays crecientes
- **Errores de conexión**: Reintenta automáticamente
- **Interrupciones**: Guarda progreso antes de salir (Ctrl+C)

## Monitoreo del progreso

```bash
# Ver el archivo de progreso
cat datasets/qa_generated/.progress.json

# Ejemplo de contenido:
{
  "json_mitre_enterprise_chunks.json": {
    "total_chunks": 1534,
    "processed_chunks": 1534,
    "failed_chunks": 12,
    "completed": true
  },
  "json_mitre_ics_chunks.json": {
    "total_chunks": 127,
    "processed_chunks": 85,
    "failed_chunks": 2,
    "completed": false
  }
}
```

## Estimación de costos

Con GPT-5.1 y los 12,518 chunks:

- **Tokens de entrada**: ~898,560 tokens → **$8.99**
- **Tokens de salida**: ~1,750,974 tokens → **$52.53**
- **Costo total estimado**: **~$61.51**

## Tiempo estimado

- **Por chunk**: ~2-3 segundos (incluyendo API call + retry delays)
- **Total**: 12,518 chunks × 2.5s = **~8.7 horas**

## Troubleshooting

### El script se detiene constantemente
```bash
# Aumenta el delay entre reintentos
export RETRY_DELAY=5.0
```

### Quiero reiniciar desde cero
```bash
# Elimina el archivo de progreso
rm datasets/qa_generated/.progress.json
```

### Quiero procesar solo archivos específicos
```bash
# Edita .progress.json y marca como completed: true los que quieres saltar
```

## Siguiente paso

Una vez completada la generación de Q&A, ejecuta:

```bash
python3 scripts/finetuning/convert_to_jsonl.py
```

Este script combinará todos los archivos `*_qa.json` en datasets de entrenamiento y validación en formato JSONL.
