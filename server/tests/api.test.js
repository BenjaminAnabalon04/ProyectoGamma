// Desarrollado por: Agustín Insunsa

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const bcrypt = require('bcryptjs');
const { responder, cargar, dbConConsultas } = require('./ayuda');

process.env.JWT_SECRET = 'secreto-de-prueba-del-proyecto-gamma';

const ID_HOJA = crypto.randomUUID();
const TOKEN = { id_usuario: 1, rol: 'tecnico' };

test('HU-01: login devuelve token y datos del usuario', async () => {
  const hash = bcrypt.hashSync('Gamma2026!', 10);
  const db = dbConConsultas([
    {
      contiene: 'FROM usuario',
      rows: [
        {
          id_usuario: '1',
          nombre: 'Carlos Mendoza',
          rol: 'tecnico',
          password_hash: hash,
          intentos_fallidos: 0,
          bloqueado_hasta: null,
        },
      ],
    },
    { contiene: 'UPDATE usuario SET intentos_fallidos = 0', rows: [] },
  ]);
  const { login } = cargar('src/controllers/auth.controller.js', db);
  const res = responder();

  await login({ body: { rut: '11.111.111-1', password: 'Gamma2026!' } }, res);
  await res.terminado;

  assert.equal(res.codigo, 200);
  assert.ok(res.datos.token);
  assert.equal(res.datos.usuario.nombre, 'Carlos Mendoza');
});

test('HU-02: mis trabajos usa el técnico del token', async () => {
  const db = dbConConsultas([
    {
      contiene: 'FROM asignacion a',
      rows: [
        {
          id_orden: '3',
          id_asignacion: '7',
          codigo_orden_erp: 'OT-8844',
          titulo: 'Revisión',
          descripcion: 'Revisión general',
          tipo_servicio: 'Mantención',
          prioridad: 'ALTA',
          fecha_programada: null,
          estado: 'PENDIENTE',
          cliente: 'Cliente de prueba',
          equipo: 'Equipo de prueba',
          codigo_qr_equipo: 'QR-EQ-001',
        },
      ],
    },
  ]);
  const { misTrabajos } = cargar('src/controllers/ordenes.controller.js', db);
  const res = responder();

  await misTrabajos({ usuario: TOKEN }, res);
  await res.terminado;

  assert.equal(res.codigo, 200);
  assert.equal(res.datos[0].id_orden, 3);
  assert.equal(res.datos[0].codigo_orden_erp, 'OT-8844');
  assert.deepEqual(db.consultas[0].llamadas, 1);
});

test('HU-07: el listado marca completado cuando la hoja fue enviada al ERP', async () => {
  const db = dbConConsultas([
    {
      contiene: 'FROM asignacion a',
      rows: [
        {
          id_orden: '3',
          id_asignacion: '7',
          codigo_orden_erp: 'OT-8844',
          titulo: 'Revisión',
          descripcion: 'Revisión general',
          tipo_servicio: 'Mantención',
          prioridad: 'ALTA',
          fecha_programada: null,
          estado: 'PENDIENTE',
          estado_servicio: 'FINALIZADO',
          estado_envio_erp: 'ENVIADO',
          fecha_inicio_servicio: '2026-01-01T10:00:00.000Z',
          fecha_fin_servicio: '2026-01-01T11:00:00.000Z',
          cliente: 'Cliente de prueba',
          equipo: 'Equipo de prueba',
          codigo_qr_equipo: 'QR-EQ-001',
        },
      ],
    },
  ]);
  const { misTrabajos } = cargar('src/controllers/ordenes.controller.js', db);
  const res = responder();

  await misTrabajos({ usuario: TOKEN }, res);
  await res.terminado;

  assert.equal(res.codigo, 200);
  assert.equal(res.datos[0].estado, 'COMPLETADO');
  assert.equal(res.datos[0].estado_envio_erp, 'ENVIADO');
  assert.equal(res.datos[0].fecha_fin_servicio, '2026-01-01T11:00:00.000Z');
});

