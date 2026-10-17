package pe.edu.unmsm.msu.seguridad;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;

/**
 * DV04 · JWT firmado con HMAC-SHA256 (RNF02). Lleva el id del usuario, su rol, la versión de
 * autorización (para revocar al cambiar rol, desactivar o cambiar la contraseña) y un identificador
 * único (jti) para revocarlo al cerrar sesión. No contiene datos personales ni la contraseña.
 */
@Component
public class TokenJwt {

    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder D64 = Base64.getUrlDecoder();
    private static final String CABECERA = B64.encodeToString(
            "{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));

    /** Datos verificados de un token válido. */
    public record Reclamos(long usuarioId, String rol, int version, String jti, Instant expira) {
    }

    private final byte[] secreto;
    private final Duration duracion;
    private final Clock reloj;
    private final ObjectMapper json = new ObjectMapper();

    public TokenJwt(@Value("${msu.jwt.secreto}") String secreto, @Value("${msu.jwt.duracion:PT2H}") Duration duracion,
                    Clock reloj) {
        this.secreto = secreto.getBytes(StandardCharsets.UTF_8);
        if (this.secreto.length < 32) {
            throw new IllegalStateException("msu.jwt.secreto (JWT_SECRET) debe tener al menos 32 bytes.");
        }
        this.duracion = duracion;
        this.reloj = reloj;
    }

    public Duration getDuracion() {
        return duracion;
    }

    public String emitir(Usuario u) {
        Instant ahora = Instant.now(reloj);
        Map<String, Object> carga = new LinkedHashMap<>();
        carga.put("sub", String.valueOf(u.getId()));
        carga.put("rol", u.getRol().getCodigo());
        carga.put("ver", u.getVersionAutorizacion());
        carga.put("jti", UUID.randomUUID().toString());
        carga.put("iat", ahora.getEpochSecond());
        carga.put("exp", ahora.plus(duracion).getEpochSecond());
        try {
            String cuerpo = CABECERA + "." + B64.encodeToString(json.writeValueAsBytes(carga));
            return cuerpo + "." + B64.encodeToString(firmar(cuerpo));
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo emitir el token", e);
        }
    }

    /** Firma, algoritmo y vigencia correctos; cualquier otra cosa devuelve vacío. */
    public Optional<Reclamos> verificar(String token) {
        if (token == null) {
            return Optional.empty();
        }
        String[] partes = token.split("\\.");
        if (partes.length != 3 || !CABECERA.equals(partes[0])) {
            return Optional.empty();
        }
        try {
            byte[] esperada = firmar(partes[0] + "." + partes[1]);
            if (!MessageDigest.isEqual(esperada, D64.decode(partes[2]))) {
                return Optional.empty();
            }
            Map<?, ?> carga = json.readValue(D64.decode(partes[1]), Map.class);
            Instant expira = Instant.ofEpochSecond(((Number) carga.get("exp")).longValue());
            if (!Instant.now(reloj).isBefore(expira)) {
                return Optional.empty();
            }
            return Optional.of(new Reclamos(Long.parseLong((String) carga.get("sub")), (String) carga.get("rol"),
                    ((Number) carga.get("ver")).intValue(), (String) carga.get("jti"), expira));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private byte[] firmar(String contenido) throws GeneralSecurityException {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secreto, "HmacSHA256"));
        return mac.doFinal(contenido.getBytes(StandardCharsets.US_ASCII));
    }
}
