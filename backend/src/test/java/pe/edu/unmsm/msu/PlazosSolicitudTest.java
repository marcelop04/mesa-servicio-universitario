package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;
import pe.edu.unmsm.msu.politicas.entidad.Politica;
import pe.edu.unmsm.msu.politicas.repositorio.PoliticaRepositorio;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;

/** MR02 · HU14 Calcular los plazos del caso, y recálculo de plazos por cambio de prioridad (RN05). */
class PlazosSolicitudTest extends PruebaApi {

    static final Instant OCHO_AM_LIMA = Instant.parse("2026-10-16T13:00:00Z");

    @Autowired
    PoliticaRepositorio politicas;

    @Autowired
    UsuarioRepositorio usuarios;

    @Test
    void bdd1LimitesInicialesYCopiaDeLaPolitica() {
        Solicitud s = pruebas.crear("Conectividad y red", "MEDIO", "ALTA", OCHO_AM_LIMA);

        assertThat(s.getPrioridadCodigo()).isEqualTo("ALTA");
        assertThat(s.getLimiteAtencion()).isEqualTo(Instant.parse("2026-10-16T21:00:00Z"));
        assertThat(s.getLimiteResolucion()).isEqualTo(Instant.parse("2026-10-18T13:00:00Z"));
        assertThat(s.getPolitica().getVersion()).isEqualTo(1);
        assertThat(s.getMatrizAplicada()).containsOnlyKeys("CRITICA", "ALTA", "MEDIA", "BAJA");
        assertThat(s.getMatrizAplicada().get("CRITICA")).containsEntry("horas_primera_atencion", 4)
                .containsEntry("horas_resolucion", 24);
    }

    @Test
    void bdd2NuevaPoliticaNoCambiaCasosExistentes() throws Exception {
        Solicitud existente = pruebas.crear("Conectividad y red", "MEDIO", "MEDIA", OCHO_AM_LIMA);
        publicarPoliticaV2();

        Solicitud nueva = pruebas.crear("Conectividad y red", "MEDIO", "MEDIA", OCHO_AM_LIMA);
        assertThat(nueva.getPolitica().getVersion()).isEqualTo(2);
        assertThat(nueva.getLimiteAtencion()).isEqualTo(OCHO_AM_LIMA.plusSeconds(12 * 3600));

        MockHttpSession supervisor = sesion("supervisor@msu.test");
        mvc.perform(get("/api/v1/solicitudes/" + existente.getId()).session(supervisor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.politica_version").value(1))
                .andExpect(jsonPath("$.limite_atencion").value("2026-10-17T13:00:00Z"))
                .andExpect(jsonPath("$.matriz_aplicada.MEDIA.horas_primera_atencion").value(24));

        // RN05: el recálculo usa la matriz guardada en el caso (v1: Alta = 8 h), no la política global (v2: 2 h).
        mvc.perform(post("/api/v1/solicitudes/" + existente.getId() + "/evaluacion").session(supervisor).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"impacto":"ALTO","urgencia":"MEDIA","motivo":"Afecta a todo el pabellón B",
                                 "version":%d}""".formatted(existente.getVersion())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.prioridad_codigo").value("ALTA"))
                .andExpect(jsonPath("$.limite_atencion").value("2026-10-16T21:00:00Z"))
                .andExpect(jsonPath("$.politica_version").value(1));
    }

    private void publicarPoliticaV2() {
        Politica v2 = new Politica(2, Instant.now().minusSeconds(1),
                usuarios.findByCorreo("admin@msu.test").orElseThrow());
        v2.agregarDetalle("CRITICA", 1, 12);
        v2.agregarDetalle("ALTA", 2, 24);
        v2.agregarDetalle("MEDIA", 12, 72);
        v2.agregarDetalle("BAJA", 24, 120);
        politicas.saveAndFlush(v2);
    }
}
