package pe.edu.unmsm.msu.seguridad;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.CsrfException;
import pe.edu.unmsm.msu.comun.error.ApiError;
import pe.edu.unmsm.msu.comun.web.FiltroCorrelacion;

/** Respuestas 401 y 403 con el formato común de error. */
final class RespuestasSeguridad {

    private RespuestasSeguridad() {
    }

    static AuthenticationEntryPoint sinSesion(ObjectMapper json) {
        return (req, res, ex) -> escribir(json, req, res, 401, "SIN_SESION",
                "Su sesión no es válida o expiró. Inicie sesión nuevamente.");
    }

    static AccessDeniedHandler accesoDenegado(ObjectMapper json) {
        return (req, res, ex) -> {
            if (ex instanceof CsrfException) {
                escribir(json, req, res, 403, "CSRF_INVALIDO",
                        "La petición no incluye un token de seguridad válido. Recargue la página.");
            } else {
                escribir(json, req, res, 403, "ACCESO_DENEGADO", "No tiene permiso para realizar esta operación.");
            }
        };
    }

    private static void escribir(ObjectMapper json, HttpServletRequest req, HttpServletResponse res, int estado,
                                 String codigo, String mensaje) throws IOException {
        res.setStatus(estado);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        json.writeValue(res.getOutputStream(),
                new ApiError(codigo, mensaje, List.of(), FiltroCorrelacion.idDe(req)));
    }
}
