# C2/C5 · Revisión de alertas CodeQL en main

Corte: 13/11/2026 (Lima; 14/11 UTC), commit
`c8d4e5c7c5acedf03ba7f029e3a1b934531b1ee8`. Revisión técnica asistida;
**no se descartaron alertas en GitHub ni se atribuye aprobación humana**.

Fuente: API `code-scanning/alerts?state=open&ref=refs/heads/main`, autenticada,
y [CodeQL 43522856218](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43522856218).
La consulta devuelve cinco alertas abiertas: tres high y dos medium. Los análisis
Java y JavaScript finalizaron correctamente; eso no equivale a ausencia de alertas.

## Análisis por hallazgo

| Alertas | Ubicación | Análisis y tratamiento propuesto |
|---|---|---|
| [1](https://github.com/marcelop04/mesa-servicio-universitario/security/code-scanning/1), [2](https://github.com/marcelop04/mesa-servicio-universitario/security/code-scanning/2) · `js/xss`, high | `prototipo/public/js/paginas/acceso.js:31,72` | El dato `volver` llega a `location`, pero antes debe cumplir `^[a-z-]+\.html(\?.*)?$`. La parte anterior a `?` no admite esquema, `/`, `\` ni `%`; la consulta no cambia el esquema del destino. El fallback sale del mapa estático `INICIO_POR_ROL`. No se demostró ejecución de JavaScript. **Candidatas a falso positivo por el guard existente**, pendientes de revisión humana del flujo completo, no descartadas automáticamente. |
| [3](https://github.com/marcelop04/mesa-servicio-universitario/security/code-scanning/3), [4](https://github.com/marcelop04/mesa-servicio-universitario/security/code-scanning/4) · redirección no validada, medium | Mismas dos llamadas | Mismo origen/control: una URL absoluta, `//host`, `javascript:` o una ruta con barra no pasa el guard. No se afirma redirección abierta demostrada. **Propuesta de falso positivo por validación previa**, sujeta a confirmar el comportamiento del navegador y a revisión del equipo; siguen abiertas. |
| [5](https://github.com/marcelop04/mesa-servicio-universitario/security/code-scanning/5) · `js/missing-rate-limiting`, high | `prototipo/servidor/middleware.js:197–202` | **Observación válida del mock:** `/demo/restablecer` lee/escribe el archivo sin límite de frecuencia y reinicia los datos simulados. No es el login de Spring ni una función del despliegue. No se propone clasificarlo como falso positivo solo por ser una demo. Antes de exponer ese servidor habría que retirar/proteger el reset y limitar su acceso/ritmo. |

## Alcance de la release y riesgo residual

- Los contextos de construcción de CI/CD son exclusivamente `backend/` y `frontend/`.
  No copian `prototipo/`, su Express ni su endpoint de reset. Se comprobó en ambos
  Dockerfile y en `.github/workflows/{ci,cd}.yml` del commit indicado.
- El mock identifica al usuario por `X-Usuario-Id` y no es una alternativa segura
  a Spring/JWT. Además, `app.listen(PUERTO)` no restringe por sí solo la interfaz:
  abrirlo en `localhost` en el navegador **no garantiza** que solo escuche en loopback.
- No se excluyó `prototipo/` de CodeQL ni se añadieron supresiones para poner verde
  el panel. Se conserva el código histórico, sin reescribirlo por una hipótesis no
  demostrada. El equipo debe confirmar las cuatro propuestas de clasificación y
  decidir el tratamiento del mock; hasta entonces no anunciar «cero alertas SAST».
- El gate de CD exige que CodeQL termine correctamente, pero no es una regla que
  bloquee por estos hallazgos abiertos. La configuración administrativa de main
  pertenece a B3/propietario; no se cambió en este PR.

Esta revisión no evalúa el head de los PR D/E ni les atribuye resultados: ambos
siguen fuera de main en el corte indicado.
