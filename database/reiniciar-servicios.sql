-- Desarrollado por: Benjamín Anabalón

BEGIN;

DELETE FROM presupuesto
 WHERE id_hoja IS NOT NULL;

DELETE FROM hoja_servicio;

UPDATE orden_trabajo
   SET estado = 'PENDIENTE';

COMMIT;
