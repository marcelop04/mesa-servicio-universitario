/**
 * Sesión simulada por rol.
 * Responsable: Gabriel (PR01).
 *
 * Guarda en sessionStorage solo el perfil público de la cuenta de demostración
 * elegida (id, nombre, rol, área). No guarda contraseñas ni tokens y no equivale
 * a la seguridad del backend real (tabla 24); el servidor simulado vuelve a
 * comprobar el rol en cada petición.
 */
const CLAVE = 'msu.sesion';

/** Página de inicio de cada rol. */
export const INICIO_POR_ROL = Object.freeze({
  SOLICITANTE: 'solicitudes.html',
  TECNICO: 'solicitudes.html',
  SUPERVISOR: 'solicitudes.html',
  ADMINISTRADOR: 'catalogos.html',
});

export function obtenerSesion() {
  try {
    const datos = JSON.parse(sessionStorage.getItem(CLAVE) ?? 'null');
    return datos && datos.id && datos.rol ? datos : null;
  } catch {
    return null;
  }
}

export function guardarSesion(perfil) {
  const { id, nombre, correo, rol, rol_nombre: rolNombre, area_id: areaId, area_nombre: areaNombre } = perfil;
  sessionStorage.setItem(CLAVE, JSON.stringify({ id, nombre, correo, rol, rol_nombre: rolNombre, area_id: areaId, area_nombre: areaNombre }));
}

export function cerrarSesion() {
  sessionStorage.removeItem(CLAVE);
}

/**
 * Exige una sesión con alguno de los roles indicados.
 * Sin sesión redirige al acceso; con otro rol devuelve null para que la página
 * muestre el mensaje de permiso denegado.
 */
export function requerirSesion(rolesPermitidos = []) {
  const sesion = obtenerSesion();
  if (!sesion) {
    const destino = encodeURIComponent(location.pathname.split('/').pop() + location.search);
    location.replace(`index.html?volver=${destino}`);
    return { sesion: null, permitido: false };
  }
  return { sesion, permitido: rolesPermitidos.length === 0 || rolesPermitidos.includes(sesion.rol) };
}
