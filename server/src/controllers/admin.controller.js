// Desarrollado por: Agustín Insunsa

const db = require('../db');

async function resumen(req, res) {
  try {
    const resultado = await db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM orden_trabajo WHERE estado = 'PENDIENTE') AS ordenes_pendientes,
         (SELECT COUNT(*)::int FROM asignacion WHERE activa = TRUE) AS asignaciones_activas,
         (SELECT COUNT(*)::int FROM hoja_servicio WHERE estado_servicio = 'EN_EJECUCION') AS servicios_en_curso,
         (SELECT COUNT(*)::int FROM hoja_servicio WHERE estado_servicio = 'FINALIZADO') AS servicios_finalizados,
         (SELECT COUNT(*)::int FROM hoja_servicio WHERE estado_envio_erp = 'ERROR') AS envios_con_error,
         (SELECT COUNT(*)::int FROM presupuesto WHERE estado = 'ENVIADO') AS presupuestos_pendientes,
         (SELECT COUNT(*)::int FROM usuario WHERE activo = TRUE) AS usuarios_activos`
    );
    return res.json(resultado.rows[0]);
  } catch (error) {
    console.error('Error al obtener resumen de administración:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo obtener el resumen' });
  }
}

async function listarHojas(req, res) {
  try {
    const resultado = await db.query(
      `SELECT h.id_hoja, h.estado_servicio, h.estado_envio_erp, h.fecha_inicio, h.fecha_fin,
              h.codigo_hoja_erp, o.codigo_orden_erp, o.titulo,
              c.razon_social AS cliente, u.nombre AS tecnico
         FROM hoja_servicio h
         JOIN asignacion a ON a.id_asignacion = h.id_asignacion
         JOIN orden_trabajo o ON o.id_orden = a.id_orden
         JOIN cliente c ON c.id_cliente = o.id_cliente
         JOIN usuario u ON u.id_usuario = a.id_tecnico
        ORDER BY h.fecha_inicio DESC NULLS LAST
        LIMIT 200`
    );
    return res.json(resultado.rows);
  } catch (error) {
    console.error('Error al listar hojas:', error.message);
    return res.status(500).json({ mensaje: 'No se pudieron obtener las hojas' });
  }
}

module.exports = { resumen, listarHojas };
