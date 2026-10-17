package pe.edu.unmsm.msu.solicitudes.dto;

import jakarta.validation.constraints.NotNull;

/**
 * HU09 · POST /solicitudes/{id}/cancelacion. Motivo de 10 a 1000 caracteres; si es un duplicado,
 * el código del caso original (existente y distinto del propio).
 */
public record CancelacionSolicitud(String motivo, boolean duplicado, String codigoOriginal,
                                   @NotNull(message = "Falta la versión de la solicitud. Recargue los datos.")
                                   Integer version) {
}
