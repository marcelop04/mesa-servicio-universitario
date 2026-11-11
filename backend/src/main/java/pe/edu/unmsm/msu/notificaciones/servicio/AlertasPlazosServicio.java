package pe.edu.unmsm.msu.notificaciones.servicio;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import pe.edu.unmsm.msu.identidad.entidad.Rol;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.repositorio.SolicitudRepositorio;

/**
 * HU15 · Detectar retrasos y escalar (RN07, RF18, RF20). Cada cinco minutos revisa los casos pendientes:
 * al consumir el 80 % de un plazo avisa al supervisor y al técnico asignado; al vencer, escala con otro aviso.
 * Revisa la primera atención mientras no se registre y la resolución siempre. Los avisos se deduplican por
 * solicitud, plazo, evento, destinatario y versión de fechas (RN10); los casos cancelados ya no avisan (RN09).
 */
@Service
public class AlertasPlazosServicio {

    private static final Logger log = LoggerFactory.getLogger(AlertasPlazosServicio.class);

    private final SolicitudRepositorio solicitudes;
    private final UsuarioRepositorio usuarios;
    private final Notificador notificador;
    private final TransactionTemplate transaccion;
    private final Clock reloj;

    public AlertasPlazosServicio(SolicitudRepositorio solicitudes, UsuarioRepositorio usuarios, Notificador notificador,
                                 PlatformTransactionManager tm, Clock reloj) {
        this.solicitudes = solicitudes;
        this.usuarios = usuarios;
        this.notificador = notificador;
        this.transaccion = new TransactionTemplate(tm);
        this.reloj = reloj;
    }

    /** Solo corre si msu.tareas.habilitadas es true (ver TareasConfig). */
    @Scheduled(fixedDelayString = "${msu.tareas.alertas-plazos:PT5M}", initialDelayString = "PT20S")
    public void programado() {
        int avisos = revisar(Instant.now(reloj));
        if (avisos > 0) {
            log.info("Revisión de plazos: {} avisos nuevos.", avisos);
        }
    }

    /** Devuelve cuántos avisos nuevos se crearon; repetir la revisión no los duplica. */
    public int revisar(Instant ahora) {
        Integer total = transaccion.execute(estado -> {
            List<Usuario> supervisores = usuarios.buscar(Rol.SUPERVISOR, true, null, Pageable.unpaged()).getContent();
            int creados = 0;
            for (Solicitud s : solicitudes.findByEstado_CodigoIn(Solicitud.PENDIENTES)) {
                List<Usuario> destino = new ArrayList<>(supervisores);
                if (s.getTecnico() != null && s.getTecnico().isActivo()) {
                    destino.add(s.getTecnico());
                }
                if (s.getPrimeraAtencionEn() == null) {
                    creados += evaluar(s, "ATENCION", "primera atención", s.getLimiteAtencion(), ahora, destino);
                }
                creados += evaluar(s, "RESOLUCION", "resolución", s.getLimiteResolucion(), ahora, destino);
            }
            return creados;
        });
        return total == null ? 0 : total;
    }

    private int evaluar(Solicitud s, String plazo, String nombre, Instant limite, Instant ahora, List<Usuario> destino) {
        String evento;
        String tipo;
        String texto;
        if (!ahora.isBefore(limite)) {
            evento = "VENCIDO";
            tipo = "VENCIMIENTO";
            texto = "La solicitud " + s.getCodigo() + " superó el plazo de " + nombre + ". Requiere intervención.";
        } else if (consumido80(s.getRegistradaEn(), limite, ahora)) {
            evento = "ALERTA_80";
            tipo = "ALERTA_PLAZO";
            texto = "La solicitud " + s.getCodigo() + " consumió el 80 % del plazo de " + nombre + ".";
        } else {
            return 0;
        }
        int creados = 0;
        for (Usuario u : destino) {
            String clave = "PLAZO:" + evento + ":" + plazo + ":" + s.getId() + ":" + u.getId() + ":v" + s.getVersionFechas();
            if (notificador.avisarUnaVez(u, s, tipo, texto, clave)) {
                creados++;
            }
        }
        return creados;
    }

    private static boolean consumido80(Instant inicio, Instant limite, Instant ahora) {
        long total = Duration.between(inicio, limite).toMillis();
        return total > 0 && Duration.between(inicio, ahora).toMillis() * 10 >= total * 8;
    }
}
