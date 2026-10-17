package pe.edu.unmsm.msu.administracion.dto;

import jakarta.validation.constraints.Size;

/** Cambios sobre una cuenta; un campo nulo conserva el valor actual. */
public record CambioUsuario(
        @Size(min = 2, max = 100, message = "El nombre debe tener entre 2 y 100 caracteres.") String nombre,
        String rol,
        Long areaId,
        Boolean activo) {

    public CambioUsuario {
        nombre = nombre == null ? null : nombre.trim();
    }
}
