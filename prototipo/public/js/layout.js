/**
 * Estructura común de páginas: cabecera con nombre y rol, menú según rol,
 * cierre de sesión y herramientas de demostración.
 * Responsables: Gabriel (PR01) y David (botón "Restablecer datos").
 */
import { requerirSesion, cerrarSesion } from './sesion.js';
import { api } from './api.js';
import { simularFallaActiva, simularDemoraActiva, cambiarSimularFalla, cambiarSimularDemora } from './demo.js';
import { esc } from './formato.js';
import { confirmar } from './ui.js';

const CLAVE_MENSAJE = 'msu.mensajePendiente';

/** Menú por rol (tabla 3 y tabla 21: solo se muestran las vistas permitidas). */
const MENU = Object.freeze({
  SOLICITANTE: [
    { id: 'solicitudes', texto: 'Mis solicitudes', href: 'solicitudes.html' },
    { id: 'nueva', texto: 'Nueva solicitud', href: 'nueva-solicitud.html' },
    { id: 'notificaciones', texto: 'Notificaciones', href: 'notificaciones.html' },
  ],
  TECNICO: [
    { id: 'solicitudes', texto: 'Mis asignaciones', href: 'solicitudes.html' },
    { id: 'notificaciones', texto: 'Notificaciones', href: 'notificaciones.html' },
  ],
  SUPERVISOR: [
    { id: 'solicitudes', texto: 'Bandeja de solicitudes', href: 'solicitudes.html' },
    { id: 'notificaciones', texto: 'Notificaciones', href: 'notificaciones.html' },
  ],
  ADMINISTRADOR: [
    { id: 'catalogos', texto: 'Catálogos', href: 'catalogos.html' },
    { id: 'notificaciones', texto: 'Notificaciones', href: 'notificaciones.html' },
  ],
});

/** Panel de demostración reutilizado en el acceso y en las páginas internas. */
export function htmlHerramientasDemo() {
  return `
    <section class="demo" aria-labelledby="titulo-demo">
      <h2 id="titulo-demo">Herramientas de demostración</h2>
      <div class="campo-casilla">
        <input type="checkbox" id="demo-falla" ${simularFallaActiva() ? 'checked' : ''}>
        <label for="demo-falla">Simular falla de la API</label>
      </div>
      <div class="campo-casilla">
        <input type="checkbox" id="demo-demora" ${simularDemoraActiva() ? 'checked' : ''}>
        <label for="demo-demora">Simular red lenta (2 s)</label>
      </div>
      <button type="button" class="boton boton--pequeno" id="demo-restablecer">Restablecer datos</button>
      <p class="ayuda" id="demo-estado" role="status" aria-live="polite"></p>
    </section>`;
}

export function activarHerramientasDemo(raiz = document) {
  raiz.querySelector('#demo-falla')?.addEventListener('change', (e) => cambiarSimularFalla(e.target.checked));
  raiz.querySelector('#demo-demora')?.addEventListener('change', (e) => cambiarSimularDemora(e.target.checked));
  raiz.querySelector('#demo-restablecer')?.addEventListener('click', async (e) => {
    const estado = raiz.querySelector('#demo-estado');
    const ok = await confirmar({
      titulo: 'Restablecer datos simulados',
      mensaje: 'Se perderán las solicitudes y cambios hechos durante la demostración y se cargarán los datos iniciales.',
      aceptar: 'Restablecer', peligro: true,
    });
    if (!ok) return;
    e.target.disabled = true;
    try {
      await api.post('/demo/restablecer');
      sessionStorage.setItem(CLAVE_MENSAJE, 'Datos simulados restablecidos a su estado inicial.');
      location.reload();
    } catch (error) {
      estado.textContent = `No se pudieron restablecer los datos: ${error.message}`;
      e.target.disabled = false;
    }
  });
}

/**
 * Prepara la página: exige sesión con un rol permitido y dibuja cabecera y menú.
 * @returns {object|null} la sesión, o null si no hay sesión o el rol no tiene permiso
 */
export function iniciarPagina({ roles = [], activa }) {
  const { sesion, permitido } = requerirSesion(roles);
  if (!sesion) return null;

  const cabecera = document.getElementById('cabecera');
  cabecera.innerHTML = `
    <a class="marca" href="${MENU[sesion.rol]?.[0]?.href ?? 'index.html'}">
      <span class="marca__nombre">Mesa de Servicios Universitarios</span>
      <span class="marca__detalle">Prototipo fase I · datos ficticios</span>
    </a>
    <button type="button" class="boton boton--pequeno boton-menu" aria-expanded="false" aria-controls="menu" id="boton-menu">Menú</button>
    <div class="usuario-actual">
      <div class="usuario-actual__datos" data-prueba="usuario-actual">
        <span class="usuario-actual__nombre">${esc(sesion.nombre)}</span>
        <span class="usuario-actual__rol">Rol: ${esc(sesion.rol_nombre)}${sesion.area_nombre ? ` · ${esc(sesion.area_nombre)}` : ''}</span>
      </div>
      <button type="button" class="boton boton--pequeno" id="cerrar-sesion">Cerrar sesión</button>
    </div>`;

  const menu = document.getElementById('menu');
  menu.innerHTML = `
    <ul class="menu__lista">
      ${(MENU[sesion.rol] ?? []).map((item) => `
        <li><a class="menu__enlace" href="${item.href}" ${item.id === activa ? 'aria-current="page"' : ''}>${esc(item.texto)}</a></li>`).join('')}
    </ul>
    ${htmlHerramientasDemo()}`;
  activarHerramientasDemo(menu);

  const botonMenu = document.getElementById('boton-menu');
  botonMenu.addEventListener('click', () => {
    const abierto = menu.classList.toggle('menu--abierto');
    botonMenu.setAttribute('aria-expanded', String(abierto));
  });

  document.getElementById('cerrar-sesion').addEventListener('click', async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* la sesión simulada se cierra igual en el navegador */
    }
    cerrarSesion();
    location.href = 'index.html';
  });

  const pendiente = sessionStorage.getItem(CLAVE_MENSAJE);
  if (pendiente) {
    sessionStorage.removeItem(CLAVE_MENSAJE);
    const aviso = document.createElement('div');
    aviso.className = 'aviso aviso--exito';
    aviso.setAttribute('role', 'status');
    aviso.textContent = pendiente;
    document.getElementById('contenido').prepend(aviso);
  }

  if (!permitido) {
    document.getElementById('contenido').innerHTML = `
      <div class="aviso aviso--error" role="alert">
        <h1>Acceso no permitido</h1>
        <p>Tu rol (${esc(sesion.rol_nombre)}) no tiene acceso a esta vista. Usa las opciones del menú.</p>
      </div>`;
    return null;
  }
  return sesion;
}

/** Guarda un mensaje para mostrarlo en la siguiente página. */
export function mensajeParaSiguientePagina(texto) {
  sessionStorage.setItem(CLAVE_MENSAJE, texto);
}
