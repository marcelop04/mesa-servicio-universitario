# Suite de Pruebas E2E de Aceptación (Playwright)

**Mesa de Servicios Universitarios (MSU)**  
**Paquete E · Tarea E2**  
**Responsable:** Alex (Ingeniero QA / SDET)  
**Fecha:** 12/11/2026  

---

## 1. Descripción General

Esta suite implementa las pruebas de aceptación de extremo a extremo (E2E) para la Mesa de Servicios Universitarios utilizando **Playwright Test**. Cada escenario sigue el formato BDD (`Dado / Cuando / Entonces`), está etiquetado con su Historia de Usuario correspondiente (`@HUxx`) y cubre las 24 historias de usuario del sistema (HU01 a HU24).

Se ejecutan de manera automatizada contra dos proyectos independientes:
- **`desktop-1366`**: Resolución de escritorio de 1366×768 px.
- **`mobile-360`**: Resolución móvil de 360×780 px (verificación estricta de RNF05 sin desborde horizontal).

El archivo original de la fase II (`docs/pruebas/recorrido-fase-ii.mjs`) se mantiene intacto.

---

## 2. Requisitos Previos

- **Node.js** v18+ y npm.
- Stack de la aplicación ejecutándose localmente (vía Docker Compose o procesos locales):
  - Frontend: `http://localhost:8081` (o `http://localhost:5173` en desarrollo)
  - Backend: `http://localhost:8080`
  - Base de datos MySQL con migraciones Flyway aplicadas y datos demo.

---

## 3. Instalación de Dependencias

```bash
cd tests/e2e
npm install
```

---

## 4. Ejecución de Pruebas

### Ejecutar toda la suite (Desktop y Mobile):
```bash
npm test
```

### Ejecutar solo en Desktop (1366 px):
```bash
npm run test:desktop
```

### Ejecutar solo en Móvil (360 px):
```bash
npm run test:mobile
```

### Ver el reporte HTML interactivo:
```bash
npm run report
```

### Ejecutar una Historia de Usuario específica (ej. HU09 o HU14):
```bash
npx playwright test -g "@HU09"
```

---

## 5. Variables de Entorno

| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `BASE_URL` | URL base de la aplicación web | `http://localhost:8081` |
| `NAVEGADOR` | Canal de navegador (`chromium`, `msedge`, `chrome`) | `msedge` (o Chromium) |
| `CI` | Activa modo CI con reporte JUnit y trazas ante fallos | `false` |

---

## 6. Estructura de la Suite

```
tests/e2e/
├── package.json
├── playwright.config.js
├── README.md
├── helpers/
│   ├── auth.js                    # Inicios de sesión por rol y aserciones de viewport
│   └── datos.js                   # Preparación de datos conocidos y ciclo de vida de casos
├── reportes/
│   ├── junit-e2e.xml              # Reporte JUnit generado
│   └── html/                      # Reporte interactivo HTML de Playwright
└── specs/
    ├── 01-auth-identidad.spec.js  # @HU01, @HU02, @HU03 (Registro, Login, Perfil)
    ├── 02-solicitudes.spec.js     # @HU04, @HU05, @HU06, @HU24 (Registro, Mis Solicitudes, Comentarios, Historial)
    ├── 03-atencion-supervision.spec.js # @HU07, @HU08, @HU09, @HU10, @HU11 (Priorización, Asignación, Cancelación, Atención, Solución)
    ├── 04-cierre-encuesta.spec.js # @HU12, @HU13, @HU14 (Conformidad, Encuesta única, Reapertura)
    ├── 05-indicadores-notificaciones.spec.js # @HU15, @HU16, @HU17, @HU18, @HU19 (Alertas, Notificaciones, Dashboard, CSV real)
    └── 06-administracion.spec.js  # @HU20, @HU21, @HU22, @HU23 (Usuarios, Catálogos, Políticas, Auditoría)
```

---

## 7. Matriz de Cobertura y Trazabilidad

Para el detalle de trazabilidad por historia de usuario, aserciones y requerimientos no funcionales (RNF), consultar [matriz-trazabilidad-hu.md](../../docs/matriz-trazabilidad-hu.md).
