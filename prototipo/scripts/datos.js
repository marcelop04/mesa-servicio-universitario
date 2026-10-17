/**
 * Utilidades para preparar y restablecer los datos simulados.
 * Responsable: David (base: datos ficticios y restablecimiento).
 *
 * db.seed.json es la fuente versionada; db.json es la copia de trabajo que
 * modifica json-server y está en .gitignore.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const RAIZ = fileURLToPath(new URL('..', import.meta.url));
export const RUTA_SEMILLA = path.join(RAIZ, 'db.seed.json');
export const RUTA_DB = process.env.DB_ARCHIVO ? path.resolve(process.env.DB_ARCHIVO) : path.join(RAIZ, 'db.json');

/** Copia la semilla sobre la base de trabajo (restablecer). */
export function restablecerArchivo(destino = RUTA_DB) {
  mkdirSync(path.dirname(destino), { recursive: true });
  copyFileSync(RUTA_SEMILLA, destino);
  return destino;
}

/** Crea la base de trabajo solo si todavía no existe. */
export function prepararArchivo(destino = RUTA_DB) {
  if (!existsSync(destino)) restablecerArchivo(destino);
  return destino;
}
