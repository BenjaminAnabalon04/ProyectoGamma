-- Desarrollado por: Benjamín Anabalón

ALTER TABLE presupuesto
  ADD COLUMN IF NOT EXISTS id_hoja UUID REFERENCES hoja_servicio (id_hoja);

CREATE INDEX IF NOT EXISTS idx_presupuesto_hoja ON presupuesto (id_hoja);
