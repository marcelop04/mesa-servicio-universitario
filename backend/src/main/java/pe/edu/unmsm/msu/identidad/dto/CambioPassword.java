package pe.edu.unmsm.msu.identidad.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** HU03 · PUT /me/password: contraseña actual correcta, nueva válida y confirmación coincidente. */
public record CambioPassword(
        @NotBlank(message = "Ingrese su contraseña actual.") String actual,
        @NotBlank(message = "Ingrese la nueva contraseña.")
        @Size(min = 10, max = 64, message = "La nueva contraseña debe tener entre 10 y 64 caracteres.") String nueva,
        @NotBlank(message = "Confirme la nueva contraseña.") String confirmacion) {
}
