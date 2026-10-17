/**
 * P09 Notificaciones (mini vista del prototipo).
 * Responsable: Emanuel (PR06 / D07).
 *
 * GET /api/v1/notificaciones devuelve solo los avisos del usuario actual.
 * PUT /api/v1/notificaciones/{id}/lectura marca un aviso como leído.
 * DELETE /api/v1/notificaciones/{id} borra un aviso propio (204); un aviso ajeno da 403.
 */
import { iniciarPagina } from '../layout.js';
import { api } from '../api.js';
import { esc, tiempoHtml } from '../formato.js';
import { mostrarCargando, mostrarVacio, mostrarErrorApi, anunciar, confirmar } from '../ui.js';

const sesion = iniciarPagina({ roles: [], activa: 'notificaciones' });
const vista = document.getElementById('vista');
const avisoAccion = document.getElementById('aviso-accion');
document.getElementById('subtitulo').textContent = 'Avisos internos de tus solicitudes. No se envían por correo.';

async function cargar() {
  mostrarCargando(vista, 'Cargando notificaciones…');
  try {
    const { items, total } = await api.get('/notificaciones', { 'tamaño': 50 });
    if (total === 0) {
      mostrarVacio(vista, { titulo: 'No tienes notificaciones', texto: 'Aquí aparecerán los avisos de registro, asignación y cambios de tus solicitudes.' });
      return;
    }
    const noLeidas = items.filter((n) => !n.leida_en).length;
    vista.innerHTML = `
      <p>${total} ${total === 1 ? 'aviso' : 'avisos'} · ${noLeidas} sin leer</p>
      <ul class="lista-avisos">
        ${items.map((n) => `
          <li class="panel ${n.leida_en ? '' : 'no-leida'}" data-aviso="${n.id}">
            <div>
              <p><strong>${n.leida_en ? 'Leída' : 'No leída'}</strong> · ${tiempoHtml(n.creada_en)}</p>
              <p>${esc(n.texto)}</p>
              ${sesion.rol === 'ADMINISTRADOR' ? '' : `<a href="detalle.html?id=${n.solicitud_id}">Abrir la solicitud</a>`}
            </div>
            <div class="acciones">
              ${n.leida_en ? '' : `<button type="button" class="boton boton--pequeno" data-leer="${n.id}">Marcar como leída</button>`}
              <button type="button" class="boton boton--pequeno boton--peligro" data-eliminar="${n.id}">Eliminar</button>
            </div>
          </li>`).join('')}
      </ul>`;
    vista.querySelectorAll('[data-leer]').forEach((b) => b.addEventListener('click', () => accion(b, () => api.put(`/notificaciones/${b.dataset.leer}/lectura`), 'Aviso marcado como leído.')));
    vista.querySelectorAll('[data-eliminar]').forEach((b) => b.addEventListener('click', async () => {
      const ok = await confirmar({ titulo: 'Eliminar aviso', mensaje: 'El aviso se borrará de tu lista. La solicitud y su historial no cambian.', aceptar: 'Eliminar', peligro: true });
      if (ok) accion(b, () => api.eliminar(`/notificaciones/${b.dataset.eliminar}`), 'Aviso eliminado.');
    }));
  } catch (error) {
    mostrarErrorApi(vista, error, { titulo: 'No se pudieron cargar las notificaciones', alReintentar: cargar });
  }
}

async function accion(boton, peticion, mensaje) {
  boton.disabled = true;
  try {
    await peticion();
    await cargar();
    anunciar(avisoAccion, mensaje);
  } catch (error) {
    boton.disabled = false;
    mostrarErrorApi(avisoAccion, error, { titulo: 'No se aplicó el cambio', alReintentar: () => accion(boton, peticion, mensaje), enfocar: true });
  }
}

if (sesion) {
  document.getElementById('actualizar').addEventListener('click', cargar);
  cargar();
}
