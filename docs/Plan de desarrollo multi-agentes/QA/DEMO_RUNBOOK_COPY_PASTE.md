# 📖 SecureTag Demo Runbook (Copy-Paste Ready)

Este documento contiene los comandos exactos para ejecutar la demo con **Spartane** sin errores. Los comandos están diseñados para ser copiados y pegados directamente en tu terminal.

> **Nota**: Asegúrate de estar en la raíz del proyecto `Securetag Agent` antes de empezar.

---

## 🏁 Paso 1: Preparación (Setup)

Limpia el entorno y prepara los archivos de prueba.

```bash
# 1. Asegurar que el entorno está limpio y corriendo
docker compose down && docker compose up -d

# 2. Esperar unos segundos a que la DB inicie
sleep 10

# 3. Configurar el Tenant y API Key de Producción (Spartane)
# Nota: Esto asegura que la llave de la guía funcione con el tenant 'production'
docker exec securetag-db psql -U securetag -d securetag -c "UPDATE api_key SET tenant_id = (SELECT id FROM tenant WHERE name = 'production') WHERE key_hash = 'ccd37fea252dffcccd8f74d629b205330d95630333627a29e96d695da5bf86e5';"

#sino funciona, ejecutamos:
docker exec securetag-db psql -U securetag -d securetag -c "INSERT INTO api_key (tenant_id, key_hash, name, scopes, is_active) VALUES ('production', 'ccd37fea252dffcccd8f74d629b205330d95630333627a29e96d695da5bf86e5', 'Spartane QA Key', '[\"codeaudit:upload\", \"codeaudit:read\"]', true) ON CONFLICT (key_hash) DO NOTHING;"

# 4. Crear archivos de prueba (Clean, Malware & Vulnerable)
mkdir -p qa_artifacts
echo "print('Hello SecureTag')" > qa_artifacts/main.py
zip -j qa_artifacts/test_clean.zip qa_artifacts/main.py

# Crear archivo Vulnerable (SQL Injection para demo de IA)
cat <<EOF > qa_artifacts/vuln.py
import sqlite3
def get_user(username):
    # VULNERABLE: SQL Injection
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)
EOF
zip -j qa_artifacts/test_vuln.zip qa_artifacts/vuln.py

# Crear archivo EICAR (Simulación de Malware Seguro)
cat <<EOF > create_malware.py
import zipfile
import io
zip_buffer = io.BytesIO()
with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
    zip_file.writestr('eicar.com', 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*')
with open('qa_artifacts/test_malware.zip', 'wb') as f:
    f.write(zip_buffer.getvalue())
EOF
python3 create_malware.py
```

---

## 🩺 Paso 2: Sanity Checks (Health)

Verifica que el sistema está vivo.

```bash
echo "--- Health Check ---"
curl -s http://localhost:8080/healthz | jq .
# Esperado: {"ok": true}

echo "--- DB Check ---"
curl -s http://localhost:8080/healthz/db | jq .
# Esperado: {"ok": true}
```

---

## 🔐 Paso 3: Pruebas de Seguridad (Security Promises)

Demuestra que el sistema bloquea accesos no autorizados y amenazas.

### 3.1 Acceso No Autorizado
```bash
echo "--- Intento sin llave (Debe fallar) ---"
curl -s -o /dev/null -w "Status Code: %{http_code}\n" http://localhost:8080/projects
# Esperado: Status Code: 401
```

### 3.2 Detección de Malware (EICAR)
**Advertencia**: Esto bloqueará tu IP temporalmente. El siguiente paso la desbloqueará.

```bash
echo "--- Subiendo Malware (Debe ser bloqueado) ---"
curl -s -H "X-API-Key: spartane_qa_key_2025" \
  -F "file=@qa_artifacts/test_malware_py.zip" \
  -F "project_alias=security-test" \
  http://localhost:8080/codeaudit/upload | jq .
# Esperado: "error": "Security check failed..."
```

### 3.3 Desbloqueo de IP (Para continuar la demo)
Como el paso anterior te bloqueó, ejecuta esto para limpiarte:

```bash
docker exec securetag-db psql -U securetag -d securetag -c "DELETE FROM security_ban;"
docker exec securetag-db psql -U securetag -d securetag -c "DELETE FROM ip_reputation;"
docker restart securetag-app
sleep 5
```

---

## 🚀 Paso 4: Flujo Principal (The Happy Path)

Ejecuta el análisis real del código.

### 4.1 Subir Código Vulnerable (Demo Real)
Este paso es clave para mostrar los hallazgos y el análisis de IA.

```bash
echo "--- Subiendo Código Vulnerable (SQL Injection) ---"
curl -s -H "X-API-Key: spartane_qa_key_2025" \
  -F "file=@qa_artifacts/test_vuln.zip" \
  -F "project_alias=demo-spartane" \
  http://localhost:8080/codeaudit/upload > upload_result.json

cat upload_result.json | jq .
# Guarda el Task ID para consultar
TASK_ID=$(cat upload_result.json | jq -r .taskId)
echo "Task ID: $TASK_ID"
```

### 4.2 Consultar Resultados
Ejecuta esto varias veces hasta que el estado sea `completed`.

```bash
echo "--- Consultando Estado ---"
curl -s -H "X-API-Key: spartane_qa_key_2025" http://localhost:8080/codeaudit/$TASK_ID | jq .status
```

### 4.3 Ver Reporte Final
Una vez completado:

```bash
echo "--- Reporte Final ---"
curl -s -H "X-API-Key: spartane_qa_key_2025" http://localhost:8080/codeaudit/$TASK_ID | jq .
```

---

## 🧹 Paso 5: Limpieza (Opcional)

Si quieres dejar todo como nuevo para otra demo:

```bash
rm -rf qa_artifacts upload_result.json create_malware.py
```
