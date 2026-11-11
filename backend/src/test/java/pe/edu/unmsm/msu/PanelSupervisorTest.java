package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import pe.edu.unmsm.msu.notificaciones.servicio.AlertasPlazosServicio;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;

/** HU15 alertas de plazos, HU16 notificaciones, HU17 y HU18 indicadores y HU19 exportación CSV. */
class PanelSupervisorTest extends PruebaApi {

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    AlertasPlazosServicio alertas;

    MockHttpSession supervisor;
    long soporte;

    @BeforeEach
    void preparar() throws Exception {
        supervisor = sesion("supervisor@msu.test");
        soporte = pruebas.usuarioId("tecnico.soporte@msu.test");
    }

    /** Caso Media (24 h de atención) asignado al técnico de soporte y registrado hace las horas indicadas. */
    Solicitud asignadaHace(int horas) {
        Solicitud s = pruebas.crear("Equipo de cómputo", "MEDIO", "MEDIA", Instant.now().minusSeconds(horas * 3600L));
        pruebas.sql("UPDATE solicitud SET estado_codigo = 'ASIGNADA', tecnico_id = ? WHERE id = ?", soporte, s.getId());
        return s;
    }

    @Test
    void hu15Bdd1VencimientoAvisaAlSupervisorYAlTecnico() {
        Solicitud vencida = asignadaHace(30);
        assertThat(alertas.revisar(Instant.now())).isEqualTo(2);
        assertThat(jdbc.queryForList("SELECT usuario_id FROM notificacion WHERE solicitud_id = ? AND tipo = 'VENCIMIENTO'",
                Long.class, vencida.getId())).containsExactlyInAnyOrder(soporte, pruebas.usuarioId("supervisor@msu.test"));
    }

