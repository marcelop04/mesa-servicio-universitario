package pe.edu.unmsm.msu.administracion.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Alta de técnico, supervisor o administrador (solo la administración crea roles internos). */
public record NuevoUsuarioInterno(
        @NotBlank(message = "Ingrese el nombre.")
        @Size(min = 2, max = 100, message = "El nombre debe tener entre 2 y 100 caracteres.") String nombre,
        @NotBlank(message = "Ingrese el correo.")
        @Email(message = "Ingrese un correo válido.")
        @Size(max = 254, message = "El correo es demasiado largo.") String correo,
        @NotBlank(message = "Ingrese una contraseña inicial.")
        @Size(min = 10, max = 64, message = "La contraseña debe tener entre 10 y 64 caracteres.") String password,
        @NotBlank(message = "Seleccione el rol.") String rol,
        Long areaId) {

    /** Se recortan los espacios externos antes de validar (sección 6.3); la contraseña se respeta tal cual. */
    public NuevoUsuarioInterno {
        nombre = nombre == null ? null : nombre.trim();
        correo = correo == null ? null : correo.trim();
        rol = rol == null ? null : rol.trim();
    }
}
