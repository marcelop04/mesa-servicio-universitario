# Mesa de Servicios Universitarios (MSU) - UNMSM
**Sistema Web Inteligente para la Gestión Integral de Servicios Universitarios**  
*Versión Prototipo Funcional / Base Común (Fase I & II)*

---

## 1. Descripción General del Proyecto
Esta plataforma web centraliza el registro, priorización, evaluación, asignación, atención, resolución y cierre de solicitudes de soporte informático, mantenimiento y servicios generales de la facultad. 

El desarrollo se encuentra estructurado bajo un modelo modular, garantizando el aislamiento de responsabilidades entre los integrantes del equipo y cumpliendo con las especificaciones del Informe de Fase I

---

## 2. Estructura del Repositorio

```text
mesa_servicios_unmsm_complete/
├── database/
│   └── 01_schema_mysql.sql          # Esquema relacional completo en MySQL (18 tablas)
├── frontend/
│   ├── index.html                   # Contenedor principal con encabezado institucional y menú
│   ├── css/
│   │   └── styles.css               # Estilos visuales basados en la Intranet UNMSM (Azul marino y dorado)
│   └── js/
│       ├── app.js                   # Arranque principal, control de sesión, ruteo y botón de reseteo
│       ├── core/
│       │   ├── apiClient.js         # Motor apiFetch simulado con manejo estándar de errores HTTP
│       │   ├── seedData.js          # Datos iniciales (usuarios, áreas, categorías, ubicaciones, políticas)
│       │   ├── storage.js           # Persistencia en localStorage y control del historial común
│       │   └── ui.js                # Renderizado de componentes globales y vista de inicio de sesión P02
│       └── modules/
│           ├── shared.js            # Reexportación limpia de utilidades para consumo transversal
│           ├── integrante2_solicitudes.js
│           ├── integrante3_supervisor.js
│           ├── integrante4_tecnico.js
│           └── integrante5_detalle.js
├── Dockerfile                       # Configuración de Nginx para servir el frontend estático
├── docker-compose.yml               # Orquestador para levantar MySQL y el servidor web localmente
└── README.md                        # Documentación técnica y guía de asignaciones
```

---

## 3. Cuentas de Demostración Configuradas

Todas las cuentas operativas utilizan por defecto la contraseña **`Demo123456`**:

| Rol | Nombre | Correo Electrónico | Área Vinculada | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Solicitante** | Ana Solicitante | `solicitante@unmsm.edu.pe` | Ninguna | Activo |
| **Supervisor** | Carlos Supervisor | `supervisor@unmsm.edu.pe` | Facultad (Global) | Activo |
| **Técnico** | Técnico A (Informática) | `tecnico@unmsm.edu.pe` | Soporte informático | Activo |
| **Técnico** | Técnico B (Mantenimiento) | `tecnico.mant@unmsm.edu.pe` | Mantenimiento | Activo |
| **Técnico** | Técnico C (Servicios Generales) | `tecnico.serv@unmsm.edu.pe` | Servicios generales | Activo |
| **Inactivo** | Usuario Inactivo | `inactivo@unmsm.edu.pe` | Soporte informático | **Inactivo (Bloqueado)** |

---

## 4. Arquitectura y Despliegue con Docker

El proyecto cuenta con persistencia relacional en **MySQL 8.0** y un servidor web **Nginx** orquestados mediante Docker Compose.

### Instrucciones para levantar el entorno:
1. Ubícate en la carpeta raíz del proyecto.
2. Ejecuta el siguiente comando en tu terminal para construir y arrancar los contenedores en segundo plano:
   ```bash
   docker-compose down -v
   docker-compose up -d --build
   ```
3. Abre tu navegador e ingresa a:
   👉 **`http://localhost`**

---

## 5. Guía de Trabajo y Asignaciones por Integrante

Todos los integrantes deben importar las utilidades compartidas desde su respectivo módulo en `frontend/js/modules/` utilizando la siguiente estructura:

```javascript
import {
  apiFetch,
  registerEndpoint,
  createApiError,
  getCollection,
  updateCollection,
  addHistoryEvent,
  generateNextCode,
  showGlobalMessage,
  escapeHtml
} from "./shared.js";
```

### 3. Integrante 1: Acceso y funcionamiento común (Entregado)
- **Responsabilidad cumplida:** Inicio y cierre de sesión con cuentas demo, identificación de usuario activo, renderizado responsive del menú lateral, función `apiFetch` con manejo de códigos de error y base de API simulada con almacenamiento en `localStorage`.

### 4. Integrante 2: Registro y listado de solicitudes (`integrante2_solicitudes.js`)
- **Debe programar:**
  1. Formulario P04 de nueva solicitud (Categoría, Ubicación, Descripción de 20 a 2000 caracteres, Impacto y Urgencia obligatorios).
  2. Validaciones junto a los campos y conservación de datos ante errores.
  3. Lógica para calcular la prioridad inicial y fechas límite según la matriz de plazos del informe.
  4. Generación de código único (`MSU-XXXXXX`) con `generateNextCode()`.
  5. Pantalla P05 "Mis solicitudes" con filtros básicos y listado propio del usuario.

### 5. Integrante 3: Evaluación y asignación del supervisor (`integrante3_supervisor.js`)
- **Debe programar:**
  1. Bandeja global P07 con filtros por estado, área y prioridad.
  2. Transición de `Registrada` a `En evaluación`.
  3. Cambio de prioridad con motivo obligatorio (mínimo 10 caracteres).
  4. Selección de técnicos activos filtrados por el área correspondiente y visualización de su carga de solicitudes pendientes.
  5. Asignación inicial a estado `Asignada` y registro en el historial común.

### 6. Integrante 4: Atención técnica y comentarios (`integrante4_tecnico.js`)
- **Debe programar:**
  1. Bandeja del técnico P08 filtrando únicamente las solicitudes asignadas a su cuenta.
  2. Acción "Iniciar atención" (cambia a `En atención` registrando la fecha una sola vez).
  3. Componente reutilizable de comentarios (1 a 1000 caracteres con autor y fecha).
  4. Formulario de resolución exigiendo una solución de 20 a 2000 caracteres y cambiando el estado a `Resuelta`.

### 7. Integrante 5: Detalle, historial, cierre y auditoría (`integrante5_detalle.js`)
- **Debe programar:**
  1. Vista compartida P06 de detalle: código, estado, prioridad, responsable, plazos calculados y descripción.
  2. Línea de tiempo cronológica del historial operativo y visualización de comentarios y solución.
  3. Botón y operación de conformidad para pasar de `Resuelta` a `Cerrada` dentro de la ventana de 72 horas (exclusivo del solicitante propietario).
  4. **Rol de Auditor:** Revisar la coherencia de los flujos, registrar problemas y verificar que los datos coincidan con el informe de Fase I.