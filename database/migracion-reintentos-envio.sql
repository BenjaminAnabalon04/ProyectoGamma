-- Desarrollado por: Agustín Insunsa

ALTER TABLE hoja_servicio
  ADD COLUMN IF NOT EXISTS intentos_envio INTEGER NOT NULL DEFAULT 0;

ALTER TABLE hoja_servicio
  ADD COLUMN IF NOT EXISTS proximo_intento_envio TIMESTAMPTZ;
