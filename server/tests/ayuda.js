// Desarrollado por: Agustín Insunsa

const path = require('path');

function responder() {
  let resolver;
  const terminado = new Promise((resolve) => {
    resolver = resolve;
  });
  const res = {
    codigo: 200,
    datos: null,
    status(codigo) {
      this.codigo = codigo;
      return this;
    },
    json(datos) {
      this.datos = datos;
      resolver(datos);
      return this;
    },
    terminado,
  };
  return res;
}

function cargar(rutaRelativa, dbFalso) {
  const ruta = path.resolve(__dirname, '..', rutaRelativa);
  const idDb = require.resolve(path.resolve(__dirname, '..', 'src', 'db.js'));
  require.cache[idDb] = { id: idDb, filename: idDb, loaded: true, exports: dbFalso };
  delete require.cache[ruta];
  return require(ruta);
}

function dbConConsultas(consultas, opciones = {}) {
  return {
    consultas,
    connect: opciones.connect,
    async query(sql, parametros = []) {
      const normalizada = String(sql).replace(/\s+/g, ' ').trim();
      const coincidencia = consultas.find((entrada) => normalizada.includes(entrada.contiene));
      if (!coincidencia) {
        throw new Error(`Consulta sin respuesta en la prueba: ${normalizada.slice(0, 120)}`);
      }
      coincidencia.llamadas = (coincidencia.llamadas || 0) + 1;
      if (typeof coincidencia.responder === 'function') {
        return coincidencia.responder(parametros, normalizada);
      }
      return { rows: coincidencia.rows || [] };
    },
  };
}

module.exports = { responder, cargar, dbConConsultas };