    @Test
    void hu15Bdd2RevisionRepetidaNoDuplicaYLosCanceladosNoAvisan() {
        asignadaHace(20); // 83 % del plazo de primera atención
        Solicitud cancelada = asignadaHace(30);
        pruebas.sql("UPDATE solicitud SET estado_codigo = 'CANCELADA' WHERE id = ?", cancelada.getId());

        assertThat(alertas.revisar(Instant.now())).isEqualTo(2);
        assertThat(alertas.revisar(Instant.now())).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notificacion WHERE tipo = 'ALERTA_PLAZO'", Long.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notificacion WHERE solicitud_id = ?", Long.class,
                cancelada.getId())).isZero();
    }

    @Test
    void hu16Bdd1MarcarLeidaYBorrarSoloAvisosPropios() throws Exception {
        asignadaHace(30);
        alertas.revisar(Instant.now());
        mvc.perform(get("/api/v1/notificaciones/no-leidas").session(supervisor)).andExpect(jsonPath("$.total").value(1));
        String json = mvc.perform(get("/api/v1/notificaciones").session(supervisor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].tipo").value("VENCIMIENTO"))
                .andExpect(jsonPath("$.items[0].leida").value(false))
                .andExpect(jsonPath("$.items[0].solicitud_codigo").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(json, "$.items[0].id")).longValue();

        mvc.perform(put("/api/v1/notificaciones/" + id + "/lectura").session(sesion("tecnico.soporte@msu.test")).with(xsrf()))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/notificaciones/" + id + "/lectura").session(supervisor).with(xsrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leida").value(true))
                .andExpect(jsonPath("$.texto", Matchers.containsString("superó el plazo")));
        mvc.perform(get("/api/v1/notificaciones/no-leidas").session(supervisor)).andExpect(jsonPath("$.total").value(0));

        mvc.perform(delete("/api/v1/notificaciones/" + id).session(supervisor).with(xsrf())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/notificaciones").session(supervisor)).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void hu17Bdd1ConteosConsistentesConUnConjuntoConocido() throws Exception {
        asignadaHace(30); // pendiente y vencida en primera atención
        Solicitud cerrada = pruebas.crear("Gasfitería", "MEDIO", "MEDIA", Instant.now().minusSeconds(10 * 3600));
        pruebas.sql("UPDATE solicitud SET estado_codigo = 'CERRADA', tecnico_id = ?, primera_atencion_en = ?,"
                        + " ultima_resolucion_en = ? WHERE id = ?", pruebas.usuarioId("tecnico.mantenimiento@msu.test"),
                java.sql.Timestamp.from(Instant.now().minusSeconds(8 * 3600)),
                java.sql.Timestamp.from(Instant.now().minusSeconds(4 * 3600)), cerrada.getId());
        Solicitud cancelada = pruebas.crear("Gasfitería", "BAJO", "BAJA", Instant.now().minusSeconds(3600));
        pruebas.sql("UPDATE solicitud SET estado_codigo = 'CANCELADA' WHERE id = ?", cancelada.getId());

        mvc.perform(get("/api/v1/indicadores").session(supervisor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.conteos.registradas").value(3))
                .andExpect(jsonPath("$.conteos.pendientes").value(1))
                .andExpect(jsonPath("$.conteos.cerradas").value(1))
                .andExpect(jsonPath("$.conteos.canceladas").value(1))
                .andExpect(jsonPath("$.conteos.atendidas").value(1))
                .andExpect(jsonPath("$.conteos.porcentaje_solucionado").value(50.0))
                .andExpect(jsonPath("$.tiempos.tiempo_medio_resolucion_horas").value(6.0))
                .andExpect(jsonPath("$.tiempos.cumplimiento_resolucion").value(100.0))
                .andExpect(jsonPath("$.por_tecnico[?(@.etiqueta == 'Sin asignar')].valor").value(Matchers.hasItem(1)))
                .andExpect(jsonPath("$.por_prioridad.length()").value(4));
    }

    @Test
    void hu17Bdd2PeriodoVacioMuestraCerosYSinDatos() throws Exception {
        mvc.perform(get("/api/v1/indicadores").param("desde", "2020-01-01").param("hasta", "2020-01-31").session(supervisor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.conteos.registradas").value(0))
                .andExpect(jsonPath("$.conteos.porcentaje_solucionado").doesNotExist())
                .andExpect(jsonPath("$.tiempos.tiempo_medio_resolucion_horas").doesNotExist())
                .andExpect(jsonPath("$.satisfaccion.encuestas").value(0))
                .andExpect(jsonPath("$.satisfaccion.promedio").doesNotExist());
    }

    @Test
    void hu19Bdd1CsvDelFiltroYBdd2RolNoAutorizado() throws Exception {
        asignadaHace(2);
        pruebas.crear("Gasfitería", "MEDIO", "MEDIA", Instant.now());
        String hoy = LocalDate.now(ZoneId.of("America/Lima")).toString();
        String csv = mvc.perform(get("/api/v1/reportes/solicitudes.csv").param("area_id",
                                String.valueOf(jdbc.queryForObject("SELECT id FROM area WHERE nombre = 'Mantenimiento'", Long.class)))
                        .session(supervisor))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", Matchers.containsString("solicitudes-" + hoy + ".csv")))
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        String[] lineas = csv.strip().split("\r\n");
        assertThat(lineas[0]).contains("Código;Categoría;Área");
        assertThat(lineas).hasSize(2);
        assertThat(lineas[1]).contains("\"Gasfitería\"").contains("\"Mantenimiento\"").doesNotContain("Equipo de cómputo");

        mvc.perform(get("/api/v1/reportes/solicitudes.csv").session(sesion("solicitante@msu.test"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/indicadores").session(sesion("solicitante@msu.test"))).andExpect(status().isForbidden());
    }

    @Test
    void csvNeutralizaFormulas() {
        assertThat(pe.edu.unmsm.msu.indicadores.controlador.IndicadoresControladorAcceso.celda("=SUMA(A1)")).isEqualTo("\"'=SUMA(A1)\"");
        assertThat(pe.edu.unmsm.msu.indicadores.controlador.IndicadoresControladorAcceso.celda("dice \"hola\"")).isEqualTo("\"dice \"\"hola\"\"\"");
    }
}
