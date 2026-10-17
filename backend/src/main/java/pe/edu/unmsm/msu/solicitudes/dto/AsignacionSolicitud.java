package pe.edu.unmsm.msu.solicitudes.dto;

import jakarta.validation.constraints.NotNull;

/** HU08 · POST /solicitudes/{id}/asignaciones. El motivo es obligatorio solo al reasignar. */
public record AsignacionSolicitud(@NotNull(message = "Seleccione un técnico.") Long tecnicoId, String motivo,
                                  @NotNull(message = "Falta la versión de la solicitud. Recargue los datos.")
                                  Integer version) {
}