test('HU-08: un presupuesto aprobado con el servicio finalizado marca la orden como completada', async () => {
  const db = dbConConsultas([
    {
      contiene: 'FROM asignacion a',
      rows: [
        {
          id_orden: '3',
          id_asignacion: '7',
          codigo_orden_erp: 'OT-8844',
          titulo: 'Revisión',
          descripcion: 'Revisión general',
          tipo_servicio: 'Mantención',
          prioridad: 'ALTA',
          fecha_programada: null,
          estado: 'PENDIENTE',
          estado_servicio: 'FINALIZADO',
          estado_envio_erp: 'PENDIENTE',
          presupuesto_estado: 'APROBADO',
          cliente: 'Cliente de prueba',
          equipo: 'Equipo de prueba',
          codigo_qr_equipo: 'QR-EQ-001',
        },
      ],
    },
  ]);
  const { misTrabajos } = cargar('src/controllers/ordenes.controller.js', db);
  const res = responder();

  await misTrabajos({ usuario: TOKEN }, res);
  await res.terminado;

  assert.equal(res.codigo, 200);
  assert.equal(res.datos[0].estado, 'COMPLETADO');
  assert.equal(res.datos[0].presupuesto_estado, 'APROBADO');
});

test('HU-08: un presupuesto pendiente deja el servicio en revisión al finalizar', async () => {
  const db = dbConConsultas([
    {
      contiene: 'FROM asignacion a',
      rows: [
        {
          id_orden: '3',
          id_asignacion: '7',
          codigo_orden_erp: 'OT-8844',
          titulo: 'Revisión',
          descripcion: 'Revisión general',
          tipo_servicio: 'Mantención',
          prioridad: 'ALTA',
          fecha_programada: null,
          estado: 'PENDIENTE',
          estado_servicio: 'FINALIZADO',
          estado_envio_erp: 'PENDIENTE',
          presupuesto_estado: 'ENVIADO',
          cliente: 'Cliente de prueba',
          equipo: 'Equipo de prueba',
          codigo_qr_equipo: 'QR-EQ-001',
        },
      ],
    },
  ]);
  const { misTrabajos } = cargar('src/controllers/ordenes.controller.js', db);
  const res = responder();

  await misTrabajos({ usuario: TOKEN }, res);
  await res.terminado;

  assert.equal(res.codigo, 200);
  assert.equal(res.datos[0].estado, 'EN_REVISION');
  assert.equal(res.datos[0].presupuesto_estado, 'ENVIADO');
});

test('HU-03: iniciar servicio crea la hoja con el UUID del celular', async () => {
  const db = dbConConsultas([
    {
      contiene: 'FROM asignacion a',
      rows: [{ id_tecnico: '1', activa: true, tipo_servicio: 'Mantención' }],
    },
    { contiene: 'FROM hoja_servicio', rows: [] },
    { contiene: 'FROM checklist', rows: [{ id_checklist: '1' }] },
    {
      contiene: 'INSERT INTO hoja_servicio',
      responder: (parametros) => ({
        rows: [
          {
            id_hoja: parametros[0],
            id_checklist: parametros[2],
            estado_servicio: 'EN_EJECUCION',
            fecha_inicio: '2026-01-01T10:00:00Z',
          },
        ],
      }),
    },
  ]);
  const { iniciar } = cargar('src/controllers/servicios.controller.js', db);
  const res = responder();

  await iniciar(
    { usuario: TOKEN, body: { id_hoja: ID_HOJA, id_asignacion: 4 } },
    res
  );
  await res.terminado;

  assert.equal(res.codigo, 201);
  assert.equal(res.datos.id_hoja, ID_HOJA);
  assert.equal(res.datos.id_checklist, 1);
});

test('HU-03: finalizar exige datos obligatorios antes de cerrar el servicio', async () => {
  const db = dbConConsultas([
    {
      contiene: 'FROM hoja_servicio hs',
      rows: [
        {
          id_hoja: ID_HOJA,
          id_checklist: '1',
          id_asignacion: '7',
          estado_servicio: 'EN_EJECUCION',
          estado_envio_erp: 'PENDIENTE',
          id_tecnico: '1',
          codigo_orden_erp: 'OT-8844',
          titulo: 'Revisión',
          tipo_servicio: 'Mantención',
          id_orden: '3',
        },
      ],
    },
    { contiene: 'FROM presupuesto', rows: [] },
    { contiene: 'FROM item_checklist', rows: [{ pregunta: '¿Conexiones en buen estado?' }] },
    { contiene: 'FROM evidencia', rows: [{ fotos: 0, firmas: 0 }] },
  ]);
  const { finalizar } = cargar('src/controllers/servicios.controller.js', db);
  const res = responder();

  await finalizar(
    {
      usuario: TOKEN,
      params: { id_hoja: ID_HOJA },
      body: { actividades: '', resultado: '' },
    },
    res
  );
  await res.terminado;

  assert.equal(res.codigo, 400);
  assert.ok(res.datos.faltantes.includes('actividades realizadas'));
  assert.ok(res.datos.faltantes.includes('resultado del servicio'));
  assert.ok(res.datos.faltantes.includes('¿Conexiones en buen estado?'));
  assert.ok(res.datos.faltantes.includes('al menos una fotografía'));
  assert.ok(res.datos.faltantes.includes('la firma del cliente'));
});

