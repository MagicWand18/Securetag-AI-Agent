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
CMD ["node","dist/server/index.js"]