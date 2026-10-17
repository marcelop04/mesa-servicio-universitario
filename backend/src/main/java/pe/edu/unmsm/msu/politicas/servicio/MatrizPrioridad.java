package pe.edu.unmsm.msu.politicas.servicio;

import java.util.List;
import java.util.Map;

/**
 * Tabla 5 del informe: la prioridad sale de cruzar impacto y urgencia.
 * Es la misma matriz que usan el prototipo (reglas.js) y el frontend React.
 */
public final class MatrizPrioridad {

    public static final List<String> IMPACTOS = List.of("ALTO", "MEDIO", "BAJO");
    public static final List<String> URGENCIAS = List.of("ALTA", "MEDIA", "BAJA");
    public static final List<String> PRIORIDADES = List.of("CRITICA", "ALTA", "MEDIA", "BAJA");

    private static final Map<String, Map<String, String>> MATRIZ = Map.of(
            "ALTO", Map.of("ALTA", "CRITICA", "MEDIA", "ALTA", "BAJA", "MEDIA"),
            "MEDIO", Map.of("ALTA", "ALTA", "MEDIA", "MEDIA", "BAJA", "BAJA"),
            "BAJO", Map.of("ALTA", "MEDIA", "MEDIA", "BAJA", "BAJA", "BAJA"));

    private MatrizPrioridad() {
    }

    public static boolean impactoValido(String impacto) {
        return impacto != null && IMPACTOS.contains(impacto);
    }

    public static boolean urgenciaValida(String urgencia) {
        return urgencia != null && URGENCIAS.contains(urgencia);
    }

    /** Código de prioridad resultante; lanza IllegalArgumentException si algún dato no es válido. */
    public static String calcular(String impacto, String urgencia) {
        if (!impactoValido(impacto) || !urgenciaValida(urgencia)) {
            throw new IllegalArgumentException("Impacto o urgencia no válidos: " + impacto + ", " + urgencia);
        }
        return MATRIZ.get(impacto).get(urgencia);
    }
}
