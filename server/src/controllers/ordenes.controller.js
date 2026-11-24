// Desarrollado por: Agustín Insunsa

const db = require('../db');
const { enteroPositivo, texto } = require('../utils/validacion');

const CAMPOS_ORDEN = `
  o.id_orden,
  a.id_asignacion,
  o.codigo_orden_erp,
  o.titulo,
  o.descripcion,
  o.tipo_servicio,
  o.prioridad,
  o.fecha_programada,
  o.estado,
  c.razon_social AS cliente,
  e.nombre AS equipo,
  e.codigo_qr AS codigo_qr_equipo
`;

const UNION_ORDEN = `
  FROM asignacion a
  JOIN orden_trabajo o ON o.id_orden = a.id_orden
  JOIN cliente c ON c.id_cliente = o.id_cliente
  LEFT JOIN equipo e ON e.id_equipo = o.id_equipo
`;

function convertir(fila) {
  return {
    id_orden: Number(fila.id_orden),
    id_asignacion: Number(fila.id_asignacion),
    codigo_orden_erp: fila.codigo_orden_erp,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    tipo_servicio: fila.tipo_servicio,
    prioridad: fila.prioridad,
    fecha_programada: fila.fecha_programada,
    estado: fila.estado,
    cliente: fila.cliente,
    equipo: fila.equipo,
    codigo_qr_equipo: fila.codigo_qr_equipo,
  };
}

async function misTrabajos(req, res) {
  try {
    const resultado = await db.query(
      `SELECT ${CAMPOS_ORDEN}
         ${UNION_ORDEN}
        WHERE a.id_tecnico = $1 AND a.activa = TRUE
        ORDER BY o.fecha_programada ASC NULLS LAST, o.id_orden ASC`,
      [req.usuario.id_usuario]
    );
    res.json(resultado.rows.map(convertir));
  } catch (error) {
    console.error('Error al obtener órdenes:', error.message);
    res.status(500).json({ mensaje: 'No se pudieron obtener las órdenes' });
  }
}

async function obtenerOrden(req, res) {
  const idOrden = enteroPositivo(req.params.id_orden);
  if (!idOrden) return res.status(400).json({ mensaje: 'id_orden no es válido' });

  try {
    const resultado = await db.query(
      `SELECT ${CAMPOS_ORDEN}
         ${UNION_ORDEN}
        WHERE a.id_tecnico = $1 AND a.activa = TRUE AND o.id_orden = $2`,
      [req.usuario.id_usuario, idOrden]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Orden no encontrada' });
    }
    return res.json(convertir(resultado.rows[0]));
  } catch (error) {
    console.error('Error al obtener orden:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo obtener la orden' });
  }
}

async function obtenerPorQr(req, res) {
  const codigo = texto(req.params.codigo, 60);
  if (!codigo) return res.status(400).json({ mensaje: 'Código QR no válido' });

  try {
    const resultado = await db.query(
      `SELECT ${CAMPOS_ORDEN}
         ${UNION_ORDEN}
        WHERE a.id_tecnico = $1 AND a.activa = TRUE
          AND (e.codigo_qr = $2 OR o.codigo_orden_erp = $2)
        ORDER BY o.id_orden ASC
        LIMIT 1`,
      [req.usuario.id_usuario, codigo]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: 'No hay una orden asignada con ese código QR' });
    }
    return res.json(convertir(resultado.rows[0]));
  } catch (error) {
    console.error('Error al buscar orden por QR:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo buscar la orden' });
  }
}

module.exports = { misTrabajos, obtenerOrden, obtenerPorQr };
