# Evidencias de David

- [Resultados SUS recibidos](../../pruebas/usuarios/Resultados_SUS.md): cinco cuestionarios
  y media 87/100; los datos no registrados y las horas sin validar se distinguen del cálculo.
- `proteccion.json`: revisión de las reglas efectivas de main. Distingue los checks
  ejecutados en CI de los checks obligatorios para integrar.

- `responsive-local/`: revisión previa en localhost con backend real, H2 efímero y
  frontend compilado. El informe indica explícitamente `entorno: local`; no acredita
  HTTPS público, MySQL ni participación de usuarios reales.
- `responsive/`: revisión ejecutada contra la URL pública HTTPS, 32 capturas de los
  cuatro roles a 360/1366 px y `resultado.json` con 0 desbordes/5xx.
- `responsive-main/`: repetición sobre el commit `df8cc39` entregado por CD main,
  32 capturas de roles y dos de `/sus/`. `sus.json` verifica el formulario sin responderlo.
- `oci-capacidad.json`: resultado real, sin claves ni identificadores de cuenta, de la
  verificación Always Free y el intento de crear la VM que Oracle rechazó por capacidad.
- `oci-trial.json`: creación posterior de la VM E5 con créditos de prueba autorizados.
- `https.json`: comprobación real de certificado, SPA, API y sesión.
- `entrega.json`: entrega inicial histórica desde PR, por digest, y timer de respaldo.
- `entrega-main.json`: cadena CI/CodeQL/GHCR/production/SSH completada desde main,
  revisión SHA de las imágenes, prod sin siembra, salud y configuración GitHub observada.
  Incluye las cinco alertas CodeQL de `prototipo/` pendientes de revisión; el workflow
  exitoso no se confunde con ausencia de alertas.
- `recuperacion.json`: ensayo SQL/archivos en la VM y SHA-256 de las copias externas,
  incluida la copia posterior al CD main.

Los enlaces de CI/CD, prueba RNF11 y sesiones de usuarios se registran en
`docs/fase-iii-iv-david.md` al realizarlos. No guardar contraseñas, cookies ni dumps aquí.
