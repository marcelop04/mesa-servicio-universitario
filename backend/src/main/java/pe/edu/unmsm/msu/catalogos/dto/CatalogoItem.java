package pe.edu.unmsm.msu.catalogos.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import pe.edu.unmsm.msu.catalogos.entidad.Area;
import pe.edu.unmsm.msu.catalogos.entidad.Categoria;
import pe.edu.unmsm.msu.catalogos.entidad.Estado;
import pe.edu.unmsm.msu.catalogos.entidad.Prioridad;
import pe.edu.unmsm.msu.catalogos.entidad.Ubicacion;

/**
 * Opción de catálogo para listas y formularios. El identificador es numérico, salvo en
 * estados y prioridades, que usan su código fijo. {@code fijo} marca lo que no se puede
 * crear, eliminar ni desactivar.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CatalogoItem(Object id, String nombre, boolean activo, Long areaId, String areaNombre,
                           String edificio, String ambiente, Integer orden, boolean fijo) {

    public static CatalogoItem de(Area a) {
        return new CatalogoItem(a.getId(), a.getNombre(), a.isActivo(), null, null, null, null, null, false);
    }

    public static CatalogoItem de(Categoria c) {
        return new CatalogoItem(c.getId(), c.getNombre(), c.isActivo(), c.getArea().getId(),
                c.getArea().getNombre(), null, null, null, false);
    }

    public static CatalogoItem de(Ubicacion u) {
        return new CatalogoItem(u.getId(), u.getEdificio() + " · " + u.getAmbiente(), u.isActivo(), null, null,
                u.getEdificio(), u.getAmbiente(), null, false);
    }

    public static CatalogoItem de(Estado e) {
        return new CatalogoItem(e.getCodigo(), e.getNombreVisible(), true, null, null, null, null, null, true);
    }

    public static CatalogoItem de(Prioridad p) {
        return new CatalogoItem(p.getCodigo(), p.getNombreVisible(), true, null, null, null, null,
                p.getOrden(), true);
    }
}
