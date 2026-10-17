import { INITIAL_DATA } from "./seedData.js";
const DB_KEY = "msu_db_v1";
const SESSION_KEY = "msu_session_user_id";

function cloneData(obj) { return JSON.parse(JSON.stringify(obj)); }

export function initStorage() {
  if (!localStorage.getItem(DB_KEY)) {
    localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_DATA));
  }
}

export function resetDemoData() {
  localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_DATA));
  return getDb();
}

export function getDb() {
  initStorage();
  return JSON.parse(localStorage.getItem(DB_KEY));
}

export function saveDb(dbData) {
  localStorage.setItem(DB_KEY, JSON.stringify(dbData));
}

export function getCollection(name) {
  const db = getDb();
  return cloneData(db[name] || []);
}

export function updateCollection(name, items) {
  const db = getDb();
  db[name] = cloneData(items);
  saveDb(db);
  return db[name];
}

export function generateNextCode() {
  const db = getDb();
  db.secuencia_codigo = (db.secuencia_codigo || 124) + 1;
  saveDb(db);
  return `MSU-${String(db.secuencia_codigo).padStart(6, "0")}`;
}

export function addHistoryEvent({ solicitud_id, actor_id, accion, anterior = null, nuevo = null, motivo = "" }) {
  const db = getDb();
  const nextId = db.historial.length > 0 ? Math.max(...db.historial.map(h => h.id)) + 1 : 1;
  const event = { id: nextId, solicitud_id: Number(solicitud_id), actor_id: actor_id ? Number(actor_id) : null, accion, anterior, nuevo, motivo, creado_en: new Date().toISOString() };
  db.historial.push(event);
  saveDb(db);
  return cloneData(event);
}

export function getActiveUser() {
  const rawId = localStorage.getItem(SESSION_KEY);
  if (!rawId) return null;
  const db = getDb();
  const user = db.usuarios.find(u => u.id === Number(rawId) && u.activo);
  if (!user) { localStorage.removeItem(SESSION_KEY); return null; }
  const { password_demo, ...safe } = user;
  return safe;
}

export function setActiveUser(id) {
  if (id === null || id === undefined) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, String(id));
}
