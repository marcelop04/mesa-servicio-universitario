package pe.edu.unmsm.msu.solicitudes.servicio;

import java.time.Duration;
import java.time.Instant;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;

/**
 * Situación de los plazos de un caso pendiente (RN07): vencido, al 80 % o en plazo.
 * Se consideran los relojes que siguen corriendo: la primera atención mientras no se registre
 * y la resolución siempre. Un caso que ya no está pendiente no tiene nivel.
 */
public final class NivelPlazo {

    public static final String VENCIDA = "VENCIDA";
    public static final String ALERTA = "ALERTA";
    public static final String EN_PLAZO = "EN_PLAZO";

    private NivelPlazo() {
    }

    public static String de(Solicitud s, Instant ahora) {
        if (!s.esPendiente()) {
            return null;
        }
        boolean atencionPendiente = s.getPrimeraAtencionEn() == null;
        if (ahora.isAfter(s.getLimiteResolucion()) || atencionPendiente && ahora.isAfter(s.getLimiteAtencion())) {
            return VENCIDA;
        }
        if (consumido80(s.getRegistradaEn(), s.getLimiteResolucion(), ahora)
                || atencionPendiente && consumido80(s.getRegistradaEn(), s.getLimiteAtencion(), ahora)) {
            return ALERTA;
        }
        return EN_PLAZO;
    }

    private static boolean consumido80(Instant inicio, Instant limite, Instant ahora) {
        long total = Duration.between(inicio, limite).toMillis();
        long transcurrido = Duration.between(inicio, ahora).toMillis();
        return total > 0 && transcurrido * 10 >= total * 8;
    }
}
