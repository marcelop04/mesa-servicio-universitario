/**
 * `npm run reset`: restaura db.json desde db.seed.json.
 * Responsable: David. Con el servidor encendido, usar el botón
 * "Restablecer datos" (o POST /api/v1/demo/restablecer) para que
 * json-server recargue los datos en memoria.
 */
import { restablecerArchivo } from './datos.js';

console.log(`Datos simulados restablecidos en ${restablecerArchivo()}`);
