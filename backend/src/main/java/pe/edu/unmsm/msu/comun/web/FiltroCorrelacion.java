package pe.edu.unmsm.msu.comun.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Asigna un identificador de correlación a cada petición (RNF08) y lo devuelve en la respuesta. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class FiltroCorrelacion extends OncePerRequestFilter {

    public static final String CABECERA = "X-Correlation-Id";
    private static final String ATRIBUTO = FiltroCorrelacion.class.getName();
    private static final Pattern VALIDO = Pattern.compile("[A-Za-z0-9-]{8,64}");

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain cadena)
            throws ServletException, IOException {
        String recibido = req.getHeader(CABECERA);
        String id = recibido != null && VALIDO.matcher(recibido).matches() ? recibido : UUID.randomUUID().toString();
        req.setAttribute(ATRIBUTO, id);
        res.setHeader(CABECERA, id);
        MDC.put("correlacionId", id);
        try {
            cadena.doFilter(req, res);
        } finally {
            MDC.remove("correlacionId");
        }
    }

    public static String idDe(HttpServletRequest req) {
        Object id = req.getAttribute(ATRIBUTO);
        return id == null ? null : id.toString();
    }
}
