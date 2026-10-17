package pe.edu.unmsm.msu.administracion.dto;

import java.time.Instant;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;

/** Cuenta vista por el administrador. Nunca incluye el hash de la contraseña. */
public record UsuarioAdmin(Long id, String nombre, String correo, String vinculo, String rol, String rolNombre,
                           Long areaId, String areaNombre, boolean activo, Instant creadoEn, Long pendientes) {

    public static UsuarioAdmin de(Usuario u, Long pendientes) {
        return new UsuarioAdmin(u.getId(), u.getNombre(), u.getCorreo(), u.getVinculo(), u.getRol().getCodigo(),
                u.getRol().getNombreVisible(), u.getArea() == null ? null : u.getArea().getId(),
                u.getArea() == null ? null : u.getArea().getNombre(), u.isActivo(), u.getCreadoEn(),
                u.esTecnico() ? pendientes : null);
    }
}
