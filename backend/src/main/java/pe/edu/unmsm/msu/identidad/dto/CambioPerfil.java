package pe.edu.unmsm.msu.identidad.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * HU03 · PUT /me: el usuario solo cambia su nombre. Cualquier otro campo (rol, área, correo) no
 * existe en este DTO y el servidor lo ignora (BDD 2: intento de elevar privilegios).
 */
public record CambioPerfil(
        @NotBlank(message = "Ingrese su nombre.")
        @Size(min = 2, max = 100, message = "El nombre debe tener entre 2 y 100 caracteres.") String nombre) {
}
