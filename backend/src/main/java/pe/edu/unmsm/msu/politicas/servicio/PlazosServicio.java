package pe.edu.unmsm.msu.politicas.servicio;

import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;
import pe.edu.unmsm.msu.politicas.entidad.Politica;
import pe.edu.unmsm.msu.politicas.repositorio.PoliticaRepositorio;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;

/**
 * MR02 · HU14 Calcular los plazos del caso.
 *
 * <ul>
 *   <li>Al registrar, la solicitud guarda la política vigente y una copia de su matriz (RN04).</li>
 *   <li>Los límites se calculan desde el registro en horas corridas (RN01, RN02).</li>
 *   <li>Cambiar la prioridad recalcula desde el registro original con la matriz guardada en el caso,
 *       nunca con la política global (RN05). Publicar otra política no altera casos existentes.</li>
 * </ul>
 * Alex (AX01) lo usa al registrar; Marcelo (MR04) al cambiar la prioridad.
 */
@Service
public class PlazosServicio {

    private final PoliticaRepositorio politicas;
    private final Clock reloj;

    public PlazosServicio(PoliticaRepositorio politicas, Clock reloj) {
        this.politicas = politicas;
        this.reloj = reloj;
    }

    /** Política vigente para nuevas altas. Sin política publicada no se pueden registrar solicitudes. */
    @Transactional(readOnly = true)
    public Politica politicaVigente() {
        return politicas.findFirstByVigenteDesdeLessThanEqualOrderByVersionDesc(Instant.now(reloj))
                .orElseThrow(() -> ExcepcionApi.conflicto("SIN_POLITICA",
                        "No hay una política de plazos publicada. El administrador debe publicarla."));
    }

    /** Copia la política vigente en la solicitud y calcula sus límites iniciales (HU14 BDD 1). */
    @Transactional(readOnly = true)
    public void aplicarPoliticaVigente(Solicitud solicitud) {
        Politica politica = politicaVigente();
        Map<String, Map<String, Integer>> matriz = MatrizAplicada.de(politica);
        Plazo plazo = MatrizAplicada.plazoDe(matriz, solicitud.getPrioridadCodigo());
        solicitud.aplicarPolitica(politica, matriz, plazo.limiteAtencion(solicitud.getRegistradaEn()),
                plazo.limiteResolucion(solicitud.getRegistradaEn()));
    }

    /**
     * RN05: nueva prioridad y límites calculados desde el registro original con la matriz guardada.
     * Devuelve los límites sin modificar la solicitud, para que el llamador registre anterior y nuevo.
     */
    public Limites recalcular(Solicitud solicitud, String nuevaPrioridad) {
        Plazo plazo = MatrizAplicada.plazoDe(solicitud.getMatrizAplicada(), nuevaPrioridad);
        return new Limites(nuevaPrioridad, plazo.limiteAtencion(solicitud.getRegistradaEn()),
                plazo.limiteResolucion(solicitud.getRegistradaEn()));
    }

    public record Limites(String prioridad, Instant limiteAtencion, Instant limiteResolucion) {

        public static Limites de(Solicitud s) {
            return new Limites(s.getPrioridadCodigo(), s.getLimiteAtencion(), s.getLimiteResolucion());
        }

        public Map<String, Object> comoMapa() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("prioridad_codigo", prioridad);
            m.put("limite_atencion", limiteAtencion.toString());
            m.put("limite_resolucion", limiteResolucion.toString());
            return m;
        }
    }
}
