package pe.edu.unmsm.msu.politicas.dto;

import java.time.Instant;
import java.util.List;

/** HU22 · Versión publicada de la política de plazos, con su uso en solicitudes existentes. */
public record PoliticaVista(Long id, int version, Instant vigenteDesde, String publicadaPor, boolean vigente,
                            long solicitudes, List<Detalle> detalles) {

    public record Detalle(String prioridadCodigo, String prioridadNombre, int horasPrimeraAtencion,
                          int horasResolucion) {
    }
}
