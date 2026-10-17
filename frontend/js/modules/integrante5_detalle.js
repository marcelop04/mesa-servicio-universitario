import { getCollection, escapeHtml } from "./shared.js";
export function initModuloIntegrante5() {}
export function renderDetalleSolicitud(container, { solicitudId, onBack }) {
  const s = getCollection("solicitudes").find(item => item.id === Number(solicitudId));
  const hist = getCollection("historial").filter(h => h.solicitud_id === Number(solicitudId));
  if (!s) { container.innerHTML = `<div class="alert alert-error">Solicitud no encontrada.</div>`; return; }
  container.innerHTML = `
    <section class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h2 class="section-title">Detalle: ${escapeHtml(s.codigo)}</h2>
        <button id="btn-back" class="btn btn-secondary btn-sm">← Volver</button>
      </div>
      <p><strong>Estado:</strong> ${escapeHtml(s.estado_codigo)} | <strong>Prioridad:</strong> ${escapeHtml(s.prioridad_codigo)}</p>
      <p style="margin-top:0.5rem;"><strong>Descripción:</strong> ${escapeHtml(s.descripcion)}</p>
      <hr style="margin:1rem 0; border:none; border-top:1px solid #bcccdc;" />
      <h3 style="font-size:1rem; margin-bottom:0.5rem;">Historial de eventos (${hist.length})</h3>
      <ul style="padding-left:1.2rem; font-size:0.9rem;">
        ${hist.map(h => `<li><strong>${escapeHtml(h.accion)}</strong> (${escapeHtml(h.nuevo || "-")}) - ${escapeHtml(h.motivo)}</li>`).join("")}
      </ul>
    </section>
  `;
  container.querySelector("#btn-back").addEventListener("click", onBack);
}
