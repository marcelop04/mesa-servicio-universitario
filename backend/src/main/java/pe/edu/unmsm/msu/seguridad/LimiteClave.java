package pe.edu.unmsm.msu.seguridad;

import java.nio.charset.StandardCharsets;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;

/**
 * BCrypt solo admite 72 bytes. Una contraseña de hasta 64 caracteres puede superarlos si usa
 * tildes, eñes o emojis (2 a 4 bytes cada uno); sin esta comprobación el cifrado fallaba con un
 * error interno en vez de un error de validación.
 */
public final class LimiteClave {

    public static final int BYTES_MAXIMOS = 72;

    private LimiteClave() {
    }

    public static void exigir(String campo, String clave) {
        if (clave != null && clave.getBytes(StandardCharsets.UTF_8).length > BYTES_MAXIMOS) {
            throw ExcepcionApi.datoInvalido(campo,
                    "La contraseña es demasiado larga: use menos caracteres especiales o acórtela.");
        }
    }
}
