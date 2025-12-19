# Pipeline de Extracción de Datos para Fine-tuning

Este directorio contiene scripts para extraer datos de múltiples formatos (JSON, Markdown, XML), procesarlos y generar datasets en formato JSONL para fine-tuning del modelo `securetag-ai-agent`.

## 📋 Requisitos

### Instalación

```bash
# Crear entorno virtual (recomendado)
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

### Prerequisitos

- **Python 3.8+**
- **Gemini API Key** configurada en `.env` del proyecto raíz
  ```bash
  export GOOGLE_API_KEY='tu-api-key'
  ```

## 🚀 Uso

### Pipeline Completo

Ejecuta los scripts en este orden:

#### 1. Extracción de JSON (NIST, MITRE, ASVS)

```bash
python extract_json.py
```

**Procesa**:
- `NIST_SP-800-53_rev5_catalog.json` - Controles de seguridad NIST (formato OSCAL)
- `MITRE ATT&CK` - Técnicas de ataque (Enterprise, Mobile, ICS)
- `OWASP_Application_Security_Verification_Standard_5.0.0_en.flat.json` - Requisitos ASVS

**Output**: `../../datasets/raw/json_extracts.json`

#### 2. Extracción de Markdown (OWASP Guides)

```bash
python extract_markdown.py
```

**Procesa** (cada carpeta se consolida en un JSON):
- `masvs/` - Mobile Application Security Verification Standard
- `mastg/` - Mobile Application Security Testing Guide
- `cheatsheets owasp/` - OWASP Cheat Sheets
- `Web Application Security Testing/` - WSTG
- `OWASP Top 10 Proactive Controls/`

**Outputs**: 
- `../../datasets/raw/markdown_masvs.json`
- `../../datasets/raw/markdown_mastg.json`
- `../../datasets/raw/markdown_cheatsheets_owasp.json`
- etc.

#### 3. Extracción de XML (CWE)

```bash
python extract_xml.py
```

**Procesa**:
- `CWE Software Development.xml` - Debilidades de desarrollo
- `CWE Hardware Design.xml` - Debilidades de hardware

**Output**: `../../datasets/raw/xml_cwe_extracts.json`

#### 4. Procesamiento de Chunks

```bash
python process_chunks.py
```

**Función**:
- Combina todos los extracts (JSON, Markdown, XML)
- Divide textos largos en chunks de 512 tokens
- Elimina duplicados
- Normaliza el texto

**Output**: `../../datasets/processed/chunks.json`

#### 5. Generación de Q&A con Gemini

```bash
# IMPORTANTE: GOOGLE_API_KEY debe estar configurada
python generate_qa.py
```

**Función**:
- Usa Gemini 2.0 Flash para generar 3 preguntas por chunk
- Valida calidad de Q&A
- Genera pares pregunta-respuesta en español

**Output**: `../../datasets/processed/qa_pairs.json`

#### 6. Conversión a JSONL

```bash
python convert_to_jsonl.py
```

**Outputs**:
- `../../datasets/final/train.jsonl` (80% de los datos)
- `../../datasets/final/validation.jsonl` (20% de los datos)
- `../../datasets/final/dataset_stats.json` (estadísticas)

## ⚙️ Configuración

Edita `config.env` para ajustar parámetros:

```env
# Gemini (usa GOOGLE_API_KEY del .env raíz)
GEMINI_MODEL=gemini-2.0-flash-exp

# Procesamiento
MAX_CHUNK_TOKENS=512
CHUNK_OVERLAP_TOKENS=50
QA_PAIRS_PER_CHUNK=3
```

## 📁 Estructura de Datos

```
datasets/
├── sources/           # Fuentes originales
│   ├── json/         # NIST OSCAL, MITRE ATT&CK, OWASP ASVS
│   ├── markdown/     # OWASP guides (masvs, mastg, cheatsheets, etc.)
│   ├── xml/          # CWE weaknesses
│   └── pdfs/         # PDFs adicionales (ISO 27001, PCI-DSS, etc.)
├── raw/              # Datos extraídos
│   ├── json_extracts.json
│   ├── markdown_*.json (uno por carpeta)
│   └── xml_cwe_extracts.json
├── processed/        # Datos procesados
│   ├── chunks.json
│   └── qa_pairs.json
└── final/            # Datasets finales
    ├── train.jsonl
    ├── validation.jsonl
    └── dataset_stats.json
