package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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

/** HU23 · Auditoría administrativa (Emanuel, fase III). */
class AuditoriaTest extends PruebaApi {

    @Autowired
    JdbcTemplate jdbc;

    MockHttpSession admin;

    @BeforeEach
    void preparar() throws Exception {
        admin = sesion("admin@msu.test");
    }

    String auditoria(String filtros) throws Exception {
        return mvc.perform(get("/api/v1/admin/auditoria" + filtros).session(admin))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    @Test
    void cambioAdministrativoQuedaTrazableConActorYValores() throws Exception {
        long tecnico = pruebas.usuarioId("tecnico.soporte@msu.test");
        mvc.perform(put("/api/v1/admin/usuarios/" + tecnico).session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Técnico Renombrado\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/auditoria").param("accion", "USUARIO_ACTUALIZAR").session(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].actor_correo").value("admin@msu.test"))
                .andExpect(jsonPath("$.items[0].entidad").value("USUARIO"))
                .andExpect(jsonPath("$.items[0].entidad_id").value(String.valueOf(tecnico)))
                .andExpect(jsonPath("$.items[0].metadatos.cambios.nombre.nuevo").value("Técnico Renombrado"))
                .andExpect(jsonPath("$.items[0].metadatos.cambios.nombre.anterior").isNotEmpty())
                .andExpect(jsonPath("$.items[0].creada_en").isNotEmpty());
    }

    @Test
    void hu23Bdd2AccesosRegistradosNoMuestranContrasenasNiTokens() throws Exception {
        mvc.perform(post("/api/v1/auth/login").with(xsrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"solicitante@msu.test\",\"password\":\"ClaveEquivocada1!\"}"))
                .andExpect(status().isUnauthorized());
        MockHttpSession solicitante = sesion("solicitante@msu.test");
        mvc.perform(put("/api/v1/me/password").session(solicitante).with(xsrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"actual\":\"Demo12345!\",\"nueva\":\"OtraClave123!\",\"confirmacion\":\"OtraClave123!\"}"))
                .andExpect(status().is2xxSuccessful());

        String json = auditoria("?tamano=100");
        assertThat(json).contains("SESION_RECHAZADA", "SESION_INICIAR", "CUENTA_CAMBIAR_CLAVE_ACCESO")
                .doesNotContain("Demo12345!", "ClaveEquivocada1!", "OtraClave123!", "$2a$", "$2b$",
                        "password", "token", "MSU_SESION");
        String hash = jdbc.queryForObject("SELECT password_hash FROM usuario WHERE correo = 'solicitante@msu.test'",
                String.class);
        assertThat(json).doesNotContain(hash);
        mvc.perform(get("/api/v1/admin/auditoria").param("accion", "SESION_RECHAZADA").session(admin))
                .andExpect(jsonPath("$.items[0].metadatos.correo").value("solicitante@msu.test"))
                .andExpect(jsonPath("$.items[0].actor_id").doesNotExist());
    }

    @Test
    void catalogosYExportacionesSeAuditan() throws Exception {
        long categoria = pruebas.categoriaId("Proyector y multimedia");
        mvc.perform(delete("/api/v1/admin/catalogos/categorias/" + categoria).session(admin).with(xsrf()))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/reportes/solicitudes.csv").param("estado", "PENDIENTES")
                .session(sesion("supervisor@msu.test"))).andExpect(status().isOk());

        mvc.perform(get("/api/v1/admin/auditoria").param("entidad", "categoria").session(admin))
                .andExpect(jsonPath("$.items[0].accion").value("CATALOGO_DESACTIVAR"))
                .andExpect(jsonPath("$.items[0].metadatos.nombre").value("Proyector y multimedia"))
                .andExpect(jsonPath("$.items[0].metadatos.activo").value(false));
        mvc.perform(get("/api/v1/admin/auditoria").param("accion", "REPORTE_EXPORTAR").session(admin))
                .andExpect(jsonPath("$.items[0].actor_correo").value("supervisor@msu.test"))
                .andExpect(jsonPath("$.items[0].metadatos.filtros.estado").value("PENDIENTES"));
    }

    @Test
    void filtraPorActorYFechasYOfreceLasOpciones() throws Exception {
        mvc.perform(get("/api/v1/admin/auditoria").param("actor", "SUPERVISOR@").session(admin))
                .andExpect(status().isOk());
        sesion("supervisor@msu.test");
        mvc.perform(get("/api/v1/admin/auditoria").param("actor", "supervisor@").param("accion", "SESION_INICIAR")
                        .session(admin))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[*].actor_correo", everyItem(is("supervisor@msu.test"))));
        mvc.perform(get("/api/v1/admin/auditoria").param("desde", "2026-11-10").param("hasta", "2026-11-01")
                        .session(admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("hasta"));
        mvc.perform(get("/api/v1/admin/auditoria/opciones").session(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.acciones").isArray());
    }

    @Test
    void soloElAdministradorConsultaYNoHayEdicionNiBorrado() throws Exception {
        mvc.perform(get("/api/v1/admin/auditoria").session(sesion("supervisor@msu.test")))
                .andExpect(status().isForbidden());
        long id = jdbc.queryForObject("SELECT MAX(id) FROM auditoria", Long.class);
        mvc.perform(delete("/api/v1/admin/auditoria/" + id).session(admin).with(xsrf()))
                .andExpect(status().is4xxClientError());
        mvc.perform(put("/api/v1/admin/auditoria/" + id).session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"accion\":\"OTRA\"}"))
                .andExpect(status().is4xxClientError());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM auditoria WHERE id = ?", Long.class, id)).isEqualTo(1);
    }
}
