# Demostración de David · Paquete B (3–4 minutos)

Usar las evidencias de `entrega-main.json` y los runs enlazados; no mostrar claves ni el
contenido de GitHub Secrets o dumps SQL.

1. **Plataforma y costo (30 s):** VM E5 Free Trial, 1 OCPU/8 GB/50 GB y promoción activa
   para el curso. Mostrar `https://msu-157-137-206-147.sslip.io` y el certificado válido.
2. **Flujo de entrega (60 s):** PR #8 integrado, seis jobs CI, CodeQL y ensayo RNF11
   aprobados; CD `43365661850` del mismo SHA `df8cc39`. Mostrar digests y revisión en VM.
3. **Ambientes y sesión (30 s):** archivos de perfiles sin secretos; navegación/login
   sobre HTTPS, cookie Secure/HttpOnly desde DevTools sin revelar su valor.
4. **Recuperación (60 s):** presentar el log del ensayo que pierde/restaura SQL y archivo,
   hash antes/después y evidencia de la copia externa. Usar el proyecto aislado para un
   ensayo en vivo; no provocar una pérdida durante la demostración compartida de producción.
5. **Usuario y responsive (30 s):** 32 capturas de roles y dos de `/sus/` a 360/1366,
   sin desbordes/5xx. Abrir el formulario publicado y explicar la entrega del CSV.
   Incorporar después las cinco sesiones SUS reales e indicar media, muestra y correcciones.

Compartir la URL y acordar turnos con los demás integrantes. Conservar una copia local
de la evidencia de la demo para mostrar el resultado si la VM gratuita no tiene capacidad
o está temporalmente fuera de servicio. Las sesiones reales, los ajustes administrativos
y la revisión de las cinco alertas del prototipo siguen pendientes en la bitácora.
