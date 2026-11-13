package pe.edu.unmsm.msu.seguridad;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Component;

/** Solo acepta X-Real-IP si la conexión proviene de un proxy configurado explícitamente. */
@Component
public class IpCliente {

    private final List<IpAddressMatcher> proxies;

    public IpCliente(@Value("${msu.seguridad.login.proxies-confiables:}") String redes) {
        proxies = Arrays.stream(redes.split(",")).map(String::trim).filter(s -> !s.isEmpty())
                .map(IpAddressMatcher::new).toList();
    }

    public String obtener(HttpServletRequest req) {
        String origen = req.getRemoteAddr();
        String real = req.getHeader("X-Real-IP");
        if (proxies.stream().anyMatch(p -> p.matches(origen)) && real != null
                && real.length() <= 45 && real.matches("[0-9a-fA-F:.]+")
                && (real.contains(":") || real.matches("[0-9]{1,3}(\\.[0-9]{1,3}){3}"))) {
            try {
                // Valida una IP literal; no se admiten nombres DNS ni listas suministradas por el cliente.
                new IpAddressMatcher(real);
                return real;
            } catch (IllegalArgumentException ignorada) {
                // Una cabecera inválida nunca sustituye la dirección del socket.
            }
        }
        return origen;
    }
}
