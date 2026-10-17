package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;

/** HU20 Administrar usuarios internos. */
class AdminUsuariosTest extends PruebaApi {

    @Autowired
    JdbcTemplate jdbc;

    MockHttpSession admin;
    long areaSoporte;
    long tecnicoSoporte;

    @BeforeEach
    void preparar() throws Exception {
        admin = sesion("admin@msu.test");
        areaSoporte = jdbc.queryForObject("SELECT id FROM area WHERE nombre = 'Soporte informático'", Long.class);
        tecnicoSoporte = jdbc.queryForObject("SELECT id FROM usuario WHERE correo = 'tecnico.soporte@msu.test'",
                Long.class);
    }

    @Test
    void bdd1AltaDeTecnicoQuedaVinculadoAlArea() throws Exception {
        mvc.perform(post("/api/v1/admin/usuarios").session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"Lucía Redes","correo":"  Lucia.Redes@MSU.test ",
                                 "password":"Inicial12345","rol":"TECNICO","area_id":%d}
                                """.formatted(areaSoporte)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.correo").value("lucia.redes@msu.test"))
                .andExpect(jsonPath("$.rol").value("TECNICO"))
                .andExpect(jsonPath("$.area_nombre").value("Soporte informático"))
                .andExpect(jsonPath("$.pendientes").value(0))
                .andExpect(jsonPath("$.password_hash").doesNotExist());

        mvc.perform(get("/api/v1/admin/usuarios").session(admin).param("rol", "TECNICO").param("q", "lucía"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$['tamaño']").value(20))
                .andExpect(jsonPath("$.items[0].area_id").value(areaSoporte));
    }

    @Test
    void tecnicoSinAreaSeRechazaPorCampo() throws Exception {
        mvc.perform(post("/api/v1/admin/usuarios").session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Sin Área\",\"correo\":\"sinarea@msu.test\","
                                + "\"password\":\"Inicial12345\",\"rol\":\"TECNICO\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("area_id"));
    }

    @Test
    void correoDuplicadoYRolPublicoSeRechazan() throws Exception {
        mvc.perform(post("/api/v1/admin/usuarios").session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Otra\",\"correo\":\"SUPERVISOR@msu.test\","
                                + "\"password\":\"Inicial12345\",\"rol\":\"SUPERVISOR\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("CORREO_DUPLICADO"));
        mvc.perform(post("/api/v1/admin/usuarios").session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Pública\",\"correo\":\"publica@msu.test\","
                                + "\"password\":\"Inicial12345\",\"rol\":\"SOLICITANTE\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("rol"));
    }

    @Test
    void validaLongitudesConMensajesPorCampo() throws Exception {
        mvc.perform(post("/api/v1/admin/usuarios").session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"A\",\"correo\":\"no-es-correo\",\"password\":\"corta\","
                                + "\"rol\":\"SUPERVISOR\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("DATOS_INVALIDOS"))
                .andExpect(jsonPath("$.errores.length()").value(3));
    }

    @Test
    void bdd2DesactivarTecnicoConCargaSeRechaza() throws Exception {
        jdbc.update("INSERT INTO solicitud (codigo, categoria_id, estado_codigo, tecnico_id)"
                + " VALUES ('MSU-2026-0001', 1, 'EN_ATENCION', ?)", tecnicoSoporte);

        mvc.perform(put("/api/v1/admin/usuarios/" + tecnicoSoporte).session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":false}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("TECNICO_CON_CARGA"))
                .andExpect(jsonPath("$.mensaje").value(org.hamcrest.Matchers.containsString("1 solicitud pendiente")));

        Boolean activo = jdbc.queryForObject("SELECT activo FROM usuario WHERE id = ?", Boolean.class, tecnicoSoporte);
        assertThat(activo).isTrue();
    }

    @Test
    void desactivarSinCargaRevocaLaSesionDelUsuario() throws Exception {
        MockHttpSession tecnico = sesion("tecnico.soporte@msu.test");
        mvc.perform(get("/api/v1/me").session(tecnico)).andExpect(status().isOk());

        mvc.perform(put("/api/v1/admin/usuarios/" + tecnicoSoporte).session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activo").value(false));

        mvc.perform(get("/api/v1/me").session(tecnico)).andExpect(status().isUnauthorized());
    }

    @Test
    void cambioDeRolInvalidaLaAutorizacionAnterior() throws Exception {
        MockHttpSession supervisor = sesion("supervisor@msu.test");
        long id = jdbc.queryForObject("SELECT id FROM usuario WHERE correo = 'supervisor@msu.test'", Long.class);

        mvc.perform(put("/api/v1/admin/usuarios/" + id).session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rol\":\"TECNICO\",\"area_id\":%d}".formatted(areaSoporte)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rol").value("TECNICO"));

        mvc.perform(get("/api/v1/me").session(supervisor)).andExpect(status().isUnauthorized());
    }

    @Test
    void administradorNoSeDesactivaASiMismo() throws Exception {
        long id = jdbc.queryForObject("SELECT id FROM usuario WHERE correo = 'admin@msu.test'", Long.class);
        mvc.perform(put("/api/v1/admin/usuarios/" + id).session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":false}"))
                .andExpect(status().isConflict());
    }

    @Test
    void otrosRolesNoAccedenALaAdministracion() throws Exception {
        mvc.perform(get("/api/v1/admin/usuarios").session(sesion("supervisor@msu.test")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACCESO_DENEGADO"));
        mvc.perform(get("/api/v1/admin/catalogos/areas").session(sesion("solicitante@msu.test")))
                .andExpect(status().isForbidden());
    }
}
