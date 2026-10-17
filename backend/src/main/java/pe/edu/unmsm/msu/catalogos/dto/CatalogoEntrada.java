package pe.edu.unmsm.msu.catalogos.dto;

import jakarta.validation.constraints.Size;

/**
 * Datos para crear o actualizar una opción. Qué campos son obligatorios depende del tipo:
 * áreas y categorías usan {@code nombre} (categorías además {@code area_id}); ubicaciones,
 * {@code edificio} y {@code ambiente}; estados y prioridades solo admiten cambiar {@code nombre}.
 * En una actualización, un campo nulo conserva el valor actual.
 */
public record CatalogoEntrada(
        @Size(max = 100, message = "Use como máximo 100 caracteres.") String nombre,
        Long areaId,
        @Size(max = 100, message = "Use como máximo 100 caracteres.") String edificio,
        @Size(max = 100, message = "Use como máximo 100 caracteres.") String ambiente,
        Boolean activo) {
}
