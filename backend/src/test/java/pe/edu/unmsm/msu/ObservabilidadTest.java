package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
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
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.TestPropertySource;
import pe.edu.unmsm.msu.comun.observabilidad.MetricasMsuServicio;
import pe.edu.unmsm.msu.comun.web.FiltroCorrelacion;

/**
 * Pruebas del Paquete D (Observabilidad: D1, D2, D3, D4, D5, RNF08).
 * Valida Actuator, Prometheus scraping, correlación, métricas de negocio y seguridad en simulación.
 */
@TestPropertySource(properties = "msu.simulacion.habilitada=true")
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
        MockHttpSession admin = sesion("admin@msu.test");

        // Sin cabecera previa -> genera un identificador
        mvc.perform(get("/api/v1/diagnostico/exito").session(admin))
                .andExpect(status().isOk())
                .andExpect(header().exists(FiltroCorrelacion.CABECERA))
                .andExpect(header().string(FiltroCorrelacion.CABECERA, notNullValue()));

        // Con cabecera previa -> preserva el identificador enviado
        String idEnviado = "corr-test-12345678";
        mvc.perform(get("/api/v1/diagnostico/exito").session(admin)
                        .header(FiltroCorrelacion.CABECERA, idEnviado))
                .andExpect(status().isOk())
                .andExpect(header().string(FiltroCorrelacion.CABECERA, idEnviado));
    }

    @Test
    @DisplayName("D2: Errores no exponen secretos ni datos sensibles en la respuesta (RNF02)")
    void errorNoExponeSecretosNiTokens() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                        .with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"inexistente@msu.test\",\"password\":\"ClaveSuperSecreta123!\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string(not(containsString("ClaveSuperSecreta123!"))))
                .andExpect(content().string(not(containsString("token"))));
    }

    @Test
    @DisplayName("Seguridad: Endpoints de diagnóstico exigen rol ADMINISTRADOR")
    void diagnosticoExigeRolAdministrador() throws Exception {
        // Petición anónima es rechazada
        mvc.perform(post("/api/v1/diagnostico/simular-error-500").with(xsrf()))
                .andExpect(status().isUnauthorized());

        // Petición de solicitante es rechazada con 403
        MockHttpSession solicitante = sesion("solicitante@msu.test");
        mvc.perform(post("/api/v1/diagnostico/simular-error-500").session(solicitante).with(xsrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("D4 y D5: Simular casos vencidos impacta la métrica y permite recuperación a cero")
    void simularCasosVencidosYRecuperacion() throws Exception {
        MockHttpSession admin = sesion("admin@msu.test");

        // 1. Simulación controlada por Administrador
        mvc.perform(post("/api/v1/diagnostico/simular-vencidas").session(admin)
                        .with(xsrf())
                        .param("cantidad", "7")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.casos_vencidos_simulados").value(7));

        assertThat(metricas.obtenerCasosSimulados()).isEqualTo(7.0);

        mvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("msu_solicitudes_vencidas_simuladas")))
                .andExpect(content().string(containsString("7.0")));

        // 2. Mitigación y Recuperación (D5)
        mvc.perform(post("/api/v1/diagnostico/simular-recuperacion").session(admin)
                        .with(xsrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.casos_vencidos_simulados").value(0));

        assertThat(metricas.obtenerCasosSimulados()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("D5: Validación de límites en simulación de latencia (máximo 5000 ms)")
    void validacionLimitesLatencia() throws Exception {
        MockHttpSession admin = sesion("admin@msu.test");

        // Latencia excesiva (> 5000 ms) debe ser rechazada con 400
        mvc.perform(post("/api/v1/diagnostico/simular-latencia").session(admin)
                        .with(xsrf())
                        .param("milisegundos", "60000"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Parámetro inválido"));
    }
}
