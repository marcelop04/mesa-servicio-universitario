package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Regresión C2: servir el WebJar actualizado, no solo cambiar su versión en Maven. */
class SwaggerSeguridadTest extends PruebaApi {

    @Test
    void paginaSwaggerSigueDisponible() throws Exception {
        mvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("swagger-ui-bundle.js")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"swagger-ui-bundle.js", "swagger-ui-es-bundle.js"})
    void distribuyeDomPurifyCorregido(String archivo) throws Exception {
        mvc.perform(get("/swagger-ui/" + archivo))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("DOMPurify.version=\"3.4.17\"")));
    }

    @Test
    void cspPermitePorHashSoloElEstiloEstaticoDelLogo() throws Exception {
        String estilo = ".logo_small_svg__cls-2{fill:#fff}.logo_small_svg__cls-3{fill:#85ea2d}";
        var respuesta = mvc.perform(get("/swagger-ui/swagger-ui-standalone-preset.js"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(estilo)))
                .andReturn().getResponse();
        String hash = Base64.getEncoder().encodeToString(MessageDigest.getInstance("SHA-256")
                .digest(estilo.getBytes(StandardCharsets.UTF_8)));
        assertThat(respuesta.getHeader("Content-Security-Policy"))
                .contains("'sha256-" + hash + "'")
                .doesNotContain("unsafe-inline", "unsafe-eval");
    }
}
