package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import pe.edu.unmsm.msu.politicas.servicio.PlazosServicio;

/** Regresión: una publicación submilisegundo no puede quedar "en el futuro" por redondeo SQL. */
@Import(PoliticaPrecisionTest.RelojPreciso.class)
class PoliticaPrecisionTest extends PruebaApi {

    @Autowired
    PlazosServicio plazos;

    @Test
    void laVersionRecienPublicadaEsVigenteEnElMismoInstante() throws Exception {
        mvc.perform(post("/api/v1/admin/politicas").session(sesion("admin@msu.test")).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PoliticasTest.NUEVA.formatted(",\"version_base\":1")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.version").value(2))
                .andExpect(jsonPath("$.vigente_desde").value("2030-01-01T00:00:00.123Z"));
        assertThat(plazos.politicaVigente().getVersion()).isEqualTo(2);
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class RelojPreciso {
        @Bean
        @Primary
        Clock relojPrecisionSql() {
            return Clock.fixed(Instant.parse("2030-01-01T00:00:00.123900Z"), ZoneOffset.UTC);
        }
    }
}
