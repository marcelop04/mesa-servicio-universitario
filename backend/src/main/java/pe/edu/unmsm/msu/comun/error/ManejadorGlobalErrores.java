package pe.edu.unmsm.msu.comun.error;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import pe.edu.unmsm.msu.comun.web.FiltroCorrelacion;

@RestControllerAdvice
public class ManejadorGlobalErrores {

    private static final Logger log = LoggerFactory.getLogger(ManejadorGlobalErrores.class);

    @ExceptionHandler(ExcepcionApi.class)
    ResponseEntity<ApiError> negocio(ExcepcionApi ex, HttpServletRequest req) {
        return responder(ex.getEstado(), ex.getCodigo(), ex.getMessage(), ex.getErrores(), req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> validacion(MethodArgumentNotValidException ex, HttpServletRequest req) {
        List<ErrorCampo> errores = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> new ErrorCampo(snakeCase(e.getField()), e.getDefaultMessage()))
                .toList();
        return responder(HttpStatus.BAD_REQUEST, "DATOS_INVALIDOS", "Revise los campos marcados.", errores, req);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ApiError> formato(Exception ex, HttpServletRequest req) {
        return responder(HttpStatus.BAD_REQUEST, "FORMATO_INVALIDO",
                "La petición no tiene el formato esperado.", List.of(), req);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiError> integridad(DataIntegrityViolationException ex, HttpServletRequest req) {
        log.warn("Violación de integridad: {}", ex.getMostSpecificCause().getMessage());
        return responder(HttpStatus.CONFLICT, "CONFLICTO_INTEGRIDAD",
                "La operación entra en conflicto con datos existentes.", List.of(), req);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiError> accesoDenegado(AccessDeniedException ex, HttpServletRequest req) {
        return responder(HttpStatus.FORBIDDEN, "ACCESO_DENEGADO",
                "No tiene permiso para realizar esta operación.", List.of(), req);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiError> rutaInexistente(NoResourceFoundException ex, HttpServletRequest req) {
        return responder(HttpStatus.NOT_FOUND, "NO_ENCONTRADO", "El recurso solicitado no existe.", List.of(), req);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiError> metodo(HttpRequestMethodNotSupportedException ex, HttpServletRequest req) {
        return responder(HttpStatus.METHOD_NOT_ALLOWED, "METODO_NO_PERMITIDO",
                "El método no está disponible para este recurso.", List.of(), req);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> inesperado(Exception ex, HttpServletRequest req) {
        log.error("Error no controlado", ex);
        return responder(HttpStatus.INTERNAL_SERVER_ERROR, "ERROR_INTERNO",
                "Ocurrió un error inesperado. Intente nuevamente.", List.of(), req);
    }

    /** Los errores por campo usan el mismo nombre que el JSON de entrada (snake_case). */
    static String snakeCase(String campo) {
        return campo.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase();
    }

    private ResponseEntity<ApiError> responder(HttpStatus estado, String codigo, String mensaje,
                                               List<ErrorCampo> errores, HttpServletRequest req) {
        return ResponseEntity.status(estado)
                .body(new ApiError(codigo, mensaje, errores, FiltroCorrelacion.idDe(req)));
    }
}
