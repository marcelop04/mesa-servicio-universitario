# Evidencias de David

- `responsive-local/`: revisión previa en localhost con backend real, H2 efímero y
  frontend compilado. El informe indica explícitamente `entorno: local`; no acredita
  HTTPS público, MySQL ni participación de usuarios reales.
- `responsive/`: revisión ejecutada contra la URL pública HTTPS, 32 capturas de los
  cuatro roles a 360/1366 px y `resultado.json` con 0 desbordes/5xx.
- `oci-capacidad.json`: resultado real, sin claves ni identificadores de cuenta, de la
  verificación Always Free y el intento de crear la VM que Oracle rechazó por capacidad.
- `oci-trial.json`: creación posterior de la VM E5 con créditos de prueba autorizados.
- `https.json`: comprobación real de certificado, SPA, API y sesión.
- `entrega.json`: CI aprobado, entrega GHCR por digest y timer de respaldo activo.
- `recuperacion.json`: ensayo SQL/archivos en la VM y comprobación SHA-256 de la copia externa.

Los enlaces de CI/CD, prueba RNF11 y sesiones de usuarios se registran en
`docs/fase-iii-iv-david.md` al realizarlos. No guardar contraseñas, cookies ni dumps aquí.
