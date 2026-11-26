// Desarrollado por: Robert Ramírez

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const CSS = path.join(RAIZ, 'client', 'src', 'index.css');
const MINIMO_CONTRASTE = 7;
const MINIMO_TOQUE = 56;

const css = fs.readFileSync(CSS, 'utf8');

function leerVariables() {
  const bloque = css.match(/:root\s*\{([\s\S]*?)\}/);
  const variables = {};
  if (!bloque) return variables;
  for (const linea of bloque[1].split(/\r?\n/)) {
    const encontrada = linea.match(/--([a-zA-Z-]+)\s*:\s*(#[0-9a-fA-F]{6})/);
    if (encontrada) variables[`--${encontrada[1]}`] = encontrada[2];
  }
  return variables;
}

function color(valor, variables) {
  return valor.startsWith('--') ? variables[valor] : valor;
}

function luminancia(hex) {
  const limpio = hex.replace('#', '');
  const canales = [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canales.map((canal) =>
    canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(fondo, frente) {
  const l1 = luminancia(fondo);
  const l2 = luminancia(frente);
  const [claro, oscuro] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (claro + 0.05) / (oscuro + 0.05);
}

function bloqueDe(marcador) {
  const inicio = css.indexOf(marcador);
  if (inicio === -1) return null;
  const abre = css.indexOf('{', inicio);
  const cierra = css.indexOf('}', abre);
  if (abre === -1 || cierra === -1) return null;
  return css.slice(abre + 1, cierra);
}

function tamano(bloque, propiedad) {
  if (!bloque) return null;
  const encontrado = bloque.match(new RegExp(`${propiedad}\\s*:\\s*(\\d+)px`));
  return encontrado ? Number(encontrado[1]) : null;
}

const variables = leerVariables();
const errores = [];

const pares = [
  ['Texto principal', '#ffffff', '--texto'],
  ['Texto tenue sobre blanco', '#ffffff', '--texto-tenue'],
  ['Texto tenue sobre fondo', '#eff2f9', '--texto-tenue'],
  ['Texto tenue sobre tarjeta', '#fbfcfe', '--texto-tenue'],
  ['Texto tenue sobre pendiente', '#e9eef5', '--texto-tenue'],
  ['Texto tenue sobre nav activa', '#eef4fb', '--texto-tenue'],
  ['Texto tenue sobre sync', '#eef6ff', '--texto-tenue'],
  ['Estado aprobado', '#d8f3e9', '--verde-texto'],
  ['KPI verde', '#e4f8f1', '--verde-texto'],
  ['Mensaje correcto', '#e6f7ef', '--verde-texto'],
  ['Estado en proceso', '#fff0d4', '#6b3f00'],
  ['KPI ámbar', '#fff7e3', '#6b3f00'],
  ['Mensaje alerta', '#fff7e6', '#6b3f00'],
  ['Estado rechazado', '#fbe1df', '--error'],
  ['Mensaje error', '#fdeceb', '--error'],
  ['Error sobre blanco', '#ffffff', '--error'],
  ['Blanco sobre botón verde', '--verde', '#ffffff'],
  ['Blanco sobre botón azul', '--azul-barra', '#ffffff'],
  ['Blanco sobre hero', '--azul-hero', '#ffffff'],
  ['Blanco sobre botón peligro', '--error', '#ffffff'],
  ['Botón claro', '#ffffff', '#1e4d83'],
  ['Avatar', '#fb9b08', '#332200'],
  ['KPI azul', '#edf6ff', '#1d4e89'],
  ['Texto sobre hero', '#123c90', '#dbe7fb'],
  ['Micro sobre hero', '#123c90', '#ffe1ad'],
  ['Aviso sin red', '#fb9b08', '#2c1c00'],
];

for (const [nombre, fondo, frente] of pares) {
  const fondoHex = color(fondo, variables);
  const frenteHex = color(frente, variables);
  if (!fondoHex || !frenteHex) {
    errores.push(`${nombre}: no se pudo resolver el color (${fondo} / ${frente})`);
    continue;
  }
  const proporcion = contraste(fondoHex, frenteHex);
  if (proporcion < MINIMO_CONTRASTE) {
    errores.push(
      `${nombre}: ${proporcion.toFixed(2)}:1 (mínimo ${MINIMO_CONTRASTE}:1) ${frenteHex} sobre ${fondoHex}`
    );
  }
}

const objetivos = [
  ['.boton {', 'min-height'],
  ['.boton-barra {', 'min-height'],
  ['.boton-compacto {', 'min-height'],
  ['.enlace-boton {', 'min-height'],
  ['.navegacion-inferior a {', 'min-height'],
  ['.chequeo select {', 'min-height'],
  [".chequeo input[type='text'] {", 'min-height'],
  ['.fila-material .boton {', 'min-height'],
  ['.detalle-registros > summary {', 'min-height'],
  ["input[type='text'],", 'min-height'],
];

for (const [marcador, propiedad] of objetivos) {
  const valor = tamano(bloqueDe(marcador), propiedad);
  if (valor === null) {
    errores.push(`No se encontró ${propiedad} en ${marcador}`);
  } else if (valor < MINIMO_TOQUE) {
    errores.push(`${marcador} usa ${propiedad}: ${valor}px (mínimo ${MINIMO_TOQUE}px)`);
  }
}

const icono = bloqueDe('.boton-icono {');
const anchoIcono = tamano(icono, 'width');
const altoIcono = tamano(icono, 'height');
if (anchoIcono === null || altoIcono === null) {
  errores.push('No se encontró el tamaño de .boton-icono');
} else if (anchoIcono < MINIMO_TOQUE || altoIcono < MINIMO_TOQUE) {
  errores.push(`.boton-icono mide ${anchoIcono}x${altoIcono}px (mínimo ${MINIMO_TOQUE}px)`);
}

const ordenBoton = bloqueDe('.orden-pie button {');
const altoOrdenBoton = tamano(ordenBoton, 'min-height');
if (altoOrdenBoton === null) {
  errores.push('No se encontró min-height en .orden-pie button');
} else if (altoOrdenBoton < MINIMO_TOQUE) {
  errores.push(`.orden-pie button usa min-height: ${altoOrdenBoton}px (mínimo ${MINIMO_TOQUE}px)`);
}

if (errores.length > 0) {
  console.error('Hallazgos de usabilidad (HU-09):');
  errores.forEach((error) => console.error(`  - ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    `Usabilidad verificada: ${pares.length} contrastes ≥ ${MINIMO_CONTRASTE}:1 y ${objetivos.length + 2} controles ≥ ${MINIMO_TOQUE}px.`
  );
}
