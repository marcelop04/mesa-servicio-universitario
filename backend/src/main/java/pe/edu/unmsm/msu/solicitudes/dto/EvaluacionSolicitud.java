package pe.edu.unmsm.msu.solicitudes.dto;

import jakarta.validation.constraints.NotNull;

/**
 * HU07 · POST /solicitudes/{id}/evaluacion. Desde Registrada inicia la evaluación; además puede
 * corregir impacto, urgencia o categoría. Cualquier corrección exige motivo de 10 a 1000 caracteres.
 * Los campos omitidos conservan su valor actual.
 */
public record EvaluacionSolicitud(String impacto, String urgencia, Long categoriaId, String motivo,
                                  @NotNull(message = "Falta la versión de la solicitud. Recargue los datos.")
                                  Integer version) {
}
