/**
 * Crea db.json desde db.seed.json si no existe (se ejecuta antes de iniciar la API).
 * Responsable: David.
 */
import { prepararArchivo } from './datos.js';

console.log(`Base de datos simulada: ${prepararArchivo()}`);
