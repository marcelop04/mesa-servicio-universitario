package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.ResultActions;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;

/** HU22 · Versionar políticas de plazos (Emanuel, fase III). */
class PoliticasTest extends PruebaApi {

    /** Matriz coherente distinta de la v1 (4/24, 8/48, 24/120, 48/240). */
    static final String NUEVA = """
            {"detalles":[
              {"prioridad_codigo":"CRITICA","horas_primera_atencion":2,"horas_resolucion":12},
              {"prioridad_codigo":"ALTA","horas_primera_atencion":6,"horas_resolucion":36},
              {"prioridad_codigo":"MEDIA","horas_primera_atencion":24,"horas_resolucion":96},
              {"prioridad_codigo":"BAJA","horas_primera_atencion":48,"horas_resolucion":168}]%s}""";

    @Autowired
    JdbcTemplate jdbc;

    MockHttpSession admin;

    @BeforeEach
    void preparar() throws Exception {
        admin = sesion("admin@msu.test");
    }

    ResultActions publicar(String json) throws Exception {
        return mvc.perform(post("/api/v1/admin/politicas").session(admin).with(xsrf())
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    static String matriz(int critica, int criticaRes, int alta, int altaRes) {
        return """
                {"detalles":[
                  {"prioridad_codigo":"CRITICA","horas_primera_atencion":%d,"horas_resolucion":%d},
                  {"prioridad_codigo":"ALTA","horas_primera_atencion":%d,"horas_resolucion":%d},
                  {"prioridad_codigo":"MEDIA","horas_primera_atencion":24,"horas_resolucion":120},
                  {"prioridad_codigo":"BAJA","horas_primera_atencion":48,"horas_resolucion":240}]}"""
                .formatted(critica, criticaRes, alta, altaRes);
    }

    @Test
    void hu22Bdd1NuevaVersionRigeParaNuevasYLasExistentesConservanLaAnterior() throws Exception {
        Solicitud anterior = pruebas.crear("Proyector y multimedia", "MEDIO", "ALTA", Instant.now());
        Timestamp limiteAnterior = jdbc.queryForObject("SELECT limite_atencion FROM solicitud WHERE id = ?",
                Timestamp.class, anterior.getId());

        publicar(NUEVA.formatted(",\"version_base\":1"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.version").value(2))
                .andExpect(jsonPath("$.vigente").value(true))
                .andExpect(jsonPath("$.detalles[1].prioridad_codigo").value("ALTA"))
                .andExpect(jsonPath("$.detalles[1].horas_primera_atencion").value(6));

        Instant registro = Instant.now();
        Solicitud nueva = pruebas.crear("Proyector y multimedia", "MEDIO", "ALTA", registro);
        assertThat(nueva.getPolitica().getVersion()).isEqualTo(2);
        assertThat(Duration.between(registro, nueva.getLimiteAtencion())).isEqualTo(Duration.ofHours(6));
        assertThat(Duration.between(registro, nueva.getLimiteResolucion())).isEqualTo(Duration.ofHours(36));

        assertThat(jdbc.queryForObject("SELECT p.version FROM solicitud s JOIN politica p ON p.id = s.politica_id"
                + " WHERE s.id = ?", Integer.class, anterior.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT limite_atencion FROM solicitud WHERE id = ?", Timestamp.class,
                anterior.getId())).isEqualTo(limiteAnterior);

        mvc.perform(get("/api/v1/admin/politicas").session(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].version").value(2))
                .andExpect(jsonPath("$[0].vigente").value(true))
                .andExpect(jsonPath("$[0].publicada_por").isNotEmpty())
                .andExpect(jsonPath("$[1].version").value(1))
                .andExpect(jsonPath("$[1].vigente").value(false));
        mvc.perform(get("/api/v1/admin/auditoria").param("accion", "POLITICA_PUBLICAR").session(admin))
                .andExpect(jsonPath("$.items[0].metadatos.version").value(2))
                .andExpect(jsonPath("$.items[0].metadatos.version_anterior").value(1))
                .andExpect(jsonPath("$.items[0].metadatos.matriz.ALTA.horas_resolucion").value(36));
    }

    @Test
    void hu22Bdd2PrimeraAtencionMayorQueLaResolucionSeRechazaIndicandoElDato() throws Exception {
        publicar(matriz(4, 24, 50, 48))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("ALTA.horas_primera_atencion"))
                .andExpect(jsonPath("$.errores[0].mensaje").value(org.hamcrest.Matchers.containsString("50 h")));
        assertThat(jdbc.queryForObject("SELECT MAX(version) FROM politica", Integer.class)).isEqualTo(1);
    }

    @Test
    void unaPrioridadMasUrgenteNoTienePlazosMasLargos() throws Exception {
        publicar(matriz(10, 60, 8, 48))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("CRITICA.horas_primera_atencion"))
                .andExpect(jsonPath("$.errores[1].campo").value("CRITICA.horas_resolucion"));
    }

    @Test
    void horasNoPositivasOFaltantesSeRechazan() throws Exception {
        publicar(matriz(0, 24, 8, 48))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("CRITICA.horas_primera_atencion"));
        publicar("""
                {"detalles":[{"prioridad_codigo":"CRITICA","horas_primera_atencion":4,"horas_resolucion":24}]}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("detalles"));
        publicar("{}").andExpect(status().isBadRequest());
    }

    @Test
    void concurrenciaYVersionesIgualesSeRechazan() throws Exception {
        publicar(NUEVA.formatted(",\"version_base\":1")).andExpect(status().isCreated());
        // Otro administrador seguía viendo la v1.
        publicar(matriz(3, 20, 8, 48).replaceFirst("}$", ",\"version_base\":1}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("POLITICA_DESACTUALIZADA"));
        publicar(NUEVA.formatted(""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("POLITICA_SIN_CAMBIOS"));
        assertThat(jdbc.queryForObject("SELECT MAX(version) FROM politica", Integer.class)).isEqualTo(2);
    }

    @Test
    void soloElAdministradorConsultaYPublica() throws Exception {
        MockHttpSession supervisor = sesion("supervisor@msu.test");
        mvc.perform(get("/api/v1/admin/politicas").session(supervisor)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/politicas").session(supervisor).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content(NUEVA.formatted("")))
                .andExpect(status().isForbidden());
    }
}
