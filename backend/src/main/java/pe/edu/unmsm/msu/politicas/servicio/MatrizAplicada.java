package pe.edu.unmsm.msu.politicas.servicio;

import java.util.LinkedHashMap;
import java.util.Map;
import pe.edu.unmsm.msu.politicas.entidad.DetallePolitica;
import pe.edu.unmsm.msu.politicas.entidad.Politica;

/**
 * RN04: copia de la política completa que se guarda en cada solicitud (columna JSON matriz_aplicada).
 * Formato igual al del prototipo: {"CRITICA": {"horas_primera_atencion": 4, "horas_resolucion": 24}, ...}.
 */
public final class MatrizAplicada {

    public static final String HORAS_ATENCION = "horas_primera_atencion";
    public static final String HORAS_RESOLUCION = "horas_resolucion";

    private MatrizAplicada() {
    }

    public static Map<String, Map<String, Integer>> de(Politica politica) {
        Map<String, Map<String, Integer>> matriz = new LinkedHashMap<>();
        for (String prioridad : MatrizPrioridad.PRIORIDADES) {
            DetallePolitica d = politica.getDetalles().stream()
                    .filter(x -> x.getPrioridadCodigo().equals(prioridad)).findFirst()
                    .orElseThrow(() -> new IllegalStateException(
                            "La política v" + politica.getVersion() + " no define la prioridad " + prioridad));
            Map<String, Integer> horas = new LinkedHashMap<>();
            horas.put(HORAS_ATENCION, d.getHorasPrimeraAtencion());
            horas.put(HORAS_RESOLUCION, d.getHorasResolucion());
            matriz.put(prioridad, horas);
        }
        return matriz;
    }

    public static Plazo plazoDe(Map<String, Map<String, Integer>> matriz, String prioridad) {
        Map<String, ? extends Number> horas = matriz.get(prioridad);
        if (horas == null) {
            throw new IllegalStateException("La matriz aplicada no define la prioridad " + prioridad);
        }
        return new Plazo(horas.get(HORAS_ATENCION).intValue(), horas.get(HORAS_RESOLUCION).intValue());
    }
}
