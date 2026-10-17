package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;

/** AX01 · HU04, AX02 · HU05 y AX03 · HU06 (Alex). */
class SolicitudesTest extends PruebaApi {

    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};

    @Autowired
    JdbcTemplate jdbc;

    MockHttpSession solicitante;
    long categoria;
    long ubicacion;

    @BeforeEach
    void preparar() throws Exception {
        solicitante = sesion("solicitante@msu.test");
        categoria = pruebas.categoriaId("Proyector y multimedia");
        ubicacion = jdbc.queryForObject("SELECT id FROM ubicacion WHERE ambiente = 'Aula 101'", Long.class);
    }

    ResultActions registrar(MockHttpSession sesion, String json) throws Exception {
        return mvc.perform(post("/api/v1/solicitudes").session(sesion).with(xsrf())
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    String valida() {
        return """
                {"categoria_id":%d,"ubicacion_id":%d,"referencia":"Junto a la pizarra",
                 "descripcion":"  El proyector del aula 101 no enciende desde la mañana.  ",
                 "impacto":"MEDIO","urgencia":"ALTA"}""".formatted(categoria, ubicacion);
    }

    long crear() throws Exception {
        String json = registrar(solicitante, valida()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(json, "$.id")).longValue();
    }

    @Test
    void hu04Bdd1RegistroCompletoConCodigoPrioridadYLimites() throws Exception {
        String json = registrar(solicitante, valida())
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", matchesPattern("/api/v1/solicitudes/\\d+")))
                .andExpect(jsonPath("$.codigo", matchesPattern("MSU-\\d{4}-\\d{4}")))
                .andExpect(jsonPath("$.estado_codigo").value("REGISTRADA"))
                .andExpect(jsonPath("$.prioridad_codigo").value("ALTA"))
                .andExpect(jsonPath("$.descripcion").value("El proyector del aula 101 no enciende desde la mañana."))
                .andExpect(jsonPath("$.solicitante_nombre").value("Ana Solicitante"))
                .andExpect(jsonPath("$.politica_version").value(1))
                .andReturn().getResponse().getContentAsString();
        Instant registro = Instant.parse(JsonPath.read(json, "$.registrada_en"));
        assertThat(Instant.parse(JsonPath.<String>read(json, "$.limite_atencion"))).isEqualTo(registro.plusSeconds(8 * 3600));
        String codigo = JsonPath.read(json, "$.codigo");

        // Se guarda una vez y aparece en mi listado; el siguiente código es correlativo.
        mvc.perform(get("/api/v1/solicitudes").session(solicitante))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].codigo").value(codigo));
        String siguiente = JsonPath.read(registrar(solicitante, valida()).andReturn().getResponse().getContentAsString(),
                "$.codigo");
        assertThat(Integer.parseInt(siguiente.substring(9))).isEqualTo(Integer.parseInt(codigo.substring(9)) + 1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notificacion WHERE tipo = 'REGISTRO'", Long.class))
                .isEqualTo(2);
    }

    @Test
    void hu04Bdd2SinUbicacionNiDescripcionSuficienteNoSeCrea() throws Exception {
        registrar(solicitante, """
                {"categoria_id":%d,"descripcion":"Muy corta","impacto":"MEDIO","urgencia":"ALTA"}"""
                .formatted(categoria))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[*].campo", hasItem("ubicacion_id")));
        registrar(solicitante, """
                {"categoria_id":%d,"ubicacion_id":%d,"descripcion":"Muy corta","impacto":"ENORME","urgencia":"ALTA"}"""
                .formatted(categoria, ubicacion))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[*].campo", hasItem("descripcion")))
                .andExpect(jsonPath("$.errores[*].campo", hasItem("impacto")));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM solicitud", Long.class)).isZero();
    }

    @Test
    void soloElSolicitanteRegistra() throws Exception {
        registrar(sesion("supervisor@msu.test"), valida()).andExpect(status().isForbidden());
    }

    @Test
    void hu05Bdd1FiltroPersonalSoloDevuelvePropias() throws Exception {
        crear();
        pruebas.crearSolicitante("otro@msu.test");
        MockHttpSession otro = sesion("otro@msu.test");
        registrar(otro, valida()).andExpect(status().isCreated());

        mvc.perform(get("/api/v1/solicitudes").param("estado", "REGISTRADA").session(solicitante))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].solicitante_nombre").value("Ana Solicitante"));
    }

    @Test
    void hu05Bdd2SinResultadosDevuelveListaVacia() throws Exception {
        crear();
        mvc.perform(get("/api/v1/solicitudes").param("estado", "CERRADA").param("desde", "2020-01-01")
                        .param("hasta", "2020-01-31").session(solicitante))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    void hu24Bdd1SolicitudAjenaSeDeniegaSinDatos() throws Exception {
        long id = crear();
        pruebas.crearSolicitante("otro@msu.test");
        mvc.perform(get("/api/v1/solicitudes/" + id).session(sesion("otro@msu.test")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACCESO_DENEGADO"))
                .andExpect(jsonPath("$.descripcion").doesNotExist());
    }

    @Test
    void hu06Bdd1ComentarioConIdentidadYAvisoALosParticipantes() throws Exception {
        long id = crear();
        mvc.perform(post("/api/v1/solicitudes/" + id + "/comentarios").session(solicitante).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"texto\":\"  Sigue sin funcionar.  \"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.texto").value("Sigue sin funcionar."))
                .andExpect(jsonPath("$.autor_nombre").value("Ana Solicitante"));
        mvc.perform(get("/api/v1/solicitudes/" + id + "/comentarios").session(sesion("supervisor@msu.test")))
                .andExpect(jsonPath("$.length()").value(1));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notificacion WHERE tipo = 'COMENTARIO'", Long.class))
                .isEqualTo(1);
        mvc.perform(post("/api/v1/solicitudes/" + id + "/comentarios").session(solicitante).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"texto\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void hu06Bdd2ArchivoQueNoEsImagenSeRechazaYNoSePublica() throws Exception {
        long id = crear();
        MockMultipartFile falso = new MockMultipartFile("archivo", "foto.png", "image/png", "no soy una imagen".getBytes());
        mvc.perform(multipart("/api/v1/solicitudes/" + id + "/evidencias").file(falso).session(solicitante).with(xsrf()))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.codigo").value("TIPO_NO_ADMITIDO"));
        mvc.perform(get("/api/v1/solicitudes/" + id + "/evidencias").session(solicitante))
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void evidenciaValidaHastaTresYDescargaProtegida() throws Exception {
        long id = crear();
        String evidenciaUrl = null;
        for (int i = 1; i <= 3; i++) {
            String json = mvc.perform(multipart("/api/v1/solicitudes/" + id + "/evidencias")
                            .file(new MockMultipartFile("archivo", "foto" + i + ".png", "image/png", PNG))
                            .session(solicitante).with(xsrf()))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.tipo").value("image/png"))
                    .andExpect(jsonPath("$.ruta_privada").doesNotExist())
                    .andReturn().getResponse().getContentAsString();
            evidenciaUrl = JsonPath.read(json, "$.url");
        }
        mvc.perform(multipart("/api/v1/solicitudes/" + id + "/evidencias")
                        .file(new MockMultipartFile("archivo", "cuarta.png", "image/png", PNG))
                        .session(solicitante).with(xsrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("LIMITE_EVIDENCIAS"));

        mvc.perform(get(evidenciaUrl).session(solicitante))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/png"))
                .andExpect(content().bytes(PNG));
        pruebas.crearSolicitante("otro@msu.test");
        mvc.perform(get(evidenciaUrl).session(sesion("otro@msu.test"))).andExpect(status().isForbidden());
    }
}
