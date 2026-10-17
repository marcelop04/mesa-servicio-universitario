package pe.edu.unmsm.msu.solicitudes.servicio;

import java.util.Arrays;
import org.springframework.security.access.AccessDeniedException;
import pe.edu.unmsm.msu.identidad.entidad.Rol;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;

/**
 * Reglas de acceso a solicitudes (tabla 3, RF03). Se comprueban en el servidor en cada operación,
 * aunque la interfaz ya oculte las acciones no permitidas. DV06 puede centralizarlas sin cambiar a
 * quien las usa.
 */
public final class Permisos {

    private Permisos() {
    }

    public static void exigirRol(UsuarioAutenticado sesion, String... roles) {
        if (sesion == null || Arrays.stream(roles).noneMatch(r -> r.equals(sesion.rol()))) {
            throw new AccessDeniedException("Rol no autorizado");
        }
    }

    /** Solicitante: solo propias. Técnico: solo asignadas actualmente. Supervisor: todas. Administrador: ninguna. */
    public static boolean puedeVer(UsuarioAutenticado sesion, Solicitud s) {
        return switch (sesion.rol()) {
            case Rol.SUPERVISOR -> true;
            case Rol.SOLICITANTE -> s.getSolicitante().getId() == sesion.id();
            case Rol.TECNICO -> s.getTecnico() != null && s.getTecnico().getId() == sesion.id();
            default -> false;
        };
    }

    public static void exigirAcceso(UsuarioAutenticado sesion, Solicitud s) {
        if (!puedeVer(sesion, s)) {
            throw new AccessDeniedException("Solicitud no autorizada");
        }
    }
}
