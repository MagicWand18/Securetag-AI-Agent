FROM node:20-bookworm
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
EXPOSE 8080
ENV TENANT_ID=default
ENV DB_DIR=/var/securetag/${TENANT_ID}/db
ENV QUEUE_DIR=/var/securetag/${TENANT_ID}/queue/tasks
ENV RESULTS_DIR=/var/securetag/${TENANT_ID}/results

# Security: Run as non-root user
RUN groupadd -r securetag && useradd -r -g securetag -u 1001 securetag \
    && mkdir -p /var/securetag \
    && chown -R securetag:securetag /var/securetag \
    && chown -R securetag:securetag /app

USER securetag

CMD ["node","dist/server/index.js"]