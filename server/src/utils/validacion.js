// Desarrollado por: Agustín Insunsa

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esUuid(valor) {
  return UUID_REGEX.test(String(valor ?? ''));
}

function normalizarRut(valor) {
  return String(valor ?? '').replace(/[.\-\s]/g, '').toUpperCase();
}

function rutValido(valor) {
  const limpio = normalizarRut(valor);
  if (!/^\d{7,8}[\dK]$/.test(limpio)) return false;
  const cuerpo = limpio.slice(0, -1);
  const verificador = limpio.slice(-1);
  let suma = 0;
  let factor = 2;
  for (let indice = cuerpo.length - 1; indice >= 0; indice -= 1) {
    suma += Number(cuerpo[indice]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return verificador === esperado;
}

function enteroPositivo(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function numeroPositivo(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function texto(valor, limite = 255) {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim();
  return limpio ? limpio.slice(0, limite) : null;
}

async function hojaDelTecnico(db, idHoja, idUsuario, opciones = {}) {
  const { permitirEnviada = false } = opciones;
  if (!esUuid(idHoja)) return null;

  const condiciones = ['hs.id_hoja = $1', 'a.id_tecnico = $2'];
  if (!permitirEnviada) condiciones.push("hs.estado_envio_erp <> 'ENVIADO'");

  const resultado = await db.query(
    `SELECT hs.id_hoja, hs.id_checklist, hs.id_asignacion, hs.estado_servicio,
            hs.estado_envio_erp, hs.fecha_inicio, hs.fecha_fin, hs.horometro_servicio,
            hs.actividades, hs.observaciones_tecnicas, hs.resultado, hs.codigo_hoja_erp,
            a.id_tecnico, ot.codigo_orden_erp, ot.titulo,
            ot.tipo_servicio, ot.id_orden
       FROM hoja_servicio hs
       JOIN asignacion a ON a.id_asignacion = hs.id_asignacion
       JOIN orden_trabajo ot ON ot.id_orden = a.id_orden
      WHERE ${condiciones.join(' AND ')}`,
    [idHoja, idUsuario]
  );
  return resultado.rows[0] || null;
}

module.exports = {
  UUID_REGEX,
  esUuid,
  normalizarRut,
  enteroPositivo,
  numeroPositivo,
  texto,
  hojaDelTecnico,
  rutValido,
};
