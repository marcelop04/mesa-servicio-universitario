package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.ResultActions;

/** HU13 · Calificar el servicio (Emanuel, fase III). */
class EncuestaTest extends PruebaApi {

    @Autowired
    JdbcTemplate jdbc;

    MockHttpSession solicitante;
    long tecnicoId;
    long categoriaId;
    long cerrada;

    @BeforeEach
    void preparar() throws Exception {
        solicitante = sesion("solicitante@msu.test");
        tecnicoId = pruebas.usuarioId("tecnico.soporte@msu.test");
        categoriaId = pruebas.categoriaId("Proyector y multimedia");
        cerrada = pruebas.crearConEstado(categoriaId, "CERRADA", tecnicoId);
    }

    ResultActions calificar(MockHttpSession sesion, long id, String json) throws Exception {
        return mvc.perform(post("/api/v1/solicitudes/" + id + "/encuesta").session(sesion).with(xsrf())
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void hu13Bdd1EncuestaValidaSeGuardaYSeConfirma() throws Exception {
        int version = jdbc.queryForObject("SELECT version FROM solicitud WHERE id = ?", Integer.class, cerrada);
        calificar(solicitante, cerrada, "{\"calificacion\":4,\"comentario\":\"  Atención rápida y amable.  \"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.calificacion").value(4))
                .andExpect(jsonPath("$.comentario").value("Atención rápida y amable."))
                .andExpect(jsonPath("$.creada_en").isNotEmpty());
        mvc.perform(get("/api/v1/solicitudes/" + cerrada + "/encuesta").session(solicitante))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.calificacion").value(4));
        // No modifica el estado ni la versión del caso.
        mvc.perform(get("/api/v1/solicitudes/" + cerrada).session(solicitante))
                .andExpect(jsonPath("$.estado_codigo").value("CERRADA"))
                .andExpect(jsonPath("$.version").value(version));
    }

    @Test
    void hu13Bdd2SegundaEncuestaSeRechaza() throws Exception {
        calificar(solicitante, cerrada, "{\"calificacion\":5}").andExpect(status().isCreated());
        calificar(solicitante, cerrada, "{\"calificacion\":1,\"comentario\":\"Cambio de opinión\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("ENCUESTA_DUPLICADA"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM encuesta WHERE solicitud_id = ?", Long.class, cerrada))
                .isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT calificacion FROM encuesta WHERE solicitud_id = ?", Integer.class,
                cerrada)).isEqualTo(5);
    }

    @Test
    void sinEncuestaLaConsultaRespondeSinContenido() throws Exception {
        mvc.perform(get("/api/v1/solicitudes/" + cerrada + "/encuesta").session(solicitante))
                .andExpect(status().isNoContent());
    }

    @Test
    void calificacionYComentarioFueraDeRangoSeRechazanPorCampo() throws Exception {
        calificar(solicitante, cerrada, "{\"calificacion\":6}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("calificacion"));
        calificar(solicitante, cerrada, "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("calificacion"));
        calificar(solicitante, cerrada, "{\"calificacion\":3,\"comentario\":\"%s\"}".formatted("x".repeat(501)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("comentario"));
        calificar(solicitante, cerrada, "{\"calificacion\":3,\"comentario\":\"%s\"}".formatted("x".repeat(500)))
                .andExpect(status().isCreated());
    }

    @Test
    void soloSeCalificaUnaSolicitudCerrada() throws Exception {
        long resuelta = pruebas.crearConEstado(categoriaId, "RESUELTA", tecnicoId);
        calificar(solicitante, resuelta, "{\"calificacion\":4}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("ENCUESTA_NO_DISPONIBLE"));
    }

    @Test
    void soloElSolicitantePropietarioCalifica() throws Exception {
        pruebas.crearSolicitante("otro@msu.test");
        calificar(sesion("otro@msu.test"), cerrada, "{\"calificacion\":4}").andExpect(status().isForbidden());
        calificar(sesion("supervisor@msu.test"), cerrada, "{\"calificacion\":4}").andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/solicitudes/" + cerrada + "/encuesta").session(sesion("otro@msu.test")))
                .andExpect(status().isForbidden());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM encuesta WHERE solicitud_id = ?", Long.class, cerrada))
                .isZero();
    }
}
