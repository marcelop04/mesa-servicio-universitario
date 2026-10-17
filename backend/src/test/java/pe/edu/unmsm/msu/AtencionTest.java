package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.sql.Timestamp;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.ResultActions;
import pe.edu.unmsm.msu.solicitudes.servicio.CierreAutomaticoServicio;

/** EM01 a EM04 · HU10, HU11, HU12 (incluido el cierre automático) y HU23. */
class AtencionTest extends PruebaApi {

    static final String SOLUCION = "Se reemplazó el cable HDMI dañado y se probó el proyector.";

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    CierreAutomaticoServicio cierre;

    MockHttpSession supervisor;
    MockHttpSession tecnico;
    MockHttpSession solicitante;
    long id;
    long tecnicoId;

    @BeforeEach
    void preparar() throws Exception {
        supervisor = sesion("supervisor@msu.test");
        tecnico = sesion("tecnico.soporte@msu.test");
        solicitante = sesion("solicitante@msu.test");
        tecnicoId = pruebas.usuarioId("tecnico.soporte@msu.test");
        id = pruebas.crear("Proyector y multimedia", "MEDIO", "ALTA", Instant.now().minusSeconds(3600)).getId();
        accion(supervisor, "evaluacion", "{}").andExpect(status().isOk());
        accion(supervisor, "asignaciones", "{\"tecnico_id\":%d}".formatted(tecnicoId)).andExpect(status().isOk());
    }

    int version() throws Exception {
        return JsonPath.read(mvc.perform(get("/api/v1/solicitudes/" + id).session(supervisor))
                .andReturn().getResponse().getContentAsString(), "$.version");
    }

    /** Agrega la versión vigente al cuerpo, como hace la interfaz. */
    ResultActions accion(MockHttpSession sesion, String ruta, String json) throws Exception {
        String cuerpo = json.replaceFirst("}$", (json.equals("{}") ? "" : ",") + "\"version\":" + version() + "}");
        return mvc.perform(post("/api/v1/solicitudes/" + id + "/" + ruta).session(sesion).with(xsrf())
                .contentType(MediaType.APPLICATION_JSON).content(cuerpo));
    }

    void resolver() throws Exception {
        accion(tecnico, "inicio", "{}").andExpect(status().isOk());
        accion(tecnico, "resoluciones", "{\"solucion\":\"%s\"}".formatted(SOLUCION)).andExpect(status().isOk());
    }

    @Test
    void hu10Bdd1IniciarRegistraLaPrimeraAtencionUnaSolaVez() throws Exception {
        accion(tecnico, "inicio", "{}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado_codigo").value("EN_ATENCION"))
                .andExpect(jsonPath("$.primera_atencion_en").isNotEmpty());
        accion(tecnico, "inicio", "{}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("TRANSICION_INVALIDA"));
    }

