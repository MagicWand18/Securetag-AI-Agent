-- liquibase formatted sql

-- changeset ai-shield:029-fix-credits-balance-type
-- comment: Cambiar credits_balance de INTEGER a NUMERIC(10,2) para soportar cobros fraccionarios (AI Shield cobra 0.1 cred/request)

-- Eliminar constraint existente antes de cambiar tipo
ALTER TABLE securetag.tenant DROP CONSTRAINT IF EXISTS check_positive_credits;

-- Cambiar tipo de INTEGER a NUMERIC(10,2)
ALTER TABLE securetag.tenant
    ALTER COLUMN credits_balance TYPE NUMERIC(10,2)
    USING credits_balance::NUMERIC(10,2);

-- Actualizar default para reflejar nuevo tipo
ALTER TABLE securetag.tenant
    ALTER COLUMN credits_balance SET DEFAULT 0.00;

-- Recrear constraint con nuevo tipo
ALTER TABLE securetag.tenant
    ADD CONSTRAINT check_positive_credits CHECK (credits_balance >= 0);
