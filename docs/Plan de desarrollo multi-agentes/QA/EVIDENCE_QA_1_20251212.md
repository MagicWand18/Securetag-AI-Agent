# Evidence QA - Spartane Demo Pre-Check
**Fecha**: 2025-12-12
**QA Agent**: SecureTag QA Bot
**Environment**: Local Docker

## 1. Sanity Checks
- [x] **Services Up**: App, Worker, DB corriendo.
- [x] **Health Check**: `GET /healthz` -> 200 OK.
- [x] **DB Connection**: `GET /healthz/db` -> 200 OK.

## 2. Authentication
- [x] **Unauthorized Access**: `GET /projects` sin key -> 401 Unauthorized.
- [x] **Authorized Access**: `GET /projects` con `X-API-Key: spartane_qa_key_2025` -> 200 OK.
- [x] **Tenant Mapping**: La API Key se mapeó correctamente al tenant `production` (Spartane).

## 3. Security Validation
- [x] **File Type Validation**: Subida de `fake.zip` (texto plano) -> 400 Bad Request ("Invalid file format").
- [x] **Malware Detection**: Subida de `test_malware.zip` (EICAR) -> 400 Security Violation ("File identified as potential threat").
- [x] **Auto-Ban**: IP bloqueada temporalmente tras intento de malware. (Verificado y limpiado para continuar pruebas).

## 4. Core Flow (Happy Path)
- [x] **Upload**: `test_clean.zip` subido exitosamente. TaskId: `8239b542-1e3c-44d3-9851-0238c3d918b3`.
- [x] **Processing**: Worker procesó la tarea. Semgrep ejecutado (con warnings de parsing parcial pero exitoso).
- [x] **Completion**: Estado final `completed`.
- [x] **Vulnerability Analysis (IA Demo)**: Se subió `test_vuln.zip` y se detectó SQL Injection.
    - **SAST**: Detectó CWE-89 (High Severity).
    - **AI Analysis**: Generó `analysis_json` con triaje ("True Positive"), razonamiento y recomendación de usar Prepared Statements.

## 5. Notes & Observations
- **Issue Detectado**: El worker falló inicialmente por "No space left on device" en `/tmp`.
- **Resolución**: Se ejecutó `docker system prune -f` y se reinició el stack. El segundo intento fue exitoso.
- **Semgrep Warnings**: Se observaron warnings de plugins faltantes para reglas Apex/Elixir (esperado en versión OSS sin `--pro`). No afecta el flujo principal de Python.

**Status Final**: ✅ READY FOR DEMO (Local Validation Passed)
