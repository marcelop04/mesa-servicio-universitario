package pe.edu.unmsm.msu.solicitudes.servicio;

import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.catalogos.repositorio.EstadoRepositorio;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;
import pe.edu.unmsm.msu.solicitudes.entidad.EventoOperativo;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.repositorio.EventoOperativoRepositorio;
import pe.edu.unmsm.msu.solicitudes.repositorio.SolicitudRepositorio;

/**
 * MR03 · Servicio de transiciones con control de versión (HU24 BDD 2, RNF03).
 *
 * <p>Uso desde cualquier acción sobre una solicitud (registro, supervisión y atención), dentro de una
 * transacción del servicio que llama:
 * <pre>
 *   Solicitud s = transiciones.cargar(id, datos.version());          // 404 · 400 sin versión · 409 versión antigua
 *   transiciones.aplicar(s, Transicion.INICIAR_ATENCION, actorId, null, null);   // 409 si el origen no es válido
 *   return transiciones.guardar(s);                                   // incrementa la versión
 * </pre>
 * {@link #aplicar} cambia el estado, fija las fechas que la transición exige (primera atención,
 * resolución, cierre o cancelación) y registra un evento operativo por cada transición (HU23).
 * Si otra petición confirma antes un cambio sobre la misma fila, el control optimista de JPA
 * ({@code @Version}) también responde 409.
 */
@Service
@Transactional(propagation = Propagation.MANDATORY)
public class TransicionesServicio {

    public static final String CONFLICTO_VERSION = "CONFLICTO_VERSION";
    public static final String TRANSICION_INVALIDA = "TRANSICION_INVALIDA";

    private final SolicitudRepositorio solicitudes;
    private final EstadoRepositorio estados;
    private final EventoOperativoRepositorio eventos;
    private final UsuarioRepositorio usuarios;
    private final Clock reloj;

    public TransicionesServicio(SolicitudRepositorio solicitudes, EstadoRepositorio estados,
                                EventoOperativoRepositorio eventos, UsuarioRepositorio usuarios, Clock reloj) {
        this.solicitudes = solicitudes;
        this.estados = estados;
        this.eventos = eventos;
        this.usuarios = usuarios;
        this.reloj = reloj;
    }

    /** Carga la solicitud y comprueba que el cliente trabaja sobre su última versión. */
    public Solicitud cargar(long id, Integer versionEsperada) {
        if (versionEsperada == null) {
            throw ExcepcionApi.datoInvalido("version", "Falta la versión de la solicitud. Recargue los datos.");
        }
        Solicitud s = solicitudes.findConDetalleById(id)
                .orElseThrow(() -> ExcepcionApi.noEncontrado("La solicitud no existe."));
        exigirVersion(s, versionEsperada);
        return s;
    }

    public void exigirVersion(Solicitud s, int versionEsperada) {
        if (s.getVersion() != versionEsperada) {
            throw ExcepcionApi.conflicto(CONFLICTO_VERSION, "Otro usuario modificó la solicitud " + s.getCodigo()
                    + ". Recargue y revise el cambio antes de continuar.");
        }
    }

    /** Rechaza la operación (409) si la solicitud no está en uno de los estados indicados. */
    public void exigirEstado(Solicitud s, Set<String> permitidos, String mensaje) {
        if (!permitidos.contains(s.getEstadoCodigo())) {
            throw ExcepcionApi.conflicto(TRANSICION_INVALIDA, mensaje);
        }
    }

    /**
     * Aplica una transición de la tabla 4 y registra su evento con el estado anterior y el nuevo,
     * más los datos adicionales que indique quien llama.
     *
     * @param actorId nulo solo en acciones automáticas del sistema (cierre a las 72 horas)
     */
    public EventoOperativo aplicar(Solicitud s, Transicion transicion, Long actorId, String motivo,
                                   Map<String, Object> datosNuevos) {
        String origen = s.getEstadoCodigo();
        if (!transicion.permitidaDesde(origen)) {
            throw ExcepcionApi.conflicto(TRANSICION_INVALIDA, "No se puede " + verbo(transicion)
                    + " una solicitud en estado " + s.getEstado().getNombreVisible() + ".");
        }
        Instant ahora = Instant.now(reloj);
        switch (transicion) {
            case INICIAR_ATENCION -> s.registrarPrimeraAtencion(ahora);
            case RESOLVER -> s.registrarResolucion(ahora);
            case CONFIRMAR, CERRAR_AUTOMATICO -> s.registrarCierre(ahora);
            case CANCELAR -> s.registrarCancelacion(ahora);
            default -> {
                // Evaluar, asignar y reabrir no fijan fechas (RN06: reabrir conserva la primera atención).
            }
        }
        s.cambiarEstado(estados.getReferenceById(transicion.getDestino()));

        Map<String, Object> anterior = new LinkedHashMap<>();
        anterior.put("estado_codigo", origen);
        Map<String, Object> nuevo = new LinkedHashMap<>();
        nuevo.put("estado_codigo", transicion.getDestino());
        if (datosNuevos != null) {
            nuevo.putAll(datosNuevos);
        }
        return registrarEvento(s, actorId, transicion.name(), anterior, nuevo, motivo);
    }

    /** Evento operativo para cambios que no son transiciones (prioridad, categoría, reasignación). */
    public EventoOperativo registrarEvento(Solicitud s, Long actorId, String accion, Map<String, Object> anterior,
                                           Map<String, Object> nuevo, String motivo) {
        Usuario actor = actorId == null ? null : usuarios.getReferenceById(actorId);
        return eventos.save(new EventoOperativo(s, actor, accion, anterior, nuevo, motivo, Instant.now(reloj)));
    }

    /** Guarda y sincroniza con la base para devolver la versión nueva en la respuesta. */
    public Solicitud guardar(Solicitud s) {
        return solicitudes.saveAndFlush(s);
    }

    private static String verbo(Transicion t) {
        return switch (t) {
            case EVALUAR -> "iniciar la evaluación de";
            case ASIGNAR -> "asignar";
            case INICIAR_ATENCION -> "iniciar la atención de";
            case RESOLVER -> "resolver";
            case CONFIRMAR -> "confirmar";
            case REABRIR, REABRIR_SIN_TECNICO -> "reabrir";
            case CERRAR_AUTOMATICO -> "cerrar";
            case CANCELAR -> "cancelar";
        };
    }
}
