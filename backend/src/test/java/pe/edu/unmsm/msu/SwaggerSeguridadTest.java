package pe.edu.unmsm.msu;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
}
