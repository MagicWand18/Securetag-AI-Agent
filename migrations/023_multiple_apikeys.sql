--liquibase formatted sql
--changeset securetag:023_multiple_apikeys

-- Agregar columnas para gestión avanzada de llaves
ALTER TABLE securetag.api_key ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE securetag.api_key ADD COLUMN IF NOT EXISTS last_used_ip TEXT;

-- Asegurar que la llave sea única
ALTER TABLE securetag.api_key DROP CONSTRAINT IF EXISTS api_key_key_hash_key;
ALTER TABLE securetag.api_key ADD CONSTRAINT api_key_key_hash_key UNIQUE (key_hash);

-- Index para búsquedas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_api_key_user_id ON securetag.api_key(user_id);
