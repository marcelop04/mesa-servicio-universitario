package pe.edu.unmsm.msu.comun.observabilidad;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controlador de simulación para pruebas de observabilidad y simulacro de incidentes (RNF08, D4, D5).
 *
 * <p>Seguridad y control:
 * <ul>
 *   <li>Desactivado por defecto. Solo se inicializa si {@code msu.simulacion.habilitada=true}.</li>
 *   <li>Todas las mutaciones de estado se restringen exclusivamente al método HTTP POST.</li>
 *   <li>Los parámetros tienen límites estrictos (latencia máxima 5000 ms, casos simulados entre 0 y 100).</li>
 * </ul>
 */
@Tag(name = "Diagnóstico y Observabilidad (Simulacro)", description = "Controlador condicionado a msu.simulacion.habilitada=true")
@RestController
@RequestMapping("/api/v1/diagnostico")
@ConditionalOnProperty(name = "msu.simulacion.habilitada", havingValue = "true")
public class DiagnosticoObservabilidadControlador {

    private static final Logger log = LoggerFactory.getLogger(DiagnosticoObservabilidadControlador.class);
    private static final long LATENCIA_MIN_MS = 100;
    private static final long LATENCIA_MAX_MS = 5000;
    private static final int VENCIDAS_MIN = 0;
    private static final int VENCIDAS_MAX = 100;

    private final MetricasMsuServicio metricas;

    public DiagnosticoObservabilidadControlador(MetricasMsuServicio metricas) {
        this.metricas = metricas;
    }

    @Operation(summary = "Consultar el estado actual del entorno de simulación")
    @GetMapping("/estado")
    public ResponseEntity<Map<String, Object>> estado() {
        return ResponseEntity.ok(Map.of(
                "simulacion_activa", true,
                "casos_vencidos_simulados", metricas.obtenerCasosSimulados(),
                "mensaje", "Entorno de diagnóstico y simulacro RNF08 habilitado."
        ));
    }

    @Operation(summary = "Petición exitosa para verificar trazas y logs estructurados")
    @GetMapping("/exito")
    public ResponseEntity<Map<String, Object>> exito() {
        log.info("Diagnóstico MSU: Petición de verificación procesada correctamente.");
        return ResponseEntity.ok(Map.of(
                "estado", "OK",
                "mensaje", "Petición exitosa registrada con observabilidad."
        ));
    }

    @Operation(summary = "Simular error HTTP 500 para verificar alerta de errores en Prometheus")
    @PostMapping("/simular-error-500")
    public ResponseEntity<Map<String, Object>> simularError() {
        log.error("Diagnóstico MSU: Simulando excepción interna no controlada (error 500) para prueba de incidente RNF08.");
        throw new RuntimeException("Simulacro de falla interna en la Mesa de Servicios Universitarios.");
    }

    @Operation(summary = "Simular latencia controlada (100 a 5000 ms) para verificar trazas en Jaeger y p95")
    @PostMapping("/simular-latencia")
    public ResponseEntity<Map<String, Object>> simularLatencia(
            @RequestParam(name = "milisegundos", defaultValue = "1500") long milisegundos) {
        if (milisegundos < LATENCIA_MIN_MS || milisegundos > LATENCIA_MAX_MS) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Parámetro inválido",
                    "mensaje", "La latencia debe estar comprendida entre " + LATENCIA_MIN_MS + " y " + LATENCIA_MAX_MS + " ms."
            ));
        }

        log.warn("Diagnóstico MSU: Iniciando retardo artificial controlado de {} ms.", milisegundos);
        try {
            Thread.sleep(milisegundos);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        log.info("Diagnóstico MSU: Retardo artificial concluido.");
        return ResponseEntity.ok(Map.of(
                "estado", "OK",
                "latencia_ms", milisegundos,
                "mensaje", "Retardo artificial completado satisfactoriamente."
        ));
    }

    @Operation(summary = "Simular casos vencidos (0 a 100) para activar alerta en Prometheus y Grafana")
    @PostMapping("/simular-vencidas")
    public ResponseEntity<Map<String, Object>> simularVencidas(
            @RequestParam(name = "cantidad", defaultValue = "1") int cantidad) {
        if (cantidad < VENCIDAS_MIN || cantidad > VENCIDAS_MAX) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Parámetro inválido",
                    "mensaje", "La cantidad debe estar entre " + VENCIDAS_MIN + " y " + VENCIDAS_MAX + "."
            ));
        }

        metricas.simularCasosVencidos(cantidad);
        log.warn("Diagnóstico MSU: Métrica de casos vencidos simulados fijada en {}", cantidad);
        return ResponseEntity.ok(Map.of(
                "estado", "OK",
                "casos_vencidos_simulados", cantidad,
                "mensaje", "Métrica de casos simulados actualizada para Prometheus."
        ));
    }

    @Operation(summary = "Restablecer simulación a la normalidad (mitigación y recuperación del incidente)")
    @PostMapping("/simular-recuperacion")
    public ResponseEntity<Map<String, Object>> simularRecuperacion() {
        metricas.restablecerSimulacion();
        log.info("Diagnóstico MSU: Incidente mitigado. Simulación restablecida a normalidad.");
        return ResponseEntity.ok(Map.of(
                "estado", "OK",
                "casos_vencidos_simulados", 0,
                "mensaje", "Recuperación completada: métricas de simulación en cero."
        ));
    }
}
