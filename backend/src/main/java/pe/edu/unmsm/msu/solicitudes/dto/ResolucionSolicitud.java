package pe.edu.unmsm.msu.solicitudes.dto;

import jakarta.validation.constraints.NotNull;

/** HU10 y HU11. Iniciar solo envía la versión; resolver envía además la solución (20 a 2000 caracteres). */
public record ResolucionSolicitud(String solucion,
                                  @NotNull(message = "Falta la versión de la solicitud. Recargue los datos.")
                                  Integer version) {
}
