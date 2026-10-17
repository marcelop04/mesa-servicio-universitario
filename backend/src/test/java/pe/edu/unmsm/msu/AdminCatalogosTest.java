package pe.edu.unmsm.msu;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
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

/** HU21 Mantener los catálogos y ruta DELETE como desactivación lógica (D07, GB05). */
class AdminCatalogosTest extends PruebaApi {

    @Autowired
    JdbcTemplate jdbc;

    MockHttpSession admin;
    long proyector;

    @BeforeEach
    void preparar() throws Exception {
        admin = sesion("admin@msu.test");
        proyector = jdbc.queryForObject("SELECT id FROM categoria WHERE nombre = 'Proyector y multimedia'", Long.class);
    }

    @Test
    void bdd1CategoriaDesactivadaNoSeOfreceYSeConserva() throws Exception {
        jdbc.update("INSERT INTO solicitud (codigo, categoria_id, estado_codigo) VALUES ('MSU-2026-0002', ?, 'CERRADA')",
                proyector);

        mvc.perform(delete("/api/v1/admin/catalogos/categorias/" + proyector).session(admin).with(xsrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activo").value(false));

        mvc.perform(get("/api/v1/catalogos").param("tipo", "categorias").session(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].nombre", not(hasItem("Proyector y multimedia"))));

        mvc.perform(get("/api/v1/admin/catalogos/categorias").param("activo", "false").session(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].nombre", hasItem("Proyector y multimedia")));
    }

    @Test
    void bdd2EstadoObligatorioNoSeEliminaNiDesactiva() throws Exception {
        mvc.perform(delete("/api/v1/admin/catalogos/estados/EN_ATENCION").session(admin).with(xsrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("CATALOGO_FIJO"));
        mvc.perform(put("/api/v1/admin/catalogos/estados/EN_ATENCION").session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":false}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/v1/admin/catalogos/prioridades").session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Urgentísima\"}"))
                .andExpect(status().isConflict());

        mvc.perform(get("/api/v1/catalogos").param("tipo", "estados").session(admin))
                .andExpect(jsonPath("$.length()").value(7))
                .andExpect(jsonPath("$[3].id").value("EN_ATENCION"));
    }

    @Test
    void estadoSoloCambiaSuNombreVisible() throws Exception {
        mvc.perform(put("/api/v1/admin/catalogos/estados/EN_ATENCION").session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"En proceso\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("EN_ATENCION"))
                .andExpect(jsonPath("$.nombre").value("En proceso"));
    }

    @Test
    void crudDeCategoriaConValidaciones() throws Exception {
        long mantenimiento = jdbc.queryForObject("SELECT id FROM area WHERE nombre = 'Mantenimiento'", Long.class);
        mvc.perform(post("/api/v1/admin/catalogos/categorias").session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\" Pintura \",\"area_id\":%d}".formatted(mantenimiento)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nombre").value("Pintura"))
                .andExpect(jsonPath("$.area_nombre").value("Mantenimiento"));

        mvc.perform(post("/api/v1/admin/catalogos/categorias").session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"pintura\",\"area_id\":%d}".formatted(mantenimiento)))
                .andExpect(status().isConflict());

        mvc.perform(post("/api/v1/admin/catalogos/categorias").session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[*].campo", hasItem("nombre")))
                .andExpect(jsonPath("$.errores[*].campo", hasItem("area_id")));
    }

    @Test
    void categoriaUsadaNoCambiaDeArea() throws Exception {
        long mantenimiento = jdbc.queryForObject("SELECT id FROM area WHERE nombre = 'Mantenimiento'", Long.class);
        jdbc.update("INSERT INTO solicitud (codigo, categoria_id, estado_codigo) VALUES ('MSU-2026-0003', ?, 'REGISTRADA')",
                proyector);
        mvc.perform(put("/api/v1/admin/catalogos/categorias/" + proyector).session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"area_id\":%d}".formatted(mantenimiento)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("CATEGORIA_EN_USO"));
    }

    @Test
    void ubicacionUnicaYReactivacion() throws Exception {
        mvc.perform(post("/api/v1/admin/catalogos/ubicaciones").session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"edificio\":\"pabellón a\",\"ambiente\":\"AULA 101\"}"))
                .andExpect(status().isConflict());

        long aula = jdbc.queryForObject("SELECT id FROM ubicacion WHERE ambiente = 'Aula 102'", Long.class);
        mvc.perform(delete("/api/v1/admin/catalogos/ubicaciones/" + aula).session(admin).with(xsrf()))
                .andExpect(jsonPath("$.activo").value(false));
        mvc.perform(put("/api/v1/admin/catalogos/ubicaciones/" + aula).session(admin).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activo").value(true));
    }

    @Test
    void areaDesactivadaOcultaSusCategorias() throws Exception {
        long servicios = jdbc.queryForObject("SELECT id FROM area WHERE nombre = 'Servicios generales'", Long.class);
        mvc.perform(delete("/api/v1/admin/catalogos/areas/" + servicios).session(admin).with(xsrf()))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/catalogos").session(admin))
                .andExpect(jsonPath("$.areas.length()").value(2))
                .andExpect(jsonPath("$.categorias[*].area_nombre", not(hasItem("Servicios generales"))));
    }

    @Test
    void tipoDesconocidoResponde404() throws Exception {
        mvc.perform(get("/api/v1/admin/catalogos/edificios").session(admin))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.codigo").value("NO_ENCONTRADO"));
    }

    @Test
    void cualquierUsuarioAutenticadoConsultaOpcionesActivas() throws Exception {
        mvc.perform(get("/api/v1/catalogos").session(sesion("solicitante@msu.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.areas.length()").value(3))
                .andExpect(jsonPath("$.categorias.length()").value(10))
                .andExpect(jsonPath("$.ubicaciones.length()").value(8))
                .andExpect(jsonPath("$.prioridades[0].id").value("CRITICA"));
    }
}
