import { initStorage, getActiveUser, resetDemoData } from "./core/storage.js";
import { apiFetch, registerCoreEndpoints } from "./core/apiClient.js";
import { renderHeaderAndNav, renderLoginView, showGlobalMessage, clearGlobalMessages } from "./core/ui.js";

import { initModuloIntegrante2, renderMisSolicitudes, renderNuevaSolicitud } from "./modules/integrante2_solicitudes.js";
import { initModuloIntegrante3, renderBandejaSupervisor } from "./modules/integrante3_supervisor.js";
import { initModuloIntegrante4, renderBandejaTecnico } from "./modules/integrante4_tecnico.js";
import { initModuloIntegrante5, renderDetalleSolicitud } from "./modules/integrante5_detalle.js";

let currentView = null;
let selectedSolicitudId = null;

function getDefaultView(role) {
  if (role === "SOLICITANTE") return "mis-solicitudes";
  if (role === "SUPERVISOR") return "bandeja-supervisor";
  if (role === "TECNICO") return "bandeja-tecnico";
  return "mis-solicitudes";
}

function navigateTo(viewId, params = {}) {
  const user = getActiveUser();
  const content = document.getElementById("app-content");

  if (!user) {
    currentView = "login";
    renderHeaderAndNav(null, null, navigateTo);
    renderLoginView(content, handleLogin);
    return;
  }

  currentView = viewId || getDefaultView(user.rol_codigo);
  if (params.solicitudId !== undefined) selectedSolicitudId = params.solicitudId;

  renderHeaderAndNav(user, currentView, navigateTo);

  const openDetail = id => navigateTo("detalle-solicitud", { solicitudId: id });
  const goHome = () => navigateTo(getDefaultView(user.rol_codigo));

  switch (currentView) {
    case "mis-solicitudes": renderMisSolicitudes(content, { user, openDetail }); break;
    case "nueva-solicitud": renderNuevaSolicitud(content, { user, onCreated: goHome }); break;
    case "bandeja-supervisor": renderBandejaSupervisor(content, { user, openDetail }); break;
    case "bandeja-tecnico": renderBandejaTecnico(content, { user, openDetail }); break;
    case "detalle-solicitud": renderDetalleSolicitud(content, { user, solicitudId: selectedSolicitudId, onBack: goHome }); break;
    default: navigateTo(getDefaultView(user.rol_codigo));
  }
}

async function handleLogin(correo, password) {
  clearGlobalMessages();
  const res = await apiFetch("/api/v1/auth/login", { method: "POST", body: { correo, password } });
  showGlobalMessage(`Bienvenido(a), ${res.usuario.nombre}`, "success");
  navigateTo(getDefaultView(res.usuario.rol_codigo));
}

async function handleLogout() {
  try { await apiFetch("/api/v1/auth/logout", { method: "POST" }); } finally {
    showGlobalMessage("Sesión cerrada correctamente.", "info");
    navigateTo("login");
  }
}

function handleReset() {
  resetDemoData();
  showGlobalMessage("Datos de la demostración restablecidos.", "success");
  const user = getActiveUser();
  if (user) navigateTo(getDefaultView(user.rol_codigo));
  else navigateTo("login");
}

document.addEventListener("DOMContentLoaded", () => {
  initStorage();
  registerCoreEndpoints();
  initModuloIntegrante2();
  initModuloIntegrante3();
  initModuloIntegrante4();
  initModuloIntegrante5();

  document.getElementById("btn-logout").addEventListener("click", handleLogout);
  document.getElementById("btn-reset-demo").addEventListener("click", handleReset);

  const toggle = document.getElementById("btn-menu-toggle");
  const sidebar = document.getElementById("app-sidebar");
  toggle.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  const user = getActiveUser();
  if (user) navigateTo(getDefaultView(user.rol_codigo));
  else navigateTo("login");
});
