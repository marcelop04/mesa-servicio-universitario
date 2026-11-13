package pe.edu.unmsm.msu.comun.observabilidad;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controlador auxiliar de diagnóstico para el simulacro de incidentes (RNF08, D4, D5).
 * Permite reproducir fallas controladas, latencia y alertas para su verificación en Prometheus, Jaeger y Grafana.
 */
@Tag(name = "Diagnóstico y Observabilidad", description = "Endpoints de verificación y simulación de incidentes RNF08")
@RestController
@RequestMapping("/api/v1/diagnostico")
public class DiagnosticoObservabilidadControlador {

    private static final Logger log = LoggerFactory.getLogger(DiagnosticoObservabilidadControlador.class);

    private final MetricasMsuServicio metricas;

    public DiagnosticoObservabilidadControlador(MetricasMsuServicio metricas) {
        this.metricas = metricas;
    }

    @Operation(summary = "Petición exitosa para verificar trazas y logs")
    @GetMapping("/exito")
    public ResponseEntity<Map<String, Object>> exito() {
        log.info("Diagnóstico MSU: Petición procesada correctamente.");
        return ResponseEntity.ok(Map.of(
                "estado", "OK",
                "mensaje", "Petición exitosa registrada con observabilidad."
        ));
    }

    @Operation(summary = "Simular error HTTP 500 para verificar alerta de errores en Prometheus")
    @GetMapping("/simular-error-500")
    public ResponseEntity<Map<String, Object>> simularError() {
        log.error("Diagnóstico MSU: Simulando excepción interna no controlada (error 500) para prueba de incidente RNF08.");
        throw new RuntimeException("Simulacro de falla interna en la Mesa de Servicios Universitarios.");
    }

    @Operation(summary = "Simular latencia alta (> 1s) para verificar trazas en Jaeger y alerta p95 en Prometheus")
    @GetMapping("/simular-latencia")
    public ResponseEntity<Map<String, Object>> simularLatencia(
            @RequestParam(name = "milisegundos", defaultValue = "1500") long milisegundos) {
        log.warn("Diagnóstico MSU: Iniciando retardo artificial de {} ms.", milisegundos);
        try {
            Thread.sleep(milisegundos);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        log.info("Diagnóstico MSU: Retardo artificial concluido.");
        return ResponseEntity.ok(Map.of(
                "estado", "OK",
                "latencia_ms", milisegundos,
                "mensaje", "Retardo completado satisfactoriamente."
        ));
    }

    @Operation(summary = "Simular casos vencidos para disparar la alerta de solicitudes vencidas")
    @RequestMapping(value = "/simular-vencidas", method = {RequestMethod.POST, RequestMethod.GET})
    public ResponseEntity<Map<String, Object>> simularVencidas(
            @RequestParam(name = "cantidad", defaultValue = "1") int cantidad) {
        metricas.simularCasosVencidos(cantidad);
        log.warn("Diagnóstico MSU: Cantidad de solicitudes vencidas simulada en {}", cantidad);
        return ResponseEntity.ok(Map.of(
                "estado", "OK",
                "casos_vencidos_simulados", cantidad,
                "mensaje", "Métrica de casos vencidos actualizada para Prometheus."
        ));
    }
}

