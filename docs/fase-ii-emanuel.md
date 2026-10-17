# Fase II · Parte de Emanuel (atención técnica y calidad)

Estado al 17/10/2026. Cada tarea se compara con su criterio de «Terminado cuando» del plan de trabajo.

| ID | Tarea | Terminado cuando | Estado | Evidencia |
|---|---|---|---|---|
| EM01 | HU10 Iniciar la atención (primera atención una sola vez) | Cumple BDD 1 y 2 de HU10 | Hecho | `POST /solicitudes/{id}/inicio`; `AtencionTest.hu10…` |
| EM02 | HU11 Registrar una solución | Cumple BDD 1 y 2 de HU11 | Hecho | `POST /solicitudes/{id}/resoluciones`; `AtencionTest.hu11…` |
| EM03 | HU12 Confirmar o reabrir y cierre automático a las 72 horas | Cumple BDD 1 y 2; repetir el proceso no duplica cierres | Hecho | `POST /solicitudes/{id}/conformidad`, `CierreAutomaticoServicio`; `AtencionTest.hu12…` |
| EM04 | HU23 Historial operativo visible en el detalle | Cumple BDD 1 de HU23 | Hecho | `GET /solicitudes/{id}/historial`, `Historial.jsx`; `AtencionTest.hu23…` |
| EM05 | P08 Bandeja y atención del técnico, y conformidad en P06 | El técnico y el solicitante completan su parte desde la interfaz | Hecho | `frontend/src/paginas/atencion/`; capturas 07 a 10 |
| EM06 | Configurar pruebas: JUnit y Vitest | Cada integrante puede ejecutar sus pruebas | Hecho | `mvn test` (75 con todo el equipo) y `npm test` (55); ver abajo |
| EM07 | Prueba del recorrido completo con capturas | Evidencias listas para el informe | Hecho | `docs/evidencias/fase-ii-recorrido/` (14 capturas, incluidas registro y perfil); `docs/pruebas/recorrido-fase-ii.mjs` |
| EM08 | Informe de la semana 10 y registro de IA | Informe subido al classroom | Borrador listo; falta revisión del equipo y subirlo | `docs/informe/Informe_Fase_II_Mesa_de_Servicios_Universitarios_v1.0.docx` |

## Reglas implementadas

- **Inicio (HU10):** solo el técnico asignado actualmente (otro técnico recibe 403). Asignada pasa a En atención;
  la primera atención se fija una vez y una reapertura no la modifica (RN06).
- **Solución (HU11):** de 20 a 2000 caracteres; se guarda como evento `RESOLVER` y fija la última resolución.
- **Conformidad (HU12):** solo el solicitante propietario, dentro de 72 horas desde la última resolución; fuera
  de plazo responde 409 `VENTANA_VENCIDA` aunque el cierre automático aún no haya corrido (RN08).
  Reabrir exige motivo: vuelve a En atención con el mismo técnico, o a En evaluación sin responsable si el
  técnico ya está inactivo.
- **Cierre automático:** cada cinco minutos (`msu.tareas.cierre-automatico`), una transacción por caso, actor
  vacío («Sistema»). Solo toma casos que siguen Resueltos, por eso repetirlo no duplica cierres.
- **Historial (HU23):** un evento por cada transición y cambio operativo, con actor, instante, acción, valores
  anterior y nuevo y motivo; mismo acceso que el detalle y sin edición ni borrado.
- **Corrección en un componente común:** `Confirmacion` devolvía el foco a Cancelar en cada render y no dejaba
  escribir dentro del diálogo; ahora enfoca solo al abrir.

## Cómo ejecutar las pruebas (EM06)

```bash
cd backend && mvn test        # JUnit 5 + Spring Boot Test, H2 en modo MySQL con las migraciones reales
cd frontend && npm test       # Vitest + Testing Library
```

Recorrido en navegador (requiere `docker compose up --build` y Microsoft Edge; con Google Chrome use `NAVEGADOR=chrome`):

```bash
cd docs/pruebas
npm install --no-save playwright-core
node recorrido-fase-ii.mjs ../evidencias/fase-ii-recorrido
```

El script usa cuatro sesiones independientes (solicitante, supervisor, técnico y vista móvil) y falla si
algún paso no muestra el resultado esperado.
