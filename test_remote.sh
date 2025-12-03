#!/bin/bash
set -e

SERVER_IP="143.198.61.64"
PORT="8080"
BASE_URL="http://${SERVER_IP}:${PORT}"
ZIP_FILE="/Users/master/Downloads/Securetag Agent/test/docker/codeaudit/test.zip"
# Usamos una clave por defecto o la que esté configurada en el servidor si la sabemos.
# Asumimos que el servidor usa la misma configuración base o que no requiere auth estricta para esta prueba si no se cambió.
# Pero en deploy.sh vimos que generó una random. Si no la sabemos, podría fallar si la auth está activa.
# Sin embargo, el middleware de auth usa headers. Si no se envía, puede fallar.
# Vamos a intentar sin auth primero, o con una genérica si falla.
# UPDATE: En el deploy.sh se generó una WORKER_API_KEY random, pero el endpoint /codeaudit/upload
# requiere autenticación vía `authenticate`.
# Si TENANT_ID es 'production', la auth podría requerir X-API-Key.
# Vamos a intentar con la clave por defecto de desarrollo "local-dev-key" por si acaso no se cambió,
# O si el usuario no la tiene, veremos el error 401.

# NOTA: Si el servidor se desplegó con el script deploy.sh que generamos, 
# WORKER_API_KEY se generó aleatoriamente. No podremos conectar sin ella.
# Pero el usuario dijo "listo ya hice el deploy... como lo ves en la terminal".
# Si usó nuestro deploy.sh, no sabemos la clave.
# Si hizo git pull y docker compose up manualmente (como parece en el log), 
# entonces usó el .env que ya tenía o creó uno nuevo.
# Asumiremos que usó el .env del repo o uno básico. Probemos con 'local-dev-key'.

API_KEY="8dce067a5cb89fbb994c980dbd47c821dd290e907ce48fca135519582c382c3f"

echo "Subiendo archivo a ${BASE_URL}..."

RESP=$(curl -s -X POST "${BASE_URL}/codeaudit/upload" \
  -H "X-API-Key: ${API_KEY}" \
  -F "file=@${ZIP_FILE}" \
  -F "profile=auto")

echo "Respuesta Upload: ${RESP}"

TASK_ID=$(echo "${RESP}" | grep -o '"taskId":"[^"]*"' | cut -d'"' -f4)

if [ -z "${TASK_ID}" ]; then
  echo "Error: No se obtuvo taskId. Verifica la API Key o el estado del servidor."
  exit 1
fi

echo "TaskId: ${TASK_ID}"
echo "Esperando análisis..."

while true; do
  STATUS_JSON=$(curl -s -H "X-API-Key: ${API_KEY}" "${BASE_URL}/codeaudit/${TASK_ID}")
  STATUS=$(echo "${STATUS_JSON}" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  
  echo "Estado: ${STATUS}"
  
  if [ "${STATUS}" == "completed" ]; then
    echo "Análisis completado!"
    echo "${STATUS_JSON}" > remote_result.json
    # Mostrar un resumen bonito si jq está instalado, sino el raw
    echo "${STATUS_JSON}"
    break
  fi
  
  if [ "${STATUS}" == "failed" ]; then
    echo "El análisis falló."
    echo "${STATUS_JSON}"
    exit 1
  fi
  
  sleep 5
done