```

## 📊 Formato del Dataset

Cada línea en `train.jsonl` y `validation.jsonl`:

```json
{
  "instruction": "¿Qué requiere el control AC-2 de NIST SP 800-53?",
  "input": "",
  "output": "El control AC-2 (Account Management) requiere que las organizaciones...",
  "metadata": {
    "source": "NIST SP 800-53 Rev 5",
    "id": "AC-2",
    "chunk_index": 0
  }
}
```

Este formato es compatible con:
- Hugging Face Datasets
- Ollama fine-tuning
- LLaMA Factory
- Axolotl
- Unsloth

## 🔧 Troubleshooting

### Error: "GOOGLE_API_KEY no está configurada"

```bash
# Verificar que la API key esté en el .env raíz
cat ../../.env | grep GOOGLE_API_KEY

# Si no está, agregarla
echo "GOOGLE_API_KEY=tu-api-key" >> ../../.env
```

### Error: "No se encontraron archivos JSON/Markdown/XML"

Verifica que los archivos estén en las carpetas correctas:
```bash
ls -lh ../../datasets/sources/json/
ls -lh ../../datasets/sources/markdown/
ls -lh ../../datasets/sources/xml/
```

### Pocos datos generados

- Verifica que todos los archivos fuente estén presentes
- Ajusta `QA_PAIRS_PER_CHUNK` en `config.env` (por defecto: 3)
- Revisa los logs de cada script para ver qué se procesó

## 📈 Fuentes de Datos

### JSON (63 MB total)
- **NIST SP 800-53 Rev 5** (10 MB) - ~1000 controles de seguridad
- **MITRE ATT&CK Enterprise** (43 MB) - ~600 técnicas
- **MITRE ATT&CK Mobile** (4 MB) - ~100 técnicas
- **MITRE ATT&CK ICS** (3 MB) - ~80 técnicas
- **OWASP ASVS 5.0** (160 KB) - ~200 requisitos

### Markdown (525 archivos)
- **MASVS** - Mobile Application Security Verification Standard
- **MASTG** - Mobile Application Security Testing Guide
- **OWASP Cheat Sheets** - 107 hojas de referencia
- **WSTG** - Web Security Testing Guide
- **OWASP Top 10 Proactive Controls**

### XML (7 MB total)
- **CWE Software Development** (5.8 MB) - ~800 debilidades
- **CWE Hardware Design** (1.5 MB) - ~200 debilidades

### PDFs (13 MB total)
- **ISO 27001:2022** (476 KB)
- **PCI-DSS v4.0.1** (5.1 MB)
- **NIST SP 800-61r2** (1.5 MB) - Incident Response
- **NIST SP 800-53r5** (5.8 MB) - Security Controls (PDF backup)

## 📝 Notas

### ¿Por qué no TOON?

Inicialmente se consideró usar TOON (Token-Oriented Object Notation) para reducir tokens, pero se decidió usar **JSON optimizado** porque:
- Gemini no soporta TOON nativamente (requeriría incluirlo en cada prompt)
- JSON con solo campos esenciales es más eficiente
- TOON está diseñado para inferencia, no para datasets de entrenamiento

### Optimización de Tokens

Los scripts extraen **solo campos esenciales** para Q&A:
- ✅ Título, descripción, guías, mitigaciones
- ❌ Metadata innecesaria (fechas, autores, versiones, IDs internos)

### Consolidación de Markdown

Cada carpeta de markdown se consolida en **un solo JSON** para facilitar el procesamiento y mantener el contexto relacionado junto.

## 📚 Próximos Pasos

Una vez generados los datasets:

1. **Fine-tuning local con Ollama** (si aplica)
2. **Fine-tuning en RunPod con QLoRA**
3. **Evaluación del modelo fine-tuned**
4. **Iteración con más datos**
