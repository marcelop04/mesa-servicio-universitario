package pe.edu.unmsm.msu.identidad.dto;

import pe.edu.unmsm.msu.identidad.entidad.Usuario;

/** HU03 · Perfil visible: nombre, correo, vínculo, rol y área. Nunca incluye el hash de la contraseña. */
public record Perfil(long id, String nombre, String correo, String vinculo, String rol, String rolNombre,
                     Long areaId, String areaNombre) {

    public static Perfil de(Usuario u) {
        return new Perfil(u.getId(), u.getNombre(), u.getCorreo(), u.getVinculo(), u.getRol().getCodigo(),
                u.getRol().getNombreVisible(), u.getArea() == null ? null : u.getArea().getId(),
                u.getArea() == null ? null : u.getArea().getNombre());
    }
}
