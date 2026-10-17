# mesa-servicios-universitarios
Proyecto del curso Taller de Construcción de Software Web: mesa de servicios universitarios con plazos de atención.

[![CI](https://github.com/marcelop04/mesa-servicios-universitarios/actions/workflows/ci.yml/badge.svg)](https://github.com/marcelop04/mesa-servicios-universitarios/actions/workflows/ci.yml)

## Opción 1 · Todo con Docker (recomendada)

Requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine con Compose v2) en ejecución.

```bash
git clone https://github.com/marcelop04/mesa-servicios-universitarios.git
cd mesa-servicios-universitarios
docker compose up --build
```

La primera vez tarda unos minutos (descarga dependencias). Cuando el backend muestre `Started MsuApplication`:

| Servicio | URL |
|---|---|
| Aplicación (React + Nginx) | <http://localhost:8081> |
| API y Swagger (Spring Boot) | <http://localhost:8080/swagger-ui.html> |
| MySQL 8.0 | `localhost:3307` · base `mesa_servicios` · usuario `msu` / `msu_local` |

Flyway crea todas las tablas (V1 a V4) y se cargan datos ficticios: una cuenta por rol y seis solicitudes de
ejemplo. Contraseña de todas las cuentas: `Demo12345!`

| Rol | Correo |
|---|---|
| Solicitante | `solicitante@msu.test` |
| Supervisor | `supervisor@msu.test` |
| Técnico | `tecnico.soporte@msu.test`, `tecnico.mantenimiento@msu.test`, `tecnico.servicios@msu.test` |
| Administrador | `admin@msu.test` |

```bash
docker compose down        # detener (conserva la base y las evidencias)
docker compose down -v     # detener y borrar la base y las evidencias (se crean de nuevo)
docker compose logs -f backend
```

Variables opcionales (archivo `.env` junto a `docker-compose.yml`): `DB_USER`, `DB_PASSWORD`,
`MYSQL_ROOT_PASSWORD`, `DATOS_DEMO`, `DEMO_PASSWORD` y `JWT_SECRET` (clave de los tokens de sesión, 32 bytes o
más). Los valores por defecto son solo para desarrollo local; en un despliegue real cambie `JWT_SECRET`.

## Opción 2 · Sin Docker (para desarrollar)

Requisitos: Java 17+, Maven 3.9+ (o `./mvnw`), Node.js 20+ y MySQL 8.

1. Crear la base y el usuario en MySQL:
   ```sql
   CREATE DATABASE mesa_servicios CHARACTER SET utf8mb4;
   CREATE USER 'msu'@'localhost' IDENTIFIED BY 'msu_local';
   GRANT ALL ON mesa_servicios.* TO 'msu'@'localhost';
   ```
2. Backend (puerto 8080):
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
Docker en cada pull request; si una prueba falla, el pull request queda marcado en rojo.

## Estructura

- `backend/`: API REST Spring Boot 3.5 · Java 17 · MySQL · Flyway ([README](backend/README.md)).
- `frontend/`: React 18 · Vite ([README](frontend/README.md)).
- `prototipo/`: prototipo de la fase I con json-server.
- `docs/`: informe, diagramas, diseño y avance por integrante (`fase-ii-*.md`).

## Problemas comunes

- **Puerto ocupado** (8080, 8081 o 3307): cierre el programa que lo usa o cambie el puerto izquierdo en
  `docker-compose.yml` (por ejemplo `"8082:80"`).
- **`Cannot connect to the Docker daemon`**: abra Docker Desktop y espere a que indique que está en ejecución.
- **La base quedó en un estado raro**: `docker compose down -v` y vuelva a levantar.
