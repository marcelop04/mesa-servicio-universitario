package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.ResultActions;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;

/** MR04 a MR06 y MR08: HU07, HU08, HU09 y conflicto de versión (HU24 BDD 2). */
class SupervisionTest extends PruebaApi {

    static final Instant REGISTRO = Instant.parse("2026-10-16T13:00:00Z"); // 08:00 en Lima

    @Autowired
    JdbcTemplate jdbc;

    MockHttpSession supervisor;
    Solicitud s;
    long soporte;
    long mantenimiento;

    @BeforeEach
    void preparar() throws Exception {
        supervisor = sesion("supervisor@msu.test");
        s = pruebas.crear("Equipo de cómputo", "MEDIO", "MEDIA", REGISTRO);
        soporte = pruebas.usuarioId("tecnico.soporte@msu.test");
        mantenimiento = pruebas.usuarioId("tecnico.mantenimiento@msu.test");
    }

    ResultActions accion(String ruta, String json) throws Exception {
        return mvc.perform(post("/api/v1/solicitudes/" + s.getId() + "/" + ruta).session(supervisor).with(xsrf())
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void hu07Bdd1EvaluarPasaAEnEvaluacionConActor() throws Exception {
        accion("evaluacion", "{\"version\":0}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado_codigo").value("EN_EVALUACION"))
                .andExpect(jsonPath("$.version").value(1));
        assertThat(jdbc.queryForObject("SELECT actor_id FROM evento_operativo WHERE solicitud_id = ? AND accion = 'EVALUAR'",
                Long.class, s.getId())).isEqualTo(pruebas.usuarioId("supervisor@msu.test"));
    }

    @Test
    void hu07Bdd2CambioSinMotivoSeRechazaYConservaPrioridad() throws Exception {
        accion("evaluacion", "{\"impacto\":\"ALTO\",\"urgencia\":\"ALTA\",\"version\":0}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[*].campo", hasItem("motivo")));
        mvc.perform(get("/api/v1/solicitudes/" + s.getId()).session(supervisor))
                .andExpect(jsonPath("$.estado_codigo").value("REGISTRADA"))
                .andExpect(jsonPath("$.prioridad_codigo").value("MEDIA"))
                .andExpect(jsonPath("$.limite_atencion").value("2026-10-17T13:00:00Z"));
    }

