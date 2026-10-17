package pe.edu.unmsm.msu.politicas.servicio;

import java.time.Duration;
import java.time.Instant;

/** Horas de primera atención y de resolución de una prioridad (tabla 6). */
public record Plazo(int horasPrimeraAtencion, int horasResolucion) {

    public Plazo {
        if (horasPrimeraAtencion <= 0 || horasPrimeraAtencion > horasResolucion) {
            throw new IllegalArgumentException("Plazo incoherente: " + horasPrimeraAtencion + " / " + horasResolucion);
        }
    }

    /** RN01 y RN02: ambos relojes empiezan al registrar y cuentan horas corridas. */
    public Instant limiteAtencion(Instant registradaEn) {
        return registradaEn.plus(Duration.ofHours(horasPrimeraAtencion));
    }

    public Instant limiteResolucion(Instant registradaEn) {
        return registradaEn.plus(Duration.ofHours(horasResolucion));
    }
}
