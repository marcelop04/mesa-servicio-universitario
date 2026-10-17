/**
 * Herramientas de demostración: simular falla o lentitud de la API.
 * Responsable: Emanuel (PR06).
 *
 * Los interruptores se guardan en sessionStorage y el cliente de API los envía
 * como encabezados (X-Simular-Falla, X-Simular-Demora) para que la API simulada
 * responda 503 con el formato común de error o tarde unos segundos.
 */
const CLAVE_FALLA = 'msu.demo.simularFalla';
const CLAVE_DEMORA = 'msu.demo.simularDemora';

const leer = (clave) => {
  try {
    return sessionStorage.getItem(clave) === '1';
  } catch {
    return false;
  }
};
const escribir = (clave, activo) => {
  try {
    if (activo) sessionStorage.setItem(clave, '1');
    else sessionStorage.removeItem(clave);
  } catch {
    /* sin almacenamiento: el interruptor no persiste */
  }
};

export const simularFallaActiva = () => leer(CLAVE_FALLA) || new URLSearchParams(location.search).get('simularFalla') === '1';
export const simularDemoraActiva = () => leer(CLAVE_DEMORA);
export const cambiarSimularFalla = (activo) => escribir(CLAVE_FALLA, activo);
export const cambiarSimularDemora = (activo) => escribir(CLAVE_DEMORA, activo);
