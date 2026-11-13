package pe.edu.unmsm.msu.comun.observabilidad;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Clock;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.repositorio.SolicitudRepositorio;

/**
 * Gestión de métricas personalizadas de negocio para Micrometer y Prometheus (D1).
 *
 * Expone:
 * <ul>
 *   <li>{@code msu_solicitudes_vencidas} (Gauge): número de solicitudes pendientes que superaron sus límites.</li>
 *   <li>{@code msu_solicitudes_creadas_total} (Counter): total acumulado de solicitudes registradas.</li>
 * </ul>
 */
@Component
public class MetricasMsuServicio {

    private static final Logger log = LoggerFactory.getLogger(MetricasMsuServicio.class);

    private final SolicitudRepositorio solicitudes;
    private final Clock reloj;
    private final Counter contadorCreadas;
    private final AtomicInteger casosVencidosForzados = new AtomicInteger(0);

    public MetricasMsuServicio(MeterRegistry registry, SolicitudRepositorio solicitudes, Clock reloj) {
        this.solicitudes = solicitudes;
        this.reloj = reloj;

        this.contadorCreadas = Counter.builder("msu.solicitudes.creadas")
                .description("Total de solicitudes universitarias registradas")
                .register(registry);

        Gauge.builder("msu.solicitudes.vencidas", this, MetricasMsuServicio::obtenerCasosVencidos)
                .description("Cantidad de solicitudes universitarias que han superado sus plazos máximos")
                .register(registry);
    }

    /** Incrementa el contador cada vez que un usuario registra una nueva solicitud (HU04). */
    public void registrarSolicitudCreada() {
        contadorCreadas.increment();
    }

    /**
     * Calcula dinámicamente las solicitudes vencidas para el scraping de Prometheus.
     * Si no hay conexión o se forzaron casos para una simulación/prueba, devuelve el valor respectivo.
     */
    @Transactional(readOnly = true)
    public double obtenerCasosVencidos() {
        int forzados = casosVencidosForzados.get();
        if (forzados > 0) {
            return forzados;
        }

        try {
            Instant ahora = Instant.now(reloj);
            long totalVencidas = 0;
            for (Solicitud s : solicitudes.findByEstado_CodigoIn(Solicitud.PENDIENTES)) {
                boolean atencionVencida = s.getPrimeraAtencionEn() == null
                        && s.getLimiteAtencion() != null
                        && !ahora.isBefore(s.getLimiteAtencion());
                boolean resolucionVencida = s.getLimiteResolucion() != null
                        && !ahora.isBefore(s.getLimiteResolucion());

                if (atencionVencida || resolucionVencida) {
                    totalVencidas++;
                }
            }
            return totalVencidas;
        } catch (Exception e) {
            log.warn("No se pudo calcular solicitudes vencidas para métricas: {}", e.getMessage());
            return 0;
        }
    }

    /**
     * Permite fijar un número de casos vencidos para demostrar las alertas en Prometheus durante la sustentación.
     */
    public void simularCasosVencidos(int cantidad) {
        this.casosVencidosForzados.set(Math.max(0, cantidad));
        log.info("Simulación de observabilidad: casos vencidos fijados en {}", cantidad);
    }
}

