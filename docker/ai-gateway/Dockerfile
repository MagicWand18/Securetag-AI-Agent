FROM python:3.11-slim-bookworm

WORKDIR /app

# Dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Descargar modelos spaCy para Presidio (EN + ES)
RUN python -m spacy download en_core_web_sm && python -m spacy download es_core_news_sm

# Copiar codigo
COPY src ./src
COPY pytest.ini .

# Usuario no-root (UID 1001 consistente con core-worker)
RUN groupadd -r securetag && useradd -r -g securetag -u 1001 securetag \
    && chown -R securetag:securetag /app

USER securetag

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s \
    CMD curl -f http://localhost:8000/healthz || exit 1

CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