test('HU-04: guardar respuestas valida que los ítems pertenezcan a la hoja', async () => {
  const client = {
    async query(sql, parametros = []) {
      const texto = String(sql).replace(/\s+/g, ' ');
      if (texto.includes('FROM hoja_servicio hs')) {
        return { rows: [{ id_hoja: ID_HOJA, id_checklist: '1', estado_envio_erp: 'PENDIENTE' }] };
      }
      if (texto.includes('FROM item_checklist')) {
        return { rows: [{ id_item: '9', pregunta: '¿Nivel correcto?' }] };
      }
      if (texto.includes('INSERT INTO respuesta_checklist')) {
        assert.equal(parametros[0], ID_HOJA);
        assert.equal(parametros[2], '¿Nivel correcto?');
        return { rows: [] };
      }
      return { rows: [] };
    },
    release() {},
  };
  const db = dbConConsultas([], { connect: async () => client });
  const { guardarRespuestas } = cargar('src/controllers/checklists.controller.js', db);
  const res = responder();

  await guardarRespuestas(
    {
      usuario: TOKEN,
      params: { id_hoja: ID_HOJA },
      body: { respuestas: [{ id_item: 9, resultado: 'OK', observacion: '' }] },
    },
    res
  );
  await res.terminado;

  assert.equal(res.codigo, 200);
  assert.equal(res.datos.guardadas, 1);
});

test('HU-05: registrar consumo exige cantidad mayor que cero', async () => {
  const db = dbConConsultas([]);
  const { registrarConsumo } = cargar('src/controllers/materiales.controller.js', db);
  const res = responder();

  await registrarConsumo(
    {
      usuario: TOKEN,
      body: { id_hoja: ID_HOJA, id_material: 1, cantidad: 0 },
    },
    res
  );
  await res.terminado;

  assert.equal(res.codigo, 400);
  assert.match(res.datos.mensaje, /mayor que 0/);
});

test('HU-05: registrar consumo crea el registro con idempotencia', async () => {
  const idConsumo = crypto.randomUUID();
  const db = dbConConsultas([
    {
      contiene: 'FROM hoja_servicio hs',
      rows: [{ id_hoja: ID_HOJA, estado_envio_erp: 'PENDIENTE' }],
    },
    { contiene: 'FROM material', rows: [{ id_material: '1', nombre: 'Filtro', unidad_medida: 'un' }] },
    { contiene: 'FROM consumo_material cm', rows: [] },
    {
      contiene: 'INSERT INTO consumo_material',
      responder: (parametros) => ({
        rows: [
          {
            id_consumo: parametros[0],
            id_hoja: parametros[1],
            id_material: parametros[2],
            cantidad: parametros[3],
            fecha_registro: '2026-01-01',
            estado: 'REGISTRADO',
          },
        ],
      }),
    },
  ]);
  const { registrarConsumo } = cargar('src/controllers/materiales.controller.js', db);
  const res = responder();

  await registrarConsumo(
    {
      usuario: TOKEN,
      body: { id_hoja: ID_HOJA, id_consumo: idConsumo, id_material: 1, cantidad: 2.5 },
    },
    res
  );
  await res.terminado;

  assert.equal(res.codigo, 201);
  assert.equal(res.datos.id_consumo, idConsumo);
  assert.equal(res.datos.nombre, 'Filtro');
});

