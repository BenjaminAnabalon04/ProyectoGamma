// Desarrollado por: Agustín Insunsa

const crypto = require('crypto');
const db = require('../db');
const { esUuid, enteroPositivo, numeroPositivo, texto } = require('../utils/validacion');

function dt(valor, defecto = null) {
  return valor === undefined || valor === null || valor === '' ? defecto : Number(valor);
}

function esAdmin(req) {
  return req.usuario.rol === 'administrador';
}

function filasPublicas(filas) {
  return filas.map((fila) => ({
    id_presupuesto: fila.id_presupuesto,
    id_orden: dt(fila.id_orden),
    codigo_orden_erp: fila.codigo_orden_erp,
    lugar_trabajo: fila.lugar_trabajo,
    descripcion: fila.descripcion,
    estado: fila.estado,
    fecha_creacion: fila.fecha_creacion,
  }));
}

async function listarPresupuestos(req, res) {
  const admin = esAdmin(req);
  const columnas = admin
    ? `p.*, o.codigo_orden_erp, u.nombre AS tecnico, c.razon_social AS cliente`
    : `p.id_presupuesto, p.id_orden, p.lugar_trabajo, p.descripcion, p.estado,
              p.fecha_creacion, o.codigo_orden_erp`;
  const condiciones = admin ? 'TRUE' : 'p.id_tecnico = $1';
  const parametros = admin ? [] : [req.usuario.id_usuario];

  try {
    const resultado = await db.query(
      `SELECT ${columnas}
         FROM presupuesto p
         LEFT JOIN orden_trabajo o ON o.id_orden = p.id_orden
         LEFT JOIN usuario u ON u.id_usuario = p.id_tecnico
         LEFT JOIN cliente c ON c.id_cliente = o.id_cliente
        WHERE ${condiciones}
        ORDER BY p.fecha_creacion DESC`,
      parametros
    );

    if (!admin) return res.json(filasPublicas(resultado.rows));

    const conDetalles = await Promise.all(
      resultado.rows.map(async (fila) => {
        const detalles = await db.query(
          `SELECT id_detalle, descripcion, cantidad, unidad_medida, precio_unitario
             FROM detalle_presupuesto
            WHERE id_presupuesto = $1
            ORDER BY descripcion`,
          [fila.id_presupuesto]
        );
        return {
          ...fila,
          id_presupuesto: fila.id_presupuesto,
          id_orden: dt(fila.id_orden),
          id_tecnico: dt(fila.id_tecnico),
          id_aprobador: dt(fila.id_aprobador),
          monto_estimado: dt(fila.monto_estimado),
          monto_aprobado: dt(fila.monto_aprobado),
          detalles: detalles.rows.map((detalle) => ({
            ...detalle,
            cantidad: Number(detalle.cantidad),
            precio_unitario: dt(detalle.precio_unitario),
          })),
        };
      })
    );
    return res.json(conDetalles);
  } catch (error) {
    console.error('Error al listar presupuestos:', error.message);
    return res.status(500).json({ mensaje: 'No se pudieron obtener los presupuestos' });
  }
}

