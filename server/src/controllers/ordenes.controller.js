const db = require('../db');

async function misTrabajos(req, res) {
  // El técnico sale del token, nunca de un parámetro de la URL o del body.
  const idTecnico = req.usuario.id_usuario;

  try {
    const resultado = await db.query(
      `SELECT
         o.id_orden,
         a.id_asignacion,
         o.codigo_orden_erp,
         o.titulo,
         o.tipo_servicio,
         o.prioridad,
         o.fecha_programada,
         o.estado,
         c.razon_social AS cliente,
         e.nombre       AS equipo
       FROM asignacion a
       JOIN orden_trabajo o ON o.id_orden = a.id_orden
       JOIN cliente c       ON c.id_cliente = o.id_cliente
       LEFT JOIN equipo e   ON e.id_equipo = o.id_equipo
       WHERE a.id_tecnico = $1
         AND a.activa = TRUE
       ORDER BY o.fecha_programada ASC NULLS LAST, o.id_orden ASC`,
      [idTecnico]
    );

    // PostgreSQL devuelve BIGINT como texto; se convierten los ids a número.
    const ordenes = resultado.rows.map((fila) => ({
      id_orden: Number(fila.id_orden),
      id_asignacion: Number(fila.id_asignacion),
      codigo_orden_erp: fila.codigo_orden_erp,
      titulo: fila.titulo,
      tipo_servicio: fila.tipo_servicio,
      prioridad: fila.prioridad,
      fecha_programada: fila.fecha_programada,
      estado: fila.estado,
      cliente: fila.cliente,
      equipo: fila.equipo,
    }));

    res.json(ordenes);
  } catch (error) {
    // El detalle técnico queda en la terminal, no se envía al cliente.
    console.error('Error al obtener órdenes:', error.message);
    res.status(500).json({ mensaje: 'No se pudieron obtener las órdenes' });
  }
}

module.exports = { misTrabajos };
