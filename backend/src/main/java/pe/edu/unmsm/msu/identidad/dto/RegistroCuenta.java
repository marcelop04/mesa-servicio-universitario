package pe.edu.unmsm.msu.identidad.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * HU01 · POST /auth/registro. El rol no se recibe: el registro público siempre crea solicitantes
 * (sección 3.1). Un campo "rol" enviado por el cliente se ignora.
 */
public record RegistroCuenta(
        @NotBlank(message = "Ingrese su nombre.")
        @Size(min = 2, max = 100, message = "El nombre debe tener entre 2 y 100 caracteres.") String nombre,
        @NotBlank(message = "Ingrese su correo.") @Email(message = "Ingrese un correo válido.")
        @Size(max = 254, message = "El correo es demasiado largo.") String correo,
        @NotBlank(message = "Ingrese una contraseña.")
        @Size(min = 10, max = 64, message = "La contraseña debe tener entre 10 y 64 caracteres.") String password,
        @NotBlank(message = "Seleccione su vínculo con la universidad.")
        @Pattern(regexp = "ESTUDIANTE|DOCENTE|ADMINISTRATIVO", message = "Vínculo no válido: Estudiante, Docente o Administrativo.")
        String vinculo) {

    /** Se recortan espacios externos antes de validar (sección 6.3). */
    public RegistroCuenta {
        nombre = nombre == null ? null : nombre.trim();
        correo = correo == null ? null : correo.trim();
    }
}