    @Test
    void hu10Bdd2OtroTecnicoNoPuedeIniciar() throws Exception {
        long otro = jdbc.queryForObject("SELECT area_id FROM usuario WHERE id = ?", Long.class, tecnicoId);
        mvc.perform(post("/api/v1/admin/usuarios").session(sesion("admin@msu.test")).with(xsrf())
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"nombre":"Diana Flores","correo":"diana@msu.test","password":"Demo12345!",
                         "rol":"TECNICO","area_id":%d}""".formatted(otro))).andExpect(status().isCreated());
        accion(sesion("diana@msu.test"), "inicio", "{}").andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/solicitudes/" + id).session(supervisor))
                .andExpect(jsonPath("$.estado_codigo").value("ASIGNADA"));
    }

    @Test
    void hu11Bdd1SolucionDocumentadaQuedaResueltaYAvisa() throws Exception {
        accion(tecnico, "inicio", "{}").andExpect(status().isOk());
        accion(tecnico, "resoluciones", "{\"solucion\":\"  %s  \"}".formatted(SOLUCION))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado_codigo").value("RESUELTA"))
                .andExpect(jsonPath("$.ultima_resolucion_en").isNotEmpty());
        assertThat(jdbc.queryForObject("SELECT motivo FROM evento_operativo WHERE solicitud_id = ? AND accion = 'RESOLVER'",
                String.class, id)).isEqualTo(SOLUCION);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notificacion WHERE solicitud_id = ? AND tipo = 'RESOLUCION'",
                Long.class, id)).isEqualTo(1);
    }

    @Test
    void hu11Bdd2SolucionInsuficienteSeRechazaYSigueEnAtencion() throws Exception {
        accion(tecnico, "inicio", "{}").andExpect(status().isOk());
        accion(tecnico, "resoluciones", "{\"solucion\":\"Listo.\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("solucion"));
        mvc.perform(get("/api/v1/solicitudes/" + id).session(supervisor))
                .andExpect(jsonPath("$.estado_codigo").value("EN_ATENCION"));
    }

    @Test
    void hu12Bdd1ReabrirConTecnicoActivoVuelveAEnAtencionYConservaLaPrimeraAtencion() throws Exception {
        resolver();
        Timestamp primera = jdbc.queryForObject("SELECT primera_atencion_en FROM solicitud WHERE id = ?", Timestamp.class, id);
        accion(solicitante, "conformidad", "{\"accion\":\"REABRIR\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("motivo"));
        accion(solicitante, "conformidad", "{\"accion\":\"REABRIR\",\"motivo\":\"El proyector se apaga a los diez minutos\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado_codigo").value("EN_ATENCION"))
                .andExpect(jsonPath("$.tecnico_id").value(tecnicoId));
        assertThat(jdbc.queryForObject("SELECT primera_atencion_en FROM solicitud WHERE id = ?", Timestamp.class, id))
                .isEqualTo(primera);
    }

    @Test
    void reabrirConTecnicoInactivoVuelveAEvaluacionSinResponsable() throws Exception {
        resolver();
        pruebas.sql("UPDATE usuario SET activo = FALSE WHERE id = ?", tecnicoId);
        accion(solicitante, "conformidad", "{\"accion\":\"REABRIR\",\"motivo\":\"El problema persiste en la clase\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado_codigo").value("EN_EVALUACION"))
                .andExpect(jsonPath("$.tecnico_id").doesNotExist());
    }

    @Test
    void confirmarCierraElCaso() throws Exception {
        resolver();
        accion(solicitante, "conformidad", "{\"accion\":\"CONFIRMAR\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado_codigo").value("CERRADA"))
                .andExpect(jsonPath("$.cerrada_en").isNotEmpty());
        accion(tecnico, "conformidad", "{\"accion\":\"CONFIRMAR\"}").andExpect(status().isForbidden());
    }

    @Test
    void hu12Bdd2VentanaTerminadaRechazaLaReaperturaYElCierreAutomaticoNoSeDuplica() throws Exception {
        resolver();
        pruebas.sql("UPDATE solicitud SET ultima_resolucion_en = ? WHERE id = ?",
                Timestamp.from(Instant.now().minusSeconds(73 * 3600)), id);
        accion(solicitante, "conformidad", "{\"accion\":\"REABRIR\",\"motivo\":\"El problema persiste en la clase\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("VENTANA_VENCIDA"))
                .andExpect(jsonPath("$.mensaje", containsString("Terminó el periodo")));

        assertThat(cierre.cerrarVencidas(Instant.now())).isEqualTo(1);
        assertThat(cierre.cerrarVencidas(Instant.now())).isZero();
        mvc.perform(get("/api/v1/solicitudes/" + id).session(supervisor))
                .andExpect(jsonPath("$.estado_codigo").value("CERRADA"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM evento_operativo WHERE solicitud_id = ?"
                + " AND accion = 'CERRAR_AUTOMATICO' AND actor_id IS NULL", Long.class, id)).isEqualTo(1);
    }

    @Test
    void hu23Bdd1HistorialMuestraLaReasignacionConActorMotivoYValores() throws Exception {
        long area = jdbc.queryForObject("SELECT area_id FROM usuario WHERE id = ?", Long.class, tecnicoId);
        String json = mvc.perform(post("/api/v1/admin/usuarios").session(sesion("admin@msu.test")).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"nombre":"Diana Flores","correo":"diana@msu.test","password":"Inicial12345",
                                 "rol":"TECNICO","area_id":%d}""".formatted(area)))
                .andReturn().getResponse().getContentAsString();
        long diana = ((Number) JsonPath.read(json, "$.id")).longValue();
        accion(supervisor, "asignaciones", "{\"tecnico_id\":%d,\"motivo\":\"Tomás está de licencia hoy\"}".formatted(diana))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/solicitudes/" + id + "/historial").session(solicitante))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].accion").value("EVALUAR"))
                .andExpect(jsonPath("$[2].accion").value("REASIGNAR"))
                .andExpect(jsonPath("$[2].actor_nombre").value("Sara Supervisora"))
                .andExpect(jsonPath("$[2].motivo").value("Tomás está de licencia hoy"))
                .andExpect(jsonPath("$[2].anterior.tecnico_nombre").value("Tomás Soporte"))
                .andExpect(jsonPath("$[2].nuevo.tecnico_nombre").value("Diana Flores"))
                .andExpect(jsonPath("$[2].creado_en").isNotEmpty());
        // El técnico anterior ya no tiene acceso al caso (HU16 BDD 2 / HU24).
        mvc.perform(get("/api/v1/solicitudes/" + id + "/historial").session(tecnico)).andExpect(status().isForbidden());
    }
}
