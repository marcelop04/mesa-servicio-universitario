import { getCollection, escapeHtml } from "./shared.js";
export function initModuloIntegrante3() {}
export function renderBandejaSupervisor(container, { openDetail }) {
  const list = getCollection("solicitudes");
  container.innerHTML = `
    <section class="card">
      <h2 class="section-title">Bandeja de supervisión</h2>
      <p class="section-subtitle">Casos globales de la facultad.</p>
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Código</th><th>Estado</th><th>Prioridad</th><th>Acción</th></tr></thead>
          <tbody>
            ${list.map(s => `
              <tr>
                <td><strong>${escapeHtml(s.codigo)}</strong></td>
                <td>${escapeHtml(s.estado_codigo)}</td>
                <td>${escapeHtml(s.prioridad_codigo)}</td>
                <td><button class="btn btn-secondary btn-sm" data-id="${s.id}">Evaluar</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
  container.querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => openDetail(Number(b.getAttribute("data-id")))));
}
