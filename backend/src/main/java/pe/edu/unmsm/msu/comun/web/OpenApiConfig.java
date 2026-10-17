package pe.edu.unmsm.msu.comun.web;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI documentacion() {
        return new OpenAPI().info(new Info()
                .title("Mesa de Servicios Universitarios - API")
                .version("v1")
                .description("Contratos de la sección 10 del informe. Todas las rutas parten de /api/v1 y los campos JSON usan snake_case, como el diccionario de datos. "
                        + "Las operaciones que modifican datos requieren la cabecera X-XSRF-TOKEN con el valor "
                        + "de la cookie XSRF-TOKEN."));
    }
}
