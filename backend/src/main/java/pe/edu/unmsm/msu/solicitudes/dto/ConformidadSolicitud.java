package pe.edu.unmsm.msu.solicitudes.dto;

import jakarta.validation.constraints.NotNull;

/** HU12 · POST /solicitudes/{id}/conformidad. accion: CONFIRMAR o REABRIR (con motivo de 10 a 1000). */
public record ConformidadSolicitud(String accion, String motivo,
                                   @NotNull(message = "Falta la versión de la solicitud. Recargue los datos.")
                                   Integer version) {
}