    @Test
    void recalculoDePlazosDesdeElRegistro() throws Exception {
        accion("evaluacion", """
                {"impacto":"ALTO","urgencia":"ALTA","motivo":"Afecta a todo el laboratorio","version":0}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.prioridad_codigo").value("CRITICA"))
                .andExpect(jsonPath("$.registrada_en").value("2026-10-16T13:00:00Z"))
                .andExpect(jsonPath("$.limite_atencion").value("2026-10-16T17:00:00Z"))
                .andExpect(jsonPath("$.limite_resolucion").value("2026-10-17T13:00:00Z"))
                .andExpect(jsonPath("$.version_fechas").value(2));
        assertThat(jdbc.queryForObject("SELECT motivo FROM evento_operativo WHERE solicitud_id = ?"
                + " AND accion = 'CAMBIAR_PRIORIDAD'", String.class, s.getId())).isEqualTo("Afecta a todo el laboratorio");
    }

    @Test
    void hu08Bdd1AsignarQuedaAsignadaYNotifica() throws Exception {
        accion("evaluacion", "{\"version\":0}").andExpect(status().isOk());
        accion("asignaciones", "{\"tecnico_id\":%d,\"version\":1}".formatted(soporte))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado_codigo").value("ASIGNADA"))
                .andExpect(jsonPath("$.tecnico_nombre").value("Tomás Soporte"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notificacion WHERE usuario_id = ? AND tipo = 'ASIGNACION'",
                Long.class, soporte)).isEqualTo(1);
        mvc.perform(get("/api/v1/supervision/tecnicos").session(supervisor))
                .andExpect(jsonPath("$[?(@.nombre == 'Tomás Soporte')].pendientes").value(hasItem(1)));
    }

    @Test
    void hu08Bdd2TecnicoDeOtraAreaSeRechaza() throws Exception {
        accion("evaluacion", "{\"version\":0}").andExpect(status().isOk());
        accion("asignaciones", "{\"tecnico_id\":%d,\"version\":1}".formatted(mantenimiento))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("tecnico_id"));
        mvc.perform(get("/api/v1/solicitudes/" + s.getId()).session(supervisor))
                .andExpect(jsonPath("$.tecnico_id").doesNotExist());
    }

    @Test
    void hu09Bdd1DuplicadoQuedaCanceladoYVinculado() throws Exception {
        Solicitud original = pruebas.crear("Equipo de cómputo", "MEDIO", "MEDIA", REGISTRO);
        accion("cancelacion", """
                {"motivo":"Es el mismo equipo ya reportado","duplicado":true,"codigo_original":"%s","version":0}"""
                .formatted(original.getCodigo()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado_codigo").value("CANCELADA"))
                .andExpect(jsonPath("$.duplicada_de_codigo").value(original.getCodigo()));
    }

    @Test
    void hu09Bdd2ResueltaNoSeCancela() throws Exception {
        long id = pruebas.crearConEstado(pruebas.categoriaId("Equipo de cómputo"), "RESUELTA", soporte);
        mvc.perform(post("/api/v1/solicitudes/" + id + "/cancelacion").session(supervisor).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Ya no es necesario\",\"version\":0}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("TRANSICION_INVALIDA"));
    }

    @Test
    void hu24Bdd2VersionAntiguaRecibeConflictoYSeConservaElPrimerCambio() throws Exception {
        accion("evaluacion", "{\"version\":0}").andExpect(status().isOk());
        accion("asignaciones", "{\"tecnico_id\":%d,\"version\":1}".formatted(soporte)).andExpect(status().isOk());
        // Un segundo supervisor sigue con la versión 1 e intenta cambiar la prioridad.
        accion("evaluacion", "{\"impacto\":\"BAJO\",\"motivo\":\"Solo afecta a una persona\",\"version\":1}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("CONFLICTO_VERSION"));
        mvc.perform(get("/api/v1/solicitudes/" + s.getId()).session(supervisor))
                .andExpect(jsonPath("$.tecnico_id").value(soporte))
                .andExpect(jsonPath("$.prioridad_codigo").value("MEDIA"));
    }

    @Test
    void permisosPorRol() throws Exception {
        mvc.perform(post("/api/v1/solicitudes/" + s.getId() + "/evaluacion").session(sesion("solicitante@msu.test"))
                        .with(xsrf()).contentType(MediaType.APPLICATION_JSON).content("{\"version\":0}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/solicitudes/" + s.getId()).session(sesion("tecnico.soporte@msu.test")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/solicitudes").session(sesion("admin@msu.test"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/solicitudes").param("estado", "PENDIENTES").param("responsable", "SIN_ASIGNAR")
                        .session(supervisor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].codigo").value(s.getCodigo()));
    }

    @Test
    void nivelDePlazoSegunElTiempoTranscurrido() throws Exception {
        Instant ahora = Instant.now();
        Solicitud vencida = pruebas.crear("Equipo de cómputo", "MEDIO", "MEDIA", ahora.minusSeconds(30 * 3600));
        Solicitud alerta = pruebas.crear("Equipo de cómputo", "MEDIO", "MEDIA", ahora.minusSeconds(20 * 3600));
        Solicitud enPlazo = pruebas.crear("Equipo de cómputo", "MEDIO", "MEDIA", ahora.minusSeconds(3600));
        for (Object[] caso : new Object[][] {{vencida, "VENCIDA"}, {alerta, "ALERTA"}, {enPlazo, "EN_PLAZO"}}) {
            mvc.perform(get("/api/v1/solicitudes/" + ((Solicitud) caso[0]).getId()).session(supervisor))
                    .andExpect(jsonPath("$.nivel_plazo").value(caso[1]));
        }
    }
}