test('HU-06: guardar firma exige nombre y RUT del firmante', async () => {
  const db = dbConConsultas([]);
  const { registrarEvidencia } = cargar('src/controllers/evidencias.controller.js', db);
  const res = responder();
  const archivo = `data:image/png;base64,${Buffer.from('firma').toString('base64')}`;

  await registrarEvidencia(
    {
      usuario: TOKEN,
      body: { id_hoja: ID_HOJA, tipo: 'firma', archivo, formato: 'png' },
    },
    res
  );
  await res.terminado;

  assert.equal(res.codigo, 400);
  assert.match(res.datos.mensaje, /nombre y RUT/);
});

test('HU-06: guardar evidencia escribe el archivo y registra la clave', async () => {
  const carpeta = await fs.mkdtemp(path.join(os.tmpdir(), 'gamma-evidencias-'));
  process.env.UPLOADS_DIR = carpeta;
  const idEvidencia = crypto.randomUUID();
  const db = dbConConsultas([
    {
      contiene: 'FROM hoja_servicio hs',
      rows: [{ id_hoja: ID_HOJA, estado_envio_erp: 'PENDIENTE' }],
    },
    { contiene: 'FROM evidencia', rows: [] },
    {
      contiene: 'INSERT INTO evidencia',
      responder: (parametros) => ({
        rows: [
          {
            id_evidencia: parametros[0],
            id_hoja: parametros[1],
            tipo: parametros[3],
            clave_archivo: parametros[4],
            formato: parametros[5],
            sha256: parametros[10],
            fecha_captura: '2026-01-01',
          },
        ],
      }),
    },
  ]);
  const { registrarEvidencia } = cargar('src/controllers/evidencias.controller.js', db);
  const res = responder();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  await registrarEvidencia(
    {
      usuario: TOKEN,
      body: {
        id_hoja: ID_HOJA,
        id_evidencia: idEvidencia,
        tipo: 'foto',
        archivo: `data:image/png;base64,${png.toString('base64')}`,
        formato: 'png',
      },
    },
    res
  );
  await res.terminado;

  assert.equal(res.codigo, 201);
  assert.equal(res.datos.clave_archivo, `${idEvidencia}.png`);
  assert.equal(res.datos.sha256, crypto.createHash('sha256').update(png).digest('hex'));
  const contenido = await fs.readFile(path.join(carpeta, `${idEvidencia}.png`));
  assert.equal(contenido.equals(png), true);
});

test('HU-08: el técnico crea un presupuesto sin precios', async () => {
  const client = {
    async query(sql, parametros = []) {
      const texto = String(sql).replace(/\s+/g, ' ');
      if (texto.includes('INSERT INTO presupuesto')) {
        return {
          rows: [
            {
              id_presupuesto: parametros[0],
              estado: 'ENVIADO',
              fecha_creacion: '2026-01-01',
            },
          ],
        };
      }
      if (texto.includes('INSERT INTO detalle_presupuesto')) {
        assert.equal(parametros.length, 6);
        return { rows: [] };
      }
      if (texto.includes('FROM orden_trabajo o')) return { rows: [{ id_orden: '5' }] };
      return { rows: [] };
    },
    release() {},
  };
  const db = dbConConsultas([], { connect: async () => client });
  const { crearPresupuesto } = cargar('src/controllers/presupuestos.controller.js', db);
  const res = responder();

  await crearPresupuesto(
    {
      usuario: TOKEN,
      body: {
        id_orden: 5,
        descripcion: 'Cambio de filtros',
        items: [{ descripcion: 'Filtro secador', cantidad: '2', unidad_medida: 'un' }],
      },
    },
    res
  );
  await res.terminado;

  assert.equal(res.codigo, 201);
  assert.equal(res.datos.estado, 'ENVIADO');
});

test('HU-11: el resumen de administración devuelve los conteos', async () => {
  const db = dbConConsultas([
    {
      contiene: 'ordenes_pendientes',
      rows: [
        {
          ordenes_pendientes: 6,
          asignaciones_activas: 5,
          servicios_en_curso: 0,
          servicios_finalizados: 0,
          envios_con_error: 0,
          presupuestos_pendientes: 0,
          usuarios_activos: 4,
        },
      ],
    },
  ]);
  const { resumen } = cargar('src/controllers/admin.controller.js', db);
  const res = responder();

  await resumen({ usuario: { id_usuario: 3, rol: 'administrador' } }, res);
  await res.terminado;

  assert.equal(res.datos.ordenes_pendientes, 6);
  assert.equal(res.datos.usuarios_activos, 4);
});
