package pe.edu.unmsm.msu.solicitudes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * HU04 · POST /solicitudes. El código, el solicitante, la fecha, la prioridad y los límites los
 * fija el servidor; aquí solo llegan los datos que el solicitante elige (tabla 16).
 */
public record NuevaSolicitud(
        @NotNull(message = "Selecciona la categoría del problema.") Long categoriaId,
        @NotNull(message = "Selecciona la ubicación donde ocurre el problema.") Long ubicacionId,
        @Size(max = 200, message = "La referencia admite hasta 200 caracteres.") String referencia,
        @NotBlank(message = "Describe el problema (entre 20 y 2000 caracteres).") String descripcion,
        @NotBlank(message = "Indica el impacto: Alto, Medio o Bajo.") String impacto,
        @NotBlank(message = "Indica la urgencia: Alta, Media o Baja.") String urgencia) {
}
