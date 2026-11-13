package pe.edu.unmsm.msu.seguridad;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
    private final Clock reloj;

    public LimpiezaRevocacionesServicio(RevocacionSesionRepositorio revocaciones, AuditoriaServicio auditoria,
                                        Clock reloj) {
        this.revocaciones = revocaciones;
        this.auditoria = auditoria;
        this.reloj = reloj;
    }

    /** Solo corre si msu.tareas.habilitadas es true (ver TareasConfig). Es idempotente. */
    @Transactional
    @Scheduled(fixedDelayString = "${msu.tareas.limpieza-sesiones:PT1H}", initialDelayString = "PT2M")
    public void programado() {
        limpiar(Instant.now(reloj));
    }

    /** Borra las revocaciones que vencieron antes de {@code ahora} menos el margen; devuelve cuántas. */
    @Transactional
    public int limpiar(Instant ahora) {
        int borradas = revocaciones.borrarVencidasAntesDe(ahora.minus(MARGEN));
        if (borradas > 0) {
            log.info("Limpieza de sesiones: {} revocaciones vencidas eliminadas.", borradas);
            auditoria.registrarComo(null, "TOKENS_LIMPIEZA", "SESION", null, Map.of("eliminadas", borradas));
        }
        return borradas;
    }
}
