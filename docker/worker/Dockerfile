FROM node:20-bookworm

ENV PATH=/opt/securetag/bin:/opt/securetag/venv/bin:$PATH

# Install Python for semgrep and basic utils (git, unzip, etc. are needed for some operations)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv git ca-certificates curl unzip \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/securetag/bin /opt/securetag/venv /opt/securetag/rules /var/securetag/default/home /var/securetag/default/config /var/securetag/default/cache

# Install Semgrep via pip
RUN python3 -m venv /opt/securetag/venv
RUN /opt/securetag/venv/bin/python -m pip install --upgrade pip setuptools wheel
RUN /opt/securetag/venv/bin/pip install --no-cache-dir semgrep
RUN ln -sf /opt/securetag/venv/bin/semgrep /opt/securetag/bin/semgrep

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

ENV TENANT_ID=default
ENV HOME=/var/securetag/${TENANT_ID}/home
ENV XDG_CONFIG_HOME=/var/securetag/${TENANT_ID}/config
ENV XDG_CACHE_HOME=/var/securetag/${TENANT_ID}/cache
ENV QUEUE_DIR=/var/securetag/${TENANT_ID}/queue/tasks
ENV RESULTS_DIR=/var/securetag/${TENANT_ID}/results
ENV APP_HOST=securetag-app
ENV APP_PORT=8080

# Security: Run as non-root user
RUN groupadd -r securetag && useradd -r -g securetag -u 1001 securetag \
    && mkdir -p /var/securetag \
    && chown -R securetag:securetag /var/securetag \
    && chown -R securetag:securetag /app \
    && chown -R securetag:securetag /opt/securetag

USER securetag

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s CMD semgrep --version >/dev/null 2>&1 || exit 1
CMD ["node","dist/worker/entrypoint.js"]
