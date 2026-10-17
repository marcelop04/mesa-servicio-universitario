package pe.edu.unmsm.msu.catalogos.dto;

import java.util.List;

/** Opciones activas que necesitan los formularios (GET /catalogos sin tipo). */
public record CatalogosActivos(List<CatalogoItem> areas, List<CatalogoItem> categorias,
                               List<CatalogoItem> ubicaciones, List<CatalogoItem> estados,
                               List<CatalogoItem> prioridades) {
}
