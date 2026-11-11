package pe.edu.unmsm.msu.auditoria.servicio;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.auditoria.dto.AuditoriaVista;
import pe.edu.unmsm.msu.auditoria.entidad.Auditoria;
import pe.edu.unmsm.msu.auditoria.repositorio.AuditoriaRepositorio;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;
import pe.edu.unmsm.msu.comun.web.Pagina;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;

/**
 * HU23 · Auditoría administrativa (RF30, Emanuel, fase III).
 * <ul>
 *   <li>Registra accesos relevantes (inicio y cierre de sesión, intentos rechazados, exportaciones) y cambios
 *       administrativos (usuarios, catálogos, políticas) en la misma transacción que el cambio.</li>
 *   <li>Nunca guarda contraseñas, hashes, tokens ni contenido de evidencias: las claves sensibles se descartan
 *       aunque un llamador las envíe por error (HU23 BDD 2).</li>
 *   <li>Solo se consulta; la API no ofrece edición ni borrado (la entidad es inmutable).</li>
 * </ul>
 */
@Service
public class AuditoriaServicio {

    public static final ZoneId LIMA = ZoneId.of("America/Lima");

    /** Claves que nunca se guardan en los metadatos. */
    private static final Pattern SENSIBLE = Pattern.compile(
            "(?i).*(password|contrase|clave|hash|token|jwt|secret|cookie|archivo|contenido).*");

    private final AuditoriaRepositorio auditorias;
    private final UsuarioRepositorio usuarios;
    private final Clock reloj;

    public AuditoriaServicio(AuditoriaRepositorio auditorias, UsuarioRepositorio usuarios, Clock reloj) {
        this.auditorias = auditorias;
        this.usuarios = usuarios;
        this.reloj = reloj;
    }

    /** Registra la acción a nombre del usuario de la sesión actual (o del sistema si no hay sesión). */
    @Transactional
    public void registrar(String accion, String entidad, Object entidadId, Map<String, ?> metadatos) {
        registrarComo(actorActual(), accion, entidad, entidadId, metadatos);
    }

    /** Registra la acción a nombre de un actor explícito; {@code null} significa sistema o anónimo. */
    @Transactional
    public void registrarComo(Long actorId, String accion, String entidad, Object entidadId, Map<String, ?> metadatos) {
        auditorias.save(new Auditoria(actorId == null ? null : usuarios.getReferenceById(actorId), accion, entidad,
                entidadId == null ? null : String.valueOf(entidadId), limpiar(metadatos), Instant.now(reloj)));
    }

    /** GET /admin/auditoria: filtros opcionales, más reciente primero. Fechas en hora de Lima, ambas inclusive. */
    @Transactional(readOnly = true)
    public Pagina<AuditoriaVista> listar(String accion, String entidad, String actor, LocalDate desde, LocalDate hasta,
                                         Integer pagina, Integer tamano) {
        if (desde != null && hasta != null && hasta.isBefore(desde)) {
            throw ExcepcionApi.datoInvalido("hasta", "La fecha final no puede ser anterior a la inicial.");
        }
        Instant inicio = desde == null ? null : desde.atStartOfDay(LIMA).toInstant();
        Instant fin = hasta == null ? null : hasta.plusDays(1).atStartOfDay(LIMA).toInstant();
        String texto = actor == null || actor.isBlank() ? null : "%" + actor.trim().toLowerCase(Locale.ROOT) + "%";
        return Pagina.de(auditorias.buscar(vacioANulo(accion), vacioANulo(entidad), texto, inicio, fin,
                Pagina.solicitud(pagina, tamano, Sort.by(Sort.Direction.DESC, "creadaEn", "id"))), AuditoriaVista::de);
    }

    /** Valores distintos para los filtros de la interfaz. */
    @Transactional(readOnly = true)
    public Map<String, List<String>> opciones() {
        return Map.of("acciones", auditorias.acciones(), "entidades", auditorias.entidades());
    }

    static Map<String, Object> limpiar(Map<String, ?> metadatos) {
        if (metadatos == null || metadatos.isEmpty()) {
            return null;
        }
        Map<String, Object> limpio = new LinkedHashMap<>();
        metadatos.forEach((clave, valor) -> {
            if (clave != null && !SENSIBLE.matcher(clave).matches()) {
                limpio.put(clave, valor instanceof Map<?, ?> m ? limpiarAnidado(m) : valor);
            }
        });
        return limpio.isEmpty() ? null : limpio;
    }

    private static Map<String, Object> limpiarAnidado(Map<?, ?> m) {
        Map<String, Object> copia = new LinkedHashMap<>();
        m.forEach((k, v) -> copia.put(String.valueOf(k), v));
        Map<String, Object> limpio = limpiar(copia);
        return limpio == null ? Map.of() : limpio;
    }

    private static String vacioANulo(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim().toUpperCase(Locale.ROOT);
    }

    private static Long actorActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof UsuarioAutenticado u ? u.id() : null;
    }
}
