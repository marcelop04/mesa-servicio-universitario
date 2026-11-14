package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;

/** C4 / RNF01: las denegaciones se prueban con JWT real, filtros y servicios, no solo con la interfaz. */
class AccesosPorRolTest extends PruebaApi {

    @Autowired JdbcTemplate jdbc;

    @ParameterizedTest(name = "{0} no puede consultar {1}")
    @CsvSource({
            "solicitante, /admin/usuarios", "solicitante, /admin/catalogos/areas",
            "solicitante, /admin/politicas", "solicitante, /admin/auditoria",
            "tecnico.soporte, /admin/usuarios", "tecnico.soporte, /admin/catalogos/areas",
            "tecnico.soporte, /admin/politicas", "tecnico.soporte, /admin/auditoria",
            "supervisor, /admin/usuarios", "supervisor, /admin/catalogos/areas",
            "supervisor, /admin/politicas", "supervisor, /admin/auditoria",
            "solicitante, /supervision/tecnicos", "solicitante, /indicadores",
            "solicitante, /reportes/solicitudes.csv", "tecnico.soporte, /supervision/tecnicos",
            "tecnico.soporte, /indicadores", "tecnico.soporte, /reportes/solicitudes.csv",
            "admin, /supervision/tecnicos", "admin, /indicadores", "admin, /reportes/solicitudes.csv"
    })
    void rechazaLecturasDeOtroRol(String cuenta, String ruta) throws Exception {
        mvc.perform(get("/api/v1" + ruta).session(sesion(cuenta + "@msu.test")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACCESO_DENEGADO"))
                .andExpect(jsonPath("$.items").doesNotExist())
                .andExpect(jsonPath("$.password_hash").doesNotExist());
    }

    @ParameterizedTest
    @ValueSource(strings = {"solicitante", "tecnico.soporte", "supervisor"})
    void noAdministradorNoEscribeCatalogosNiPoliticas(String cuenta) throws Exception {
        var actor = sesion(cuenta + "@msu.test");
        long antes = jdbc.queryForObject("SELECT COUNT(*) FROM area", Long.class);
        long politicas = jdbc.queryForObject("SELECT COUNT(*) FROM politica", Long.class);
        long auditorias = jdbc.queryForObject("SELECT COUNT(*) FROM auditoria", Long.class);
        mvc.perform(post("/api/v1/admin/catalogos/areas").session(actor).with(xsrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"No debe crearse\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/politicas").session(actor).with(xsrf())
                .contentType(MediaType.APPLICATION_JSON).content(PoliticasTest.NUEVA.formatted(",\"version_base\":1")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACCESO_DENEGADO"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM area", Long.class)).isEqualTo(antes);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM politica", Long.class)).isEqualTo(politicas);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM auditoria", Long.class))
                .isEqualTo(auditorias);
    }

