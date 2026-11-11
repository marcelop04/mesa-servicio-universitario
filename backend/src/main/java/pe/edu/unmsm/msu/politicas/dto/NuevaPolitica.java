package pe.edu.unmsm.msu.politicas.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * HU22 · POST /admin/politicas. La matriz completa (las cuatro prioridades) y, opcionalmente, la versión que el
 * administrador tenía a la vista: si otra persona publicó mientras tanto, se responde 409 POLITICA_DESACTUALIZADA.
 */
public record NuevaPolitica(
        @Schema(description = "Una fila por prioridad: CRITICA, ALTA, MEDIA y BAJA") List<Plazo> detalles,
        @Schema(description = "Versión vigente que se tomó como base", example = "1") Integer versionBase) {

    public record Plazo(@Schema(example = "ALTA") String prioridadCodigo,
                        @Schema(example = "8") Integer horasPrimeraAtencion,
                        @Schema(example = "48") Integer horasResolucion) {
    }
}
