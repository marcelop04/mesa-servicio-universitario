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
 * Gestión de métricas de negocio para Micrometer y Prometheus (D1, D4).
 *
 * Separa estrictamente:
 * <ul>
 *   <li>{@code msu_solicitudes_vencidas}: medición operativa real calculada desde la base de datos.
 *       Si la consulta falla, devuelve {@link Double#NaN} para no confundir fallo de medición con 0 casos.</li>
 *   <li>{@code msu_solicitudes_vencidas_simuladas}: métrica aislada para simulacros de incidentes (D5).</li>
 *   <li>{@code msu_solicitudes_creadas_total}: contador acumulado de solicitudes registradas.</li>
 * </ul>
 */
@Component
public class MetricasMsuServicio {

    private static final Logger log = LoggerFactory.getLogger(MetricasMsuServicio.class);

    private final SolicitudRepositorio solicitudes;
    private final Clock reloj;
    private final Counter contadorCreadas;
    private final AtomicInteger casosSimulados = new AtomicInteger(0);

    public MetricasMsuServicio(MeterRegistry registry, SolicitudRepositorio solicitudes, Clock reloj) {
        this.solicitudes = solicitudes;
        this.reloj = reloj;

        this.contadorCreadas = Counter.builder("msu.solicitudes.creadas")
                .description("Total de solicitudes universitarias registradas")
                .register(registry);

        // Métrica Operativa Real
        Gauge.builder("msu.solicitudes.vencidas", this, MetricasMsuServicio::obtenerCasosVencidosReales)
                .description("Cantidad real de solicitudes universitarias que han superado sus plazos máximos")
                .register(registry);

        // Métrica de Simulación Aislada (para pruebas y simulacros de incidentes sin contaminar datos reales)
        Gauge.builder("msu.solicitudes.vencidas.simuladas", casosSimulados, AtomicInteger::doubleValue)
                .description("Casos vencidos inyectados artificialmente para el simulacro de alertas")
                .register(registry);
    }

    /** Incrementa el contador cuando se registra una nueva solicitud (HU04). */
    public void registrarSolicitudCreada() {
        contadorCreadas.increment();
    }

    /**
     * Calcula dinámicamente las solicitudes vencidas reales mediante un COUNT optimizado en base de datos.
     * En caso de error de acceso a datos, devuelve Double.NaN para indicar formalmente fallo de medición.
     */
    @Transactional(readOnly = true)
    public double obtenerCasosVencidosReales() {
        try {
            Instant ahora = Instant.now(reloj);
            return (double) solicitudes.contarVencidas(Solicitud.PENDIENTES, ahora);
        } catch (Exception e) {
            log.error("Fallo al calcular solicitudes vencidas en base de datos: error de medición.", e);
            // Devuelve NaN para que Prometheus reporte fallo de cálculo y no un falso cero
            return Double.NaN;
        }
    }

    /** Fija la métrica aislada de casos simulados (controlada exclusivamente por el entorno de simulación). */
    public void simularCasosVencidos(int cantidad) {
        int valorAjustado = Math.max(0, Math.min(cantidad, 100));
        this.casosSimulados.set(valorAjustado);
        log.info("Simulación de observabilidad: casos vencidos simulados fijados en {}", valorAjustado);
    }

    /** Devuelve el valor actual de casos vencidos simulados. */
    public double obtenerCasosSimulados() {
        return casosSimulados.get();
    }

    /** Restablece la simulación a 0 (recuperación de incidente). */
    public void restablecerSimulacion() {
        this.casosSimulados.set(0);
        log.info("Simulación de observabilidad: simulación restablecida a normalidad (0).");
    }
}
