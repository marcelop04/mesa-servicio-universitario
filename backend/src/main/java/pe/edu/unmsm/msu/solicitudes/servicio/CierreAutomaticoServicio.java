package pe.edu.unmsm.msu.solicitudes.servicio;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import pe.edu.unmsm.msu.notificaciones.servicio.Notificador;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.repositorio.SolicitudRepositorio;

/**
 * EM03 · HU12 Cierre automático a las 72 horas de la última resolución (RN08, RNF07).
 * Se ejecuta cada cinco minutos y cierra cada caso en su propia transacción. Es idempotente:
 * repetir la revisión no duplica cierres, porque solo toma casos que siguen Resueltos, y si el
 * solicitante actúa al mismo tiempo el control de versión deja pasar solo una de las dos operaciones.
 */
@Service
public class CierreAutomaticoServicio {

    private static final Logger log = LoggerFactory.getLogger(CierreAutomaticoServicio.class);

    private final SolicitudRepositorio solicitudes;
    private final TransicionesServicio transiciones;
    private final Notificador notificador;
    private final TransactionTemplate transaccion;
    private final Clock reloj;

    public CierreAutomaticoServicio(SolicitudRepositorio solicitudes, TransicionesServicio transiciones,
                                    Notificador notificador, PlatformTransactionManager tm, Clock reloj) {
        this.solicitudes = solicitudes;
        this.transiciones = transiciones;
        this.notificador = notificador;
        this.transaccion = new TransactionTemplate(tm);
        this.reloj = reloj;
    }

    /** Solo corre si msu.tareas.habilitadas es true (ver TareasConfig). */
    @Scheduled(fixedDelayString = "${msu.tareas.cierre-automatico:PT5M}", initialDelayString = "PT1M")
    public void programado() {
        int cerradas = cerrarVencidas(Instant.now(reloj));
        if (cerradas > 0) {
            log.info("Cierre automático: {} solicitudes cerradas tras 72 horas sin respuesta.", cerradas);
        }
    }

    /** Cierra las solicitudes Resueltas cuya ventana de conformidad terminó antes de {@code ahora}. */
    public int cerrarVencidas(Instant ahora) {
        List<Long> ids = solicitudes.idsResueltasAntesDe(ahora.minus(AtencionServicio.VENTANA_CONFORMIDAD));
        int cerradas = 0;
        for (Long id : ids) {
            try {
                Boolean cerrada = transaccion.execute(estado -> cerrar(id));
                if (Boolean.TRUE.equals(cerrada)) {
                    cerradas++;
                }
            } catch (OptimisticLockingFailureException e) {
                log.info("La solicitud {} cambió durante el cierre automático; se revisará en la próxima ejecución.", id);
            }
        }
        return cerradas;
    }

    private boolean cerrar(long id) {
        Solicitud s = solicitudes.findConDetalleById(id).orElse(null);
        if (s == null || !Solicitud.RESUELTA.equals(s.getEstadoCodigo())) {
            return false;
        }
        transiciones.aplicar(s, Transicion.CERRAR_AUTOMATICO, null,
                "Cierre automático: sin respuesta del solicitante en 72 horas.", null);
        transiciones.guardar(s);
        notificador.avisar(s.getSolicitante(), -1, s, "CIERRE",
                "La solicitud " + s.getCodigo() + " se cerró automáticamente tras 72 horas sin respuesta.");
        return true;
    }
}
