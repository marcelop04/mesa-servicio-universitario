package pe.edu.unmsm.msu.comun.web;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.examples.Example;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.media.ArraySchema;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Contrato OpenAPI de la API (sección 10 del informe). Además de lo que cada controlador declara, aquí se completan
 * de forma uniforme (Emanuel, fase III):
 * <ul>
 *   <li>El esquema común de error {@code ErrorApi} y un ejemplo por código HTTP (400, 401, 403, 404, 409, 500).</li>
 *   <li>La seguridad: cookie HttpOnly {@code MSU_SESION} con el JWT y cabecera {@code X-XSRF-TOKEN} en las escrituras.</li>
 *   <li>Las respuestas de error que aplican a cada ruta según su método, si exige sesión y si tiene identificador.</li>
 * </ul>
 * Un controlador puede declarar su propia respuesta para un código; en ese caso no se reemplaza.
 */
@Configuration
public class OpenApiConfig {

    static final String ESQUEMA_ERROR = "ErrorApi";
    static final String SESION = "sesion";
    static final String CSRF = "csrf";

    /** Rutas que no exigen sesión (regla permitAll de SeguridadConfig). */
    static final Set<String> PUBLICAS = Set.of("/api/v1/auth/login", "/api/v1/auth/csrf", "/api/v1/auth/registro");

