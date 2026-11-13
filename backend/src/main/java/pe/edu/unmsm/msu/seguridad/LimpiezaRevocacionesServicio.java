package pe.edu.unmsm.msu.seguridad;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import pe.edu.unmsm.msu.auditoria.servicio.AuditoriaServicio;
import pe.edu.unmsm.msu.identidad.repositorio.RevocacionSesionRepositorio;

/**
 * HU02 · Limpieza periódica de tokens revocados ya vencidos (Emanuel, fase III).
 * Un token revocado solo necesita su fila mientras siga vigente: después, {@link FiltroJwt} lo rechaza por su
 * fecha de expiración. Borrar esas filas mantiene pequeña la tabla que se consulta en cada petición.
 * Se deja un margen de cinco minutos por posibles diferencias de reloj entre servidores.
 */
@Service
public class LimpiezaRevocacionesServicio {

    static final Duration MARGEN = Duration.ofMinutes(5);
    private static final Logger log = LoggerFactory.getLogger(LimpiezaRevocacionesServicio.class);

    private final RevocacionSesionRepositorio revocaciones;
    private final AuditoriaServicio auditoria;
    private final TransactionTemplate transaccion;
    private final Clock reloj;

    public LimpiezaRevocacionesServicio(RevocacionSesionRepositorio revocaciones, AuditoriaServicio auditoria,
                                        PlatformTransactionManager tm, Clock reloj) {
        this.transaccion = new TransactionTemplate(tm);
        this.revocaciones = revocaciones;
        this.auditoria = auditoria;
        this.reloj = reloj;
    }

    /** Solo corre si msu.tareas.habilitadas es true (ver TareasConfig). Es idempotente. */
    @Scheduled(fixedDelayString = "${msu.tareas.limpieza-sesiones:PT1H}", initialDelayString = "PT2M")
    public void programado() {
        limpiar(Instant.now(reloj));
    }

    /**
     * Borra las revocaciones que vencieron antes de {@code ahora} menos el margen; devuelve cuántas.
     * La transacción se abre de forma explícita: {@link #programado()} llama a este método desde la misma
     * clase, y una anotación {@code @Transactional} no se aplicaría en esa llamada interna.
     */
    public int limpiar(Instant ahora) {
        Integer borradas = transaccion.execute(estado -> {
            int n = revocaciones.borrarVencidasAntesDe(ahora.minus(MARGEN));
            if (n > 0) {
                auditoria.registrarComo(null, "TOKENS_LIMPIEZA", "SESION", null, Map.of("eliminadas", n));
            }
            return n;
        });
        if (borradas != null && borradas > 0) {
            log.info("Limpieza de sesiones: {} revocaciones vencidas eliminadas.", borradas);
        }
        return borradas == null ? 0 : borradas;
    }
}