async function crearPresupuesto(req, res) {
  const idOrden = enteroPositivo(req.body?.id_orden);
  const lugar = texto(req.body?.lugar_trabajo, 200);
  const descripcion = texto(req.body?.descripcion, 4000);
  const items = req.body?.items;

  if (!idOrden) return res.status(400).json({ mensaje: 'Debes indicar una orden válida' });
  if (!descripcion) return res.status(400).json({ mensaje: 'Debes describir el trabajo presupuestado' });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ mensaje: 'Debes agregar al menos un ítem' });
  }

  const detalles = items.map((item) => ({
    descripcion: texto(item?.descripcion, 255),
    cantidad: numeroPositivo(item?.cantidad),
    unidad_medida: texto(item?.unidad_medida, 20),
  }));

  if (detalles.some((detalle) => !detalle.descripcion || !detalle.cantidad)) {
    return res.status(400).json({ mensaje: 'Cada ítem necesita descripción y cantidad mayor que 0' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const orden = await client.query(
      `SELECT o.id_orden
         FROM orden_trabajo o
         JOIN asignacion a ON a.id_orden = o.id_orden
        WHERE o.id_orden = $1 AND a.id_tecnico = $2 AND a.activa = TRUE
        LIMIT 1`,
      [idOrden, req.usuario.id_usuario]
    );
    if (orden.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'Orden no encontrada o no asignada al técnico' });
    }

    const presupuesto = await client.query(
      `INSERT INTO presupuesto (id_presupuesto, id_cliente, id_orden, id_tecnico, lugar_trabajo, descripcion)
       SELECT $1, o.id_cliente, o.id_orden, $2, $3, $4
         FROM orden_trabajo o
        WHERE o.id_orden = $5
        RETURNING id_presupuesto, estado, fecha_creacion`,
      [crypto.randomUUID(), req.usuario.id_usuario, lugar, descripcion, idOrden]
    );

    for (const detalle of detalles) {
      await client.query(
        `INSERT INTO detalle_presupuesto
           (id_detalle, id_presupuesto, descripcion, cantidad, unidad_medida)
         VALUES ($1, $2, $3, $4, $5)`,
        [crypto.randomUUID(), presupuesto.rows[0].id_presupuesto, detalle.descripcion,
          detalle.cantidad, detalle.unidad_medida]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json(presupuesto.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear presupuesto:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo crear el presupuesto' });
  } finally {
    client.release();
  }
}

async function obtenerPresupuesto(req, res) {
  if (!esUuid(req.params.id_presupuesto)) {
    return res.status(400).json({ mensaje: 'id_presupuesto no es válido' });
  }

  const admin = esAdmin(req);
  const columnas = admin
    ? `p.*, o.codigo_orden_erp, u.nombre AS tecnico`
    : `p.id_presupuesto, p.id_orden, p.lugar_trabajo, p.descripcion, p.estado,
              p.fecha_creacion, o.codigo_orden_erp`;

  try {
    const resultado = await db.query(
      `SELECT ${columnas}
         FROM presupuesto p
         LEFT JOIN orden_trabajo o ON o.id_orden = p.id_orden
         LEFT JOIN usuario u ON u.id_usuario = p.id_tecnico
        WHERE p.id_presupuesto = $1 ${admin ? '' : 'AND p.id_tecnico = $2'}`,
      admin ? [req.params.id_presupuesto] : [req.params.id_presupuesto, req.usuario.id_usuario]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Presupuesto no encontrado' });
    }

    const fila = resultado.rows[0];
    if (!admin) return res.json(filasPublicas([fila])[0]);

    const detalles = await db.query(
      `SELECT id_detalle, descripcion, cantidad, unidad_medida, precio_unitario
         FROM detalle_presupuesto
        WHERE id_presupuesto = $1
        ORDER BY descripcion`,
      [fila.id_presupuesto]
    );
    return res.json({
      ...fila,
      id_orden: dt(fila.id_orden),
      id_tecnico: dt(fila.id_tecnico),
      id_aprobador: dt(fila.id_aprobador),
      monto_estimado: dt(fila.monto_estimado),
      monto_aprobado: dt(fila.monto_aprobado),
      detalles: detalles.rows,
    });
  } catch (error) {
    console.error('Error al obtener presupuesto:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo obtener el presupuesto' });
  }
}

async function resolverPresupuesto(req, res, aprobado) {
  if (!esUuid(req.params.id_presupuesto)) {
    return res.status(400).json({ mensaje: 'id_presupuesto no es válido' });
  }

  const observacion = texto(req.body?.observacion_oficina, 2000);
  const montoAprobado = aprobado ? numeroPositivo(req.body?.monto_aprobado) : null;
  const precios = aprobado && Array.isArray(req.body?.precios) ? req.body.precios : [];

  if (aprobado && !montoAprobado) {
    return res.status(400).json({ mensaje: 'Debes indicar un monto aprobado mayor que 0' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const presupuesto = await client.query(
      `SELECT id_presupuesto, estado
         FROM presupuesto
        WHERE id_presupuesto = $1
        FOR UPDATE`,
      [req.params.id_presupuesto]
    );
    if (presupuesto.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'Presupuesto no encontrado' });
    }
    if (presupuesto.rows[0].estado !== 'ENVIADO') {
      await client.query('ROLLBACK');
      return res.status(409).json({ mensaje: 'Ese presupuesto ya fue resuelto' });
    }

    for (const precio of precios) {
      if (!esUuid(precio?.id_detalle)) continue;
      const unitario = numeroPositivo(precio?.precio_unitario);
      if (!unitario) continue;
      await client.query(
        `UPDATE detalle_presupuesto
            SET precio_unitario = $2
          WHERE id_detalle = $1 AND id_presupuesto = $3`,
        [precio.id_detalle, unitario, req.params.id_presupuesto]
      );
    }

    const estado = aprobado ? 'APROBADO' : 'RECHAZADO';
    const estimado = await client.query(
      `SELECT COALESCE(SUM(cantidad * COALESCE(precio_unitario, 0)), 0) AS total
         FROM detalle_presupuesto
        WHERE id_presupuesto = $1`,
      [req.params.id_presupuesto]
    );

    const actualizado = await client.query(
      `UPDATE presupuesto
          SET estado = $2,
              id_aprobador = $3,
              monto_estimado = $4,
              monto_aprobado = $5,
              observacion_oficina = $6
        WHERE id_presupuesto = $1
        RETURNING id_presupuesto, estado, monto_aprobado, observacion_oficina`,
      [
        req.params.id_presupuesto,
        estado,
        req.usuario.id_usuario,
        aprobado ? Number(estimado.rows[0].total) : null,
        montoAprobado,
        observacion,
      ]
    );

    await client.query('COMMIT');
    return res.json(actualizado.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al resolver presupuesto:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo actualizar el presupuesto' });
  } finally {
    client.release();
  }
}

function aprobar(req, res) {
  return resolverPresupuesto(req, res, true);
}

function rechazar(req, res) {
  return resolverPresupuesto(req, res, false);
}

module.exports = { listarPresupuestos, crearPresupuesto, obtenerPresupuesto, aprobar, rechazar };