    @Bean
    OpenAPI documentacion() {
        return new OpenAPI()
                .info(new Info()
                        .title("Mesa de Servicios Universitarios - API")
                        .version("v1")
                        .description("""
                                API REST del Sistema Web para la Gestión Integral de Servicios Universitarios.

                                * Todas las rutas parten de `/api/v1`, usan JSON (salvo la carga de imágenes y las \
                                descargas) y los campos van en `snake_case`, como el diccionario de datos.
                                * **Sesión:** `POST /auth/login` entrega la cookie HttpOnly `MSU_SESION` con un JWT de dos \
                                horas. El navegador la envía sola; en Swagger basta con iniciar sesión primero.
                                * **CSRF:** las operaciones que modifican datos (POST, PUT y DELETE) requieren la cabecera \
                                `X-XSRF-TOKEN` con el valor de la cookie `XSRF-TOKEN` (se obtiene con `GET /auth/csrf`).
                                * **Errores:** siempre con el formato `ErrorApi`: código estable, mensaje comprensible, \
                                errores por campo e identificador de correlación para ubicar la petición en los logs.
                                * **Paginación:** `pagina` empieza en 1; `tamano` por defecto 20 y máximo 100. La respuesta \
                                trae `items`, `pagina`, `tamaño` y `total`.
                                * **Concurrencia:** las acciones sobre una solicitud envían su `version`; si otra persona \
                                la cambió, la API responde 409 `CONFLICTO_VERSION` (HU24).""")
                        .contact(new Contact().name("Equipo Mesa de Servicios Universitarios")
                                .url("https://github.com/marcelop04/mesa-servicios-universitarios"))
                        .license(new License().name("Uso académico")))
                .components(new Components()
                        .addSecuritySchemes(SESION, new SecurityScheme().type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.COOKIE).name("MSU_SESION")
                                .description("JWT HS256 en cookie HttpOnly, SameSite=Lax; dura dos horas y se revoca al "
                                        + "cerrar sesión o al cambiar rol, área o contraseña."))
                        .addSecuritySchemes(CSRF, new SecurityScheme().type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER).name("X-XSRF-TOKEN")
                                .description("Mismo valor que la cookie XSRF-TOKEN. Obligatorio en POST, PUT y DELETE.")));
    }

    /** Completa seguridad y respuestas de error de todas las operaciones. */
    @Bean
    OpenApiCustomizer respuestasComunes() {
        return api -> {
            if (api.getPaths() == null) {
                return;
            }
            // Se agrega aquí y no en el bean base: springdoc descarta los esquemas que aún no tienen referencias.
            if (api.getComponents() == null) {
                api.setComponents(new Components());
            }
            api.getComponents().addSchemas(ESQUEMA_ERROR, esquemaError());
            api.getPaths().forEach((ruta, item) -> item.readOperationsMap().forEach((metodo, op) ->
                    completar(ruta, metodo, op)));
        };
    }

    static void completar(String ruta, PathItem.HttpMethod metodo, Operation op) {
        boolean publica = PUBLICAS.contains(ruta);
        boolean escritura = metodo != PathItem.HttpMethod.GET && metodo != PathItem.HttpMethod.HEAD
                && metodo != PathItem.HttpMethod.OPTIONS;
        SecurityRequirement requisito = new SecurityRequirement();
        if (!publica) {
            requisito.addList(SESION);
        }
        if (escritura) {
            requisito.addList(CSRF);
        }
        op.setSecurity(requisito.isEmpty() ? List.of() : List.of(requisito));

        ApiResponses respuestas = op.getResponses() == null ? new ApiResponses() : op.getResponses();
        if (escritura || tieneParametros(op)) {
            agregar(respuestas, "400", "Datos inválidos: el cuerpo indica cada campo con su mensaje.", "DATOS_INVALIDOS",
                    "Revise los campos marcados.", true);
        }
        if (!publica) {
            agregar(respuestas, "401", "Sin sesión, sesión vencida o revocada.", "SIN_SESION",
                    "Su sesión no es válida o expiró. Inicie sesión nuevamente.", false);
            agregar(respuestas, "403", "Rol o recurso no autorizado, o token CSRF ausente o inválido.", "ACCESO_DENEGADO",
                    "No tiene permiso para realizar esta operación.", false);
        } else if (escritura) {
            agregar(respuestas, "403", "Token CSRF ausente o inválido.", "CSRF_INVALIDO",
                    "La petición no incluye un token de seguridad válido. Recargue la página.", false);
        }
        if (ruta.contains("{")) {
            agregar(respuestas, "404", "El recurso indicado no existe.", "NO_ENCONTRADO", "La solicitud no existe.", false);
        }
        if (escritura && !publica) {
            agregar(respuestas, "409", "Conflicto de negocio o de versión; el código del cuerpo indica la causa.",
                    "CONFLICTO_VERSION",
                    "Otro usuario modificó estos datos. Recargue y revise el cambio antes de continuar.", false);
        }
        agregar(respuestas, "500", "Error inesperado; el identificador de correlación permite ubicarlo en los logs.",
                "ERROR_INTERNO", "Ocurrió un error inesperado. Intente nuevamente.", false);
        op.setResponses(respuestas);
    }

    private static boolean tieneParametros(Operation op) {
        return op.getParameters() != null && !op.getParameters().isEmpty();
    }

    private static void agregar(ApiResponses respuestas, String codigoHttp, String descripcion, String codigo,
                                String mensaje, boolean conCampo) {
        if (respuestas.containsKey(codigoHttp) && respuestas.get(codigoHttp).getContent() != null) {
            return;
        }
        ApiResponse existente = respuestas.get(codigoHttp);
        Map<String, Object> ejemplo = new LinkedHashMap<>();
        ejemplo.put("codigo", codigo);
        ejemplo.put("mensaje", mensaje);
        ejemplo.put("errores", conCampo ? List.of(Map.of("campo", "descripcion",
                "mensaje", "Describe el problema con al menos 20 caracteres.")) : List.of());
        ejemplo.put("id_correlacion", "4f2b9c1e-8a7d-4e55-9a51-2c4e3a7b1d90");
        respuestas.addApiResponse(codigoHttp, new ApiResponse()
                .description(existente != null && existente.getDescription() != null ? existente.getDescription() : descripcion)
                .content(new Content().addMediaType("application/json", new MediaType()
                        .schema(new Schema<>().$ref("#/components/schemas/" + ESQUEMA_ERROR))
                        .addExamples(codigo, new Example().value(ejemplo)))));
    }

    @SuppressWarnings("rawtypes")
    private static Schema esquemaError() {
        ObjectSchema errorCampo = new ObjectSchema();
        errorCampo.addProperty("campo", new StringSchema().description("Nombre del campo en snake_case").example("descripcion"));
        errorCampo.addProperty("mensaje", new StringSchema().example("Describe el problema con al menos 20 caracteres."));
        ObjectSchema error = new ObjectSchema();
        error.description("Formato común de error (sección 10.3). Nunca incluye trazas internas.");
        error.addProperty("codigo", new StringSchema().description("Código estable para la interfaz").example("DATOS_INVALIDOS"));
        error.addProperty("mensaje", new StringSchema().description("Mensaje comprensible para el usuario"));
        error.addProperty("errores", new ArraySchema().items(errorCampo));
        error.addProperty("id_correlacion", new StringSchema().description("Cabecera X-Correlation-Id de la petición"));
        error.setRequired(List.of("codigo", "mensaje", "errores"));
        return error;
    }
}
