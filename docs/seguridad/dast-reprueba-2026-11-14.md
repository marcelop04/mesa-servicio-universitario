# C3 · Reprueba pública de ZAP sobre la versión corregida

Fecha: **13/11/2026 por la noche, hora de Lima (14/11/2026 UTC)**. Ejecutó: Emanuel, con asistencia de IA
y con la autorización del equipo para repetir el baseline. **La revisión y la aceptación de C3 siguen siendo
de Marcelo, responsable del paquete C; este documento no las sustituye.**

Antecedente: [baseline inicial sobre `c8d4e5c`](dast-2026-11-13.md), con un hallazgo medio, tres bajos y
tres informativos, corregidos en el PR #12.

## 1. Versión y alcance

| Campo | Evidencia |
|---|---|
| Origen | `https://msu-157-137-206-147.sslip.io` |
| Versión desplegada | `98bf12cab5bc55c07224dab6a138e1a0ec0da090`, último CD correcto de main ([run 43557964974](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43557964974), 2026-11-14T04:45:19Z) |
| Límite de atribución | ZAP no lee la revisión de las imágenes; la versión se toma del CD de GitHub |
| Tipo | Baseline pasivo, sin autenticación ni ataques activos |
| Ejecutor | Docker local contra HTTPS público; no es el workflow DAST de Actions |
| ZAP | 2.17.0, misma imagen fijada por hash que el baseline inicial |
| Inicio / fin UTC | `2026-11-14T04:52:15Z` / `2026-11-14T04:53:37Z` |
| Parámetros | Los mismos del baseline inicial: `-m 1 -T 5`, formularios desactivados, dos hilos de spider y 20 hijos por nodo |
| Resultado técnico | Completado, salida **2** por avisos; sin reglas IGNORE |

Antes del escaneo, `node scripts/comprobar-cabeceras.mjs` pasó sobre `/`, `/api/v1/auth/csrf` y `/api/v1/me`.

## 2. Resultado y comparación

**65 reglas aprobadas, 3 con aviso y 0 en fallo.** Los cuatro hallazgos corregidos ya no aparecen.

| Regla | Baseline inicial (`c8d4e5c`) | Reprueba (`98bf12c`) |
|---|---|---|
| 10055 · CSP con `style-src 'unsafe-inline'` | Medio | **Aprobada** |
| 90004 · Falta `Cross-Origin-Embedder-Policy` | Bajo | **Aprobada** |
| 90004 · Falta `Cross-Origin-Opener-Policy` | Bajo | **Aprobada** |
| 90004 · Falta `Cross-Origin-Resource-Policy` | Bajo | **Aprobada** |
| 10015 · Revisar `Cache-Control` | Informativo | Informativo (2 instancias) |
| 10049 · Contenido no almacenable | Informativo | Informativo (5 instancias) |
| 10109 · Aplicación web moderna | Informativo | Informativo (3 instancias) |

Los tres informativos restantes son los mismos del baseline inicial y no se trataron como
vulnerabilidades: los dos primeros se deben a `Cache-Control: no-store`, que se mantiene como protección,
y el tercero indica que el spider tradicional no recorre una SPA.

## 3. Evidencias

- [Reporte JSON original](evidencias/zap-98bf12c-reprueba.json). SHA-256:
  `b73a57b1a4b03af6f8960f9c14f4523f9b637f76f9336de1df6c435d82ce35e4`. Sin sesión, cookies ni datos personales.
- [Resumen generado con `scripts/resumir-zap.py`](evidencias/zap-98bf12c-reprueba-resumen.json).
- [Alcance](evidencias/zap-98bf12c-reprueba-alcance.json) y
  [registro de la ejecución](evidencias/zap-98bf12c-reprueba-ejecucion.json).
- HTML, Markdown y consola: `reports/seguridad/zap-98bf12c-reprueba/`, carpeta ignorada por Git.

## 4. Límites, iguales a los del baseline inicial

- ZAP informó **4 rutas públicas** (raíz, `robots.txt`, `sitemap.xml` y recursos estáticos). `robots.txt` y
  `sitemap.xml` reciben la página de la SPA.
- **No cubre el inicio de sesión, la cookie de sesión, los roles ni la API autenticada.** Esos controles se
  verifican con `AccesosPorRolTest` (50 casos) y con las pruebas de API de Newman.
- Es un escaneo pasivo: no envía ataques. No equivale a una prueba de penetración.

## 5. Qué queda para cerrar C3

1. Que Marcelo revise este resultado y el reporte original, y registre su aceptación.
2. Revisión del equipo de los tres informativos como riesgo aceptado.
3. Opcional: verificar la cookie de sesión en el despliegue con una cuenta de pruebas autorizada.
