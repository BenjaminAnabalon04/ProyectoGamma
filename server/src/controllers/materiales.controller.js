// Desarrollado por: Aaron Ponse
// Integrado por: Agustín Insunsa

const crypto = require('crypto');
const db = require('../db');
const { esUuid, numeroPositivo, enteroPositivo, texto, hojaDelTecnico } = require('../utils/validacion');

async function buscarMateriales(req, res) {
  const consulta = texto(req.query.q, 80) || '';

  try {
    const sql = `
      SELECT id_material, codigo_material_erp, nombre, unidad_medida,
             stock_referencial, stock_minimo
        FROM material
       WHERE activo = TRUE
       ${consulta ? 'AND (nombre ILIKE $1 OR COALESCE(codigo_material_erp, \'\') ILIKE $1)' : ''}
       ORDER BY nombre ASC, id_material ASC
    `;
    const resultado = await db.query(sql, consulta ? [`%${consulta}%`] : []);

    return res.json(
      resultado.rows.map((material) => ({
        id_material: Number(material.id_material),
        codigo_material_erp: material.codigo_material_erp,
        nombre: material.nombre,
        unidad_medida: material.unidad_medida,
        stock_referencial: Number(material.stock_referencial),
        stock_minimo: Number(material.stock_minimo),
      }))
    );
  } catch (error) {
    console.error('Error al buscar materiales:', error.message);
    return res.status(500).json({ mensaje: 'No se pudieron consultar los materiales' });
  }
}

async function registrarConsumo(req, res) {
  const { id_hoja, id_consumo } = req.body || {};
  const idMaterial = enteroPositivo(req.body?.id_material);
  const cantidad = numeroPositivo(req.body?.cantidad);

  if (!esUuid(id_hoja)) {
    return res.status(400).json({ mensaje: 'id_hoja debe ser un UUID válido' });
  }
  if (id_consumo !== undefined && !esUuid(id_consumo)) {
    return res.status(400).json({ mensaje: 'id_consumo debe ser un UUID válido' });
  }
  if (!idMaterial) {
    return res.status(400).json({ mensaje: 'Debes seleccionar un material válido' });
  }
  if (!cantidad) {
    return res.status(400).json({ mensaje: 'La cantidad consumida debe ser mayor que 0' });
  }

  try {
    const hoja = await hojaDelTecnico(db, id_hoja, req.usuario.id_usuario);
    if (!hoja) return res.status(404).json({ mensaje: 'Hoja de servicio no encontrada' });

    const material = await db.query(
      `SELECT id_material, nombre, unidad_medida
         FROM material
        WHERE id_material = $1 AND activo = TRUE`,
      [idMaterial]
    );
    if (material.rows.length === 0) {
      return res.status(404).json({ mensaje: 'El material seleccionado no existe o está inactivo' });
    }

    const idConsumo = id_consumo || crypto.randomUUID();
    const existente = await db.query(
      `SELECT cm.id_consumo, cm.id_hoja, cm.id_material, cm.cantidad, cm.fecha_registro, cm.estado
         FROM consumo_material cm
        WHERE cm.id_consumo = $1`,
      [idConsumo]
    );

    if (existente.rows.length > 0) {
      const previo = existente.rows[0];
      if (previo.id_hoja !== id_hoja || Number(previo.id_material) !== idMaterial) {
        return res.status(409).json({ mensaje: 'Ese id_consumo ya pertenece a otro registro' });
      }
      return res.json({
        ...previo,
        id_material: Number(previo.id_material),
        cantidad: Number(previo.cantidad),
        nombre: material.rows[0].nombre,
        unidad_medida: material.rows[0].unidad_medida,
      });
    }

    const insercion = await db.query(
      `INSERT INTO consumo_material (id_consumo, id_hoja, id_material, cantidad)
       VALUES ($1, $2, $3, $4)
       RETURNING id_consumo, id_hoja, id_material, cantidad, fecha_registro, estado`,
      [idConsumo, id_hoja, idMaterial, cantidad]
    );

    const fila = insercion.rows[0];
    return res.status(201).json({
      ...fila,
      id_material: Number(fila.id_material),
      cantidad: Number(fila.cantidad),
      nombre: material.rows[0].nombre,
      unidad_medida: material.rows[0].unidad_medida,
    });
  } catch (error) {
    console.error('Error al registrar consumo de material:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo registrar el consumo' });
  }
}

async function listarConsumos(req, res) {
  if (!esUuid(req.params.id_hoja)) {
    return res.status(400).json({ mensaje: 'id_hoja debe ser un UUID válido' });
  }

  try {
    const hoja = await hojaDelTecnico(db, req.params.id_hoja, req.usuario.id_usuario, {
      permitirEnviada: true,
    });
    if (!hoja) return res.status(404).json({ mensaje: 'Hoja de servicio no encontrada' });

    const resultado = await db.query(
      `SELECT cm.id_consumo, cm.id_material, m.nombre, m.unidad_medida,
              cm.cantidad, cm.fecha_registro
         FROM consumo_material cm
         JOIN material m ON m.id_material = cm.id_material
        WHERE cm.id_hoja = $1
        ORDER BY cm.fecha_registro, cm.id_consumo`,
      [req.params.id_hoja]
    );

    return res.json(
      resultado.rows.map((fila) => ({
        ...fila,
        id_material: Number(fila.id_material),
        cantidad: Number(fila.cantidad),
      }))
    );
  } catch (error) {
    console.error('Error al listar consumos:', error.message);
    return res.status(500).json({ mensaje: 'No se pudieron obtener los consumos' });
  }
}

module.exports = { buscarMateriales, registrarConsumo, listarConsumos };
