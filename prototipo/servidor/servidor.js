/**
 * Servidor de la API simulada y de los archivos estáticos del prototipo.
 * Responsable: David (base) con integración de Emanuel (PR06).
 *
 * Usa json-server 0.17.4 como módulo: así el middleware accede a la base
 * (router.db) para calcular código, prioridad y fechas, y para restablecer
 * los datos sin reiniciar. Orden de capas:
 *   1. estáticos (public/) y utilidades de json-server
 *   2. correlación, simulación de fallas y sesión simulada
 *   3. rutas propias del contrato /api/v1 (servidor/middleware.js)
 *   4. reescritura routes.json → recursos de json-server
 *   5. router de json-server con respuesta adaptada al contrato
 *   6. manejador global de errores (formato común)
 *
 * Variables de entorno: PUERTO (3001), DB_ARCHIVO (prototipo/db.json), SILENCIOSO=1.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import jsonServer from 'json-server';
import { RAIZ, RUTA_DB, prepararArchivo } from '../scripts/datos.js';
import { crearApi } from './middleware.js';
import { manejadorGlobal } from './errores.js';

const PUERTO = Number(process.env.PUERTO || 3001);
const rutasReescritas = JSON.parse(readFileSync(path.join(RAIZ, 'routes.json'), 'utf8'));

prepararArchivo(RUTA_DB);
const app = jsonServer.create();
// Se mantiene el sufijo de claves foráneas por defecto ("Id"): los campos del contrato usan
// "_id" y así json-server no borra en cascada registros al ejecutar un DELETE.
const router = jsonServer.router(RUTA_DB);
router.dbArchivo = RUTA_DB;
const api = crearApi(router);

app.use(jsonServer.defaults({ static: path.join(RAIZ, 'public'), logger: !process.env.SILENCIOSO }));
app.use(api.base);
app.use(jsonServer.bodyParser);
app.use('/api/v1', api.rutas);
app.use(api.prepararPasoAJsonServer);
app.use(jsonServer.rewriter(rutasReescritas));
app.use(api.soloRutasDelContrato);
router.render = api.render;
app.use(router);
app.use(manejadorGlobal);

app.listen(PUERTO, () => {
  console.log(`Mesa de Servicios Universitarios (prototipo fase I)`);
  console.log(`  Interfaz:      http://localhost:${PUERTO}/`);
  console.log(`  API simulada:  http://localhost:${PUERTO}/api/v1`);
  console.log(`  Datos:         ${RUTA_DB}`);
});
