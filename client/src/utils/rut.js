// Desarrollado por: Robert Ramírez

export function normalizarRut(valor) {
  return String(valor ?? '').replace(/[.\-\s]/g, '').toUpperCase();
}

export function rutValido(valor) {
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