    @ParameterizedTest
    @ValueSource(strings = {"solicitante", "tecnico.soporte", "supervisor"})
    void ningunRolNoAdministradorPuedeElevarSusPropiosPrivilegios(String cuenta) throws Exception {
        long id = pruebas.usuarioId(cuenta + "@msu.test");
        var actor = sesion(cuenta + "@msu.test");
        var antes = jdbc.queryForMap("SELECT rol_id, version_autorizacion, activo FROM usuario WHERE id = ?", id);
        long auditorias = jdbc.queryForObject("SELECT COUNT(*) FROM auditoria", Long.class);

        mvc.perform(put("/api/v1/admin/usuarios/" + id).session(actor).with(xsrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"rol\":\"ADMINISTRADOR\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACCESO_DENEGADO"));

        assertThat(jdbc.queryForMap("SELECT rol_id, version_autorizacion, activo FROM usuario WHERE id = ?", id))
                .isEqualTo(antes);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM auditoria", Long.class))
                .isEqualTo(auditorias);
        // La denegación tampoco convierte el JWT anterior en una sesión privilegiada.
        mvc.perform(get("/api/v1/admin/auditoria").session(actor)).andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/solicitudes", "/notificaciones", "/admin/usuarios", "/admin/politicas",
            "/admin/auditoria", "/indicadores"})
    void lecturaPrivadaSinJwtNoExponeDatos(String ruta) throws Exception {
        mvc.perform(get("/api/v1" + ruta))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("SIN_SESION"))
                .andExpect(jsonPath("$.id_correlacion").isNotEmpty())
                .andExpect(jsonPath("$.items").doesNotExist());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ajeno-c4", "tecnico.soporte", "supervisor", "admin"})
    void ningunActorDistintoDelPropietarioInsertaEncuestas(String cuenta) throws Exception {
        long id = pruebas.crearConEstado(pruebas.categoriaId("Proyector y multimedia"), "CERRADA",
                pruebas.usuarioId("tecnico.soporte@msu.test"));
        if (cuenta.equals("ajeno-c4")) pruebas.crearSolicitante(cuenta + "@msu.test");
        var antes = jdbc.queryForMap("SELECT estado_codigo, version FROM solicitud WHERE id = ?", id);

        mvc.perform(post("/api/v1/solicitudes/" + id + "/encuesta")
                .session(sesion(cuenta + "@msu.test")).with(xsrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"calificacion\":4,\"comentario\":\"Intento ajeno\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACCESO_DENEGADO"));

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM encuesta WHERE solicitud_id = ?", Long.class, id))
                .isZero();
        assertThat(jdbc.queryForMap("SELECT estado_codigo, version FROM solicitud WHERE id = ?", id))
                .isEqualTo(antes);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ausente", "distinto"})
    void cerrarSesionConCsrfInvalidoNoRevocaElJwt(String cabecera) throws Exception {
        var actor = sesion("supervisor@msu.test");
        long antes = jdbc.queryForObject("SELECT COUNT(*) FROM revocacion_sesion", Long.class);
        var peticion = post("/api/v1/auth/logout").session(actor)
                .cookie(new Cookie("XSRF-TOKEN", "fixture-c4-cookie"));
        if (cabecera.equals("distinto")) peticion.header("X-XSRF-TOKEN", "fixture-c4-otro-token");

        mvc.perform(peticion).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("CSRF_INVALIDO"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM revocacion_sesion", Long.class)).isEqualTo(antes);
        mvc.perform(get("/api/v1/me").session(actor)).andExpect(status().isOk());
    }

    @Test
    void jwtRevocadoNoPermiteEscrituraAunqueElCsrfSeaValido() throws Exception {
        var s = pruebas.crear("Proyector y multimedia", "MEDIO", "MEDIA", Instant.now());
        var actor = sesion("solicitante@msu.test");
        mvc.perform(post("/api/v1/auth/logout").session(actor).with(xsrf()))
                .andExpect(status().isNoContent());
        // Reenvía deliberadamente la cookie anterior, no una sesión anónima nueva.
        mvc.perform(post("/api/v1/solicitudes/" + s.getId() + "/comentarios").session(actor).with(xsrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"texto\":\"No debe guardarse\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("SIN_SESION"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM comentario WHERE solicitud_id = ?",
                Long.class, s.getId())).isZero();
    }

    @ParameterizedTest
    @ValueSource(strings = {"solicitante", "tecnico.soporte", "admin"})
    void soloSupervisorEvaluaAsignaYCancelaSinEfectosLaterales(String cuenta) throws Exception {
        var s = pruebas.crear("Proyector y multimedia", "MEDIO", "MEDIA", Instant.now());
        var actor = sesion(cuenta + "@msu.test");
        for (String accion : List.of("evaluacion", "asignaciones", "cancelacion")) {
            mvc.perform(post("/api/v1/solicitudes/" + s.getId() + "/" + accion).session(actor).with(xsrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"version\":0,\"tecnico_id\":1,\"motivo\":\"Intento no autorizado\"}"))
                    .andExpect(status().isForbidden());
        }
        assertThat(jdbc.queryForObject("SELECT estado_codigo FROM solicitud WHERE id = ?", String.class, s.getId()))
                .isEqualTo("REGISTRADA");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM evento_operativo WHERE solicitud_id = ?",
                Long.class, s.getId())).isZero();
    }

    @ParameterizedTest
    @ValueSource(strings = {"solicitante", "supervisor", "admin"})
    void soloTecnicoPuedeIniciarYResolver(String cuenta) throws Exception {
        long id = pruebas.crearConEstado(pruebas.categoriaId("Proyector y multimedia"), "ASIGNADA",
                pruebas.usuarioId("tecnico.soporte@msu.test"));
        var actor = sesion(cuenta + "@msu.test");
        for (String accion : List.of("inicio", "resoluciones")) {
            mvc.perform(post("/api/v1/solicitudes/" + id + "/" + accion).session(actor).with(xsrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"version\":0,\"solucion\":\"Una solución que no debe guardarse.\"}"))
                    .andExpect(status().isForbidden());
        }
        assertThat(jdbc.queryForObject("SELECT estado_codigo FROM solicitud WHERE id = ?", String.class, id))
                .isEqualTo("ASIGNADA");
    }

    @Test
    void solicitanteAjenoNoLeeNiComentaNiSubeArchivosEnCasoDeOtro() throws Exception {
        var s = pruebas.crear("Proyector y multimedia", "MEDIO", "MEDIA", Instant.now());
        pruebas.crearSolicitante("ajeno-c4@msu.test");
        var ajeno = sesion("ajeno-c4@msu.test");
        for (String sufijo : List.of("", "/historial", "/comentarios", "/evidencias", "/encuesta")) {
            mvc.perform(get("/api/v1/solicitudes/" + s.getId() + sufijo).session(ajeno))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.descripcion").doesNotExist());
        }
        mvc.perform(post("/api/v1/solicitudes/" + s.getId() + "/comentarios").session(ajeno).with(xsrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"texto\":\"Intento ajeno\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(multipart("/api/v1/solicitudes/" + s.getId() + "/evidencias")
                .file(new MockMultipartFile("archivo", "intento.png", "image/png", SolicitudesTest.PNG))
                .session(ajeno).with(xsrf())).andExpect(status().isForbidden());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM comentario WHERE solicitud_id = ?",
                Long.class, s.getId())).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM evidencia WHERE solicitud_id = ?",
                Long.class, s.getId())).isZero();
    }

    @Test
    void administradorNoHeredaPermisosOperativos() throws Exception {
        var s = pruebas.crear("Proyector y multimedia", "MEDIO", "MEDIA", Instant.now());
        var admin = sesion("admin@msu.test");
        for (String ruta : List.of("/solicitudes", "/solicitudes/" + s.getId(),
                "/solicitudes/" + s.getId() + "/historial", "/solicitudes/" + s.getId() + "/evidencias")) {
            mvc.perform(get("/api/v1" + ruta).session(admin)).andExpect(status().isForbidden());
        }
    }

    @Test
    void tecnicoPierdeAccesoInmediatamenteAlRetirarseLaAsignacionIncluidaDescarga() throws Exception {
        long id = pruebas.crearConEstado(pruebas.categoriaId("Proyector y multimedia"), "ASIGNADA",
                pruebas.usuarioId("tecnico.soporte@msu.test"));
        var tecnico = sesion("tecnico.soporte@msu.test");
        String respuesta = mvc.perform(multipart("/api/v1/solicitudes/" + id + "/evidencias")
                .file(new MockMultipartFile("archivo", "prueba.png", "image/png", SolicitudesTest.PNG))
                .session(sesion("solicitante@msu.test")).with(xsrf()))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        Number evidencia = com.jayway.jsonpath.JsonPath.read(respuesta, "$.id");
        mvc.perform(get("/api/v1/evidencias/" + evidencia + "/archivo").session(tecnico))
                .andExpect(status().isOk());
        pruebas.sql("UPDATE solicitud SET tecnico_id = NULL WHERE id = ?", id);
        for (String sufijo : List.of("", "/historial", "/comentarios", "/evidencias", "/encuesta")) {
            mvc.perform(get("/api/v1/solicitudes/" + id + sufijo).session(tecnico))
                    .andExpect(status().isForbidden());
        }
        mvc.perform(get("/api/v1/evidencias/" + evidencia + "/archivo").session(tecnico))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/solicitudes/" + id + "/inicio").session(tecnico).with(xsrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"version\":0}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void noSePuedeMarcarNiEliminarUnaNotificacionAjena() throws Exception {
        var s = pruebas.crear("Proyector y multimedia", "MEDIO", "MEDIA", Instant.now());
        jdbc.update("INSERT INTO notificacion (usuario_id, solicitud_id, tipo, texto, version_fechas, creada_en,"
                        + " clave_evento) VALUES (?, ?, 'REGISTRO', 'Aviso privado', 1, CURRENT_TIMESTAMP, 'c4-aviso')",
                pruebas.usuarioId("solicitante@msu.test"), s.getId());
        long aviso = jdbc.queryForObject("SELECT id FROM notificacion WHERE clave_evento = 'c4-aviso'", Long.class);
        var ajeno = sesion("supervisor@msu.test");
        mvc.perform(put("/api/v1/notificaciones/" + aviso + "/lectura").session(ajeno).with(xsrf()))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/notificaciones/" + aviso).session(ajeno).with(xsrf()))
                .andExpect(status().isForbidden());
        assertThat(jdbc.queryForObject("SELECT leida_en FROM notificacion WHERE id = ?", Instant.class, aviso)).isNull();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notificacion WHERE id = ?", Long.class, aviso)).isOne();
    }
}
