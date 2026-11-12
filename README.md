# mesa-servicios-universitarios
Proyecto del curso Taller de Construcción de Software Web: mesa de servicios universitarios con plazos de atención.

[![CI](https://github.com/marcelop04/mesa-servicios-universitarios/actions/workflows/ci.yml/badge.svg)](https://github.com/marcelop04/mesa-servicios-universitarios/actions/workflows/ci.yml)

## Opción 1 · Todo con Docker (recomendada)

Requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine con Compose v2) en ejecución.

```bash
git clone https://github.com/marcelop04/mesa-servicio-universitario.git
cd mesa-servicio-universitario
# Antes del primer arranque, preparar .env (ver guía de seguridad; en Windows):
# powershell -ExecutionPolicy Bypass -File .\scripts\preparar-entorno.ps1
docker compose up --build
```

La primera vez tarda unos minutos (descarga dependencias). Cuando el backend muestre `Started MsuApplication`:

| Servicio | URL |
|---|---|
| Aplicación (React + Nginx) | <http://localhost:8081> |
| API y Swagger (Spring Boot) | <http://localhost:8080/swagger-ui.html> |
| MySQL 8.0 | `localhost:3307` · base `mesa_servicios` · credenciales en `.env` |

Flyway crea todas las tablas (V1 a V4) y se cargan datos ficticios: una cuenta por rol y seis solicitudes de
ejemplo en local. La contraseña de las cuentas nuevas es `DEMO_PASSWORD` de tu `.env` (no se publica).

| Rol | Correo |
|---|---|
| Solicitante | `solicitante@msu.test` |
| Supervisor | `supervisor@msu.test` |
| Técnico | `tecnico.soporte@msu.test`, `tecnico.mantenimiento@msu.test`, `tecnico.servicios@msu.test` |
| Administrador | `admin@msu.test` |

```bash
docker compose down        # detener (conserva la base y las evidencias)
docker compose logs -f backend
```

**Antes de arrancar:** prepara `.env` según [la guía de Marcelo](docs/seguridad/GUIA_MARCELO.md).
`DB_PASSWORD`, `MYSQL_ROOT_PASSWORD` y `JWT_SECRET` son obligatorios; no hay secretos por defecto.
Si ya existían volúmenes de MySQL, conserva sus credenciales: cambiar `.env` no cambia sus contraseñas.
No uses `docker compose down -v` como solución rutinaria: elimina la base y las evidencias.
Este Compose solo expone puertos en localhost; David debe preparar el despliegue HTTPS por separado.

## Opción 2 · Sin Docker (para desarrollar)

Requisitos: Java 17+, Maven 3.9+ (o `./mvnw`), Node.js 22.12+ y MySQL 8.

1. Crear la base y el usuario en MySQL:
   ```sql
   CREATE DATABASE mesa_servicios CHARACTER SET utf8mb4;
   CREATE USER 'msu'@'localhost' IDENTIFIED BY '<tu DB_PASSWORD privada>';
   GRANT ALL ON mesa_servicios.* TO 'msu'@'localhost';
   ```
2. Backend (puerto 8080):
   Exporta primero `DB_PASSWORD` y `JWT_SECRET` al proceso. Spring Boot no lee `.env` automáticamente.
   En PowerShell: `. .\scripts\cargar-entorno.ps1` desde la raíz. Para cuentas ficticias, configura también
   `DATOS_DEMO=true` y `DEMO_PASSWORD` (ver guía).
   ```bash
   cd backend
   mvn spring-boot:run
   ```
3. Frontend (puerto 5173; reenvía `/api` al backend):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Abrir <http://localhost:5173>.

## Pruebas

```bash
cd backend && mvn test       # JUnit: H2 en modo MySQL con las migraciones reales
cd frontend && npm test      # Vitest
```

El pipeline de GitHub Actions (`.github/workflows/ci.yml`) ejecuta ambas suites y construye las imágenes
Docker si las pruebas y los análisis de dependencias pasan. Configura `NVD_API_KEY` en GitHub Secrets.

## Seguridad · paquete C de Marcelo

- [Guía paso a paso: herramientas, pruebas, GitHub y ZAP](docs/seguridad/GUIA_MARCELO.md).
- [Avance, evidencias y dependencias del equipo](docs/fase-iii-iv-marcelo.md).
- [Lista de control OWASP](docs/seguridad/checklist-owasp.md).
- [Revisión de arquitectura y código](docs/seguridad/revision-arquitectura.md).
- [Informe final consolidado (borrador; faltan aportes del equipo)](docs/informe/Informe_Final_Fases_III_IV.md).

## Estructura

- `backend/`: API REST Spring Boot 3.5 · Java 17 · MySQL · Flyway ([README](backend/README.md)).
- `frontend/`: React 18 · Vite ([README](frontend/README.md)).
- `prototipo/`: prototipo de la fase I con json-server.
- `docs/`: informe, diagramas, diseño y avance por integrante (`fase-ii-*.md`).

## Problemas comunes

- **Puerto ocupado** (8080, 8081 o 3307): cierre el programa que lo usa o cambie el puerto izquierdo en
  `docker-compose.yml` (por ejemplo `"8082:80"`).
- **`Cannot connect to the Docker daemon`**: abra Docker Desktop y espere a que indique que está en ejecución.
- **Error de credenciales tras crear `.env`**: si MySQL ya tenía datos, conserva su contraseña anterior;
  no borres volúmenes. Consulta a David para una rotación o restauración controlada.
