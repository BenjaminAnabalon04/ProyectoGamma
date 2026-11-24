// Desarrollado por: Benjamín Anabalón

const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const app = require('../index');

let servidor;
let base;

before(async () => {
  await new Promise((resolve) => {
    servidor = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  await new Promise((resolve) => servidor.close(resolve));
});

test('El ERP responde que está vivo', async () => {
  const respuesta = await fetch(`${base}/erp/estado`);
  const datos = await respuesta.json();
  assert.equal(respuesta.status, 200);
  assert.equal(datos.status, 'ok');
});

test('El ERP recibe una hoja y no la duplica en un reintento', async () => {
  const idHoja = '11111111-1111-4111-8111-111111111111';
  const primera = await fetch(`${base}/erp/servicios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_hoja: idHoja, titulo: 'Servicio de prueba' }),
  });
  const datosPrimera = await primera.json();
  assert.equal(primera.status, 200);
  assert.equal(datosPrimera.recibido, true);

  const segunda = await fetch(`${base}/erp/servicios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_hoja: idHoja, titulo: 'Servicio de prueba' }),
  });
  const datosSegunda = await segunda.json();
  assert.equal(datosSegunda.codigo_hoja_erp, datosPrimera.codigo_hoja_erp);

  const estado = await (await fetch(`${base}/erp/estado`)).json();
  assert.equal(estado.hojas_recibidas, 1);
});

test('El ERP rechaza una hoja sin id_hoja', async () => {
  const respuesta = await fetch(`${base}/erp/servicios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo: 'Sin id' }),
  });
  assert.equal(respuesta.status, 400);
});

test('FALLAR=1 simula una caída del ERP', async () => {
  process.env.FALLAR = '1';
  try {
    const respuesta = await fetch(`${base}/erp/servicios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_hoja: '22222222-2222-4222-8222-222222222222' }),
    });
    assert.equal(respuesta.status, 503);
  } finally {
    delete process.env.FALLAR;
  }
});
