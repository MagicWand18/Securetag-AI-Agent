FROM golang:1.25-bookworm AS tools-go
ENV GOBIN=/opt/securetag/bin
RUN mkdir -p /opt/securetag/bin
RUN go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
RUN go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest
RUN go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
RUN go install -v github.com/owasp-amass/amass/v4/cmd/amass@latest
RUN go install -v github.com/ffuf/ffuf/v2@latest
RUN go install -v github.com/OJ/gobuster/v3@latest
RUN go install -v github.com/projectdiscovery/katana/cmd/katana@latest

FROM node:20-bookworm
ENV PATH=/opt/securetag/bin:/opt/securetag/venv/bin:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends nmap python3 python3-venv git ruby-full ca-certificates curl unzip && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /opt/securetag/bin /opt/securetag/venv /opt/securetag/tools /var/securetag/default/home /var/securetag/default/config /var/securetag/default/cache
COPY --from=tools-go /opt/securetag/bin /opt/securetag/bin
RUN python3 -m venv /opt/securetag/venv
RUN /opt/securetag/venv/bin/python -m pip install --upgrade pip setuptools wheel
RUN /opt/securetag/venv/bin/pip install --no-cache-dir semgrep
RUN ln -sf /opt/securetag/venv/bin/semgrep /opt/securetag/bin/semgrep
RUN git clone https://github.com/sqlmapproject/sqlmap.git /opt/securetag/tools/sqlmap
RUN printf '#!/bin/sh\nexec /opt/securetag/venv/bin/python /opt/securetag/tools/sqlmap/sqlmap.py "$@"' > /opt/securetag/bin/sqlmap && chmod +x /opt/securetag/bin/sqlmap
RUN gem install wpscan --no-document --install-dir /opt/securetag/ruby --bindir /opt/securetag/bin
RUN git clone https://github.com/drwetter/testssl.sh.git /opt/securetag/tools/testssl.sh && ln -sf /opt/securetag/tools/testssl.sh/testssl.sh /opt/securetag/bin/testssl.sh
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