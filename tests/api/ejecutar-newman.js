/**
 * Runner dinámico para ejecutar la suite Newman conectando variables de entorno del sistema.
 * Permite sobrescribir la URL base mediante BASE_URL (ej. BASE_URL=https://despliegue/api/v1 npm test).
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const coleccion = path.join(__dirname, 'colecciones', 'MSU-API.postman_collection.json');
const archivoEntorno = process.env.CI
  ? path.join(__dirname, 'entornos', 'MSU-CI.postman_environment.json')
  : path.join(__dirname, 'entornos', 'MSU-Local.postman_environment.json');

const reporter = process.env.REPORTER || 'cli,junit';
const reporteSalida = path.join(__dirname, 'reportes', reporter.includes('htmlextra') ? 'index.html' : 'junit-report.xml');

const args = [
  'run',
  coleccion,
  '-e', archivoEntorno,
  '-r', reporter,
];

if (reporter.includes('htmlextra')) {
  args.push('--reporter-htmlextra-export', reporteSalida);
} else if (reporter.includes('junit')) {
  args.push('--reporter-junit-export', reporteSalida);
}

// Conexión dinámica con BASE_URL del sistema si está presente
if (process.env.BASE_URL) {
  let url = process.env.BASE_URL.trim().replace(/\/+$/, '');
  url = url.replace(/\/api\/v1$/, ''); // Las rutas de la colección ya incluyen /api/v1/...
  console.log(`[Newman Runner] Conectando variable del sistema BASE_URL -> ${url}`);
  args.push('--env-var', `base_url=${url}`);
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const proceso = spawn(npx, ['newman', ...args], {
  stdio: 'inherit',
  cwd: __dirname,
  shell: true,
});

proceso.on('exit', (codigo) => {
  process.exit(codigo ?? 0);
});
