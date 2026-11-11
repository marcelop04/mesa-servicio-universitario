package pe.edu.unmsm.msu;

import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

/** Contrato OpenAPI documentado: esquema de error, seguridad y códigos HTTP por ruta (Emanuel, fase III). */
class OpenApiTest extends PruebaApi {

    static final String ENCUESTA = "$.paths['/api/v1/solicitudes/{id}/encuesta']";

    @Test
    void documentaErroresSeguridadYCodigosHttp() throws Exception {
        mvc.perform(get("/api/v1/openapi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.components.schemas.ErrorApi.properties.id_correlacion").exists())
                .andExpect(jsonPath("$.components.securitySchemes.sesion.name").value("MSU_SESION"))
                .andExpect(jsonPath("$.components.securitySchemes.csrf.name").value("X-XSRF-TOKEN"))
                // Escritura protegida: sesión y CSRF, con 201, 400, 401, 403, 404, 409 y 500.
                .andExpect(jsonPath(ENCUESTA + ".post.security[0].sesion").exists())
                .andExpect(jsonPath(ENCUESTA + ".post.security[0].csrf").exists())
                .andExpect(jsonPath(ENCUESTA + ".post.responses", hasKey("201")))
                .andExpect(jsonPath(ENCUESTA + ".post.responses", hasKey("400")))
                .andExpect(jsonPath(ENCUESTA + ".post.responses", hasKey("401")))
                .andExpect(jsonPath(ENCUESTA + ".post.responses", hasKey("404")))
                .andExpect(jsonPath(ENCUESTA + ".post.responses", hasKey("409")))
                .andExpect(jsonPath(ENCUESTA + ".post.responses['409'].description")
                        .value("ENCUESTA_DUPLICADA o ENCUESTA_NO_DISPONIBLE (no está Cerrada)"))
                .andExpect(jsonPath(ENCUESTA + ".post.responses['409'].content['application/json'].schema['$ref']")
                        .value("#/components/schemas/ErrorApi"))
                // Lectura protegida: sin CSRF ni 409.
                .andExpect(jsonPath(ENCUESTA + ".get.security[0].csrf").doesNotExist())
                .andExpect(jsonPath(ENCUESTA + ".get.responses", not(hasKey("409"))))
                // Inicio de sesión: público, sin 401 y con CSRF.
                .andExpect(jsonPath("$.paths['/api/v1/auth/login'].post.security[0].sesion").doesNotExist())
                .andExpect(jsonPath("$.paths['/api/v1/auth/login'].post.security[0].csrf").exists())
                .andExpect(jsonPath("$.paths['/api/v1/auth/login'].post.responses", not(hasKey("401"))))
                .andExpect(jsonPath("$.paths['/api/v1/admin/politicas'].post.responses", hasKey("400")))
                .andExpect(jsonPath("$.paths['/api/v1/admin/auditoria'].get").exists());
    }
}
