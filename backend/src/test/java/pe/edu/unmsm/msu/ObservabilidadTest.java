package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import pe.edu.unmsm.msu.comun.observabilidad.MetricasMsuServicio;
import pe.edu.unmsm.msu.comun.web.FiltroCorrelacion;

/**
 * Pruebas del Paquete D (Observabilidad: D1, D2, D3, RNF08).
 * Valida Actuator, Prometheus scraping, correlación y métricas de negocio.
 */
class ObservabilidadTest extends PruebaApi {

    @Autowired
    private MetricasMsuServicio metricas;

    @Test
    @DisplayName("D1: /actuator/health es público y reporta UP")
    void healthEsPublicoYDevuelveUp() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("D1: /actuator/prometheus expone métricas estándar y de negocio de MSU")
    void prometheusExponeMetricas() throws Exception {
        metricas.registrarSolicitudCreada();

        mvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("jvm_memory_used_bytes")))
                .andExpect(content().string(containsString("msu_solicitudes_vencidas")))
                .andExpect(content().string(containsString("msu_solicitudes_creadas")));
    }

    @Test
    @DisplayName("D2: FiltroCorrelacion propaga y genera cabecera X-Correlation-Id")
    void correlacionGeneraYPropagaCabecera() throws Exception {
        // Sin cabecera previa -> genera un identificador
        mvc.perform(get("/api/v1/diagnostico/exito"))
                .andExpect(status().isOk())
                .andExpect(header().exists(FiltroCorrelacion.CABECERA))
                .andExpect(header().string(FiltroCorrelacion.CABECERA, notNullValue()));

        // Con cabecera previa -> preserva el identificador enviado
        String idEnviado = "corr-test-12345678";
        mvc.perform(get("/api/v1/diagnostico/exito")
                        .header(FiltroCorrelacion.CABECERA, idEnviado))
                .andExpect(status().isOk())
                .andExpect(header().string(FiltroCorrelacion.CABECERA, idEnviado));
    }

    @Test
    @DisplayName("D4: Simular casos vencidos impacta la métrica expuesta en Prometheus")
    void simularCasosVencidosActualizaMetrica() throws Exception {
        mvc.perform(post("/api/v1/diagnostico/simular-vencidas")
                        .with(xsrf())
                        .param("cantidad", "7")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.casos_vencidos_simulados").value(7));

        assertThat(metricas.obtenerCasosVencidos()).isEqualTo(7.0);

        mvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("msu_solicitudes_vencidas")))
                .andExpect(content().string(containsString("7.0")));

        // Restaurar estado a 0
        metricas.simularCasosVencidos(0);
    }
}
