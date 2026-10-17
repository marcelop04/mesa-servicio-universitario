package pe.edu.unmsm.msu.comun.error;

import java.util.List;
import org.springframework.http.HttpStatus;

/** Error de negocio que el manejador global traduce al formato común. */
public class ExcepcionApi extends RuntimeException {

    private final HttpStatus estado;
    private final String codigo;
    private final List<ErrorCampo> errores;

    public ExcepcionApi(HttpStatus estado, String codigo, String mensaje, List<ErrorCampo> errores) {
        super(mensaje);
        this.estado = estado;
        this.codigo = codigo;
        this.errores = errores == null ? List.of() : List.copyOf(errores);
    }

    public static ExcepcionApi noEncontrado(String mensaje) {
        return new ExcepcionApi(HttpStatus.NOT_FOUND, "NO_ENCONTRADO", mensaje, null);
    }

    public static ExcepcionApi conflicto(String codigo, String mensaje) {
        return new ExcepcionApi(HttpStatus.CONFLICT, codigo, mensaje, null);
    }

    public static ExcepcionApi datosInvalidos(List<ErrorCampo> errores) {
        return new ExcepcionApi(HttpStatus.BAD_REQUEST, "DATOS_INVALIDOS",
                "Revise los campos marcados.", errores);
    }

    public static ExcepcionApi datoInvalido(String campo, String mensaje) {
        return datosInvalidos(List.of(new ErrorCampo(campo, mensaje)));
    }

    public HttpStatus getEstado() {
        return estado;
    }

    public String getCodigo() {
        return codigo;
    }

    public List<ErrorCampo> getErrores() {
        return errores;
    }
}
