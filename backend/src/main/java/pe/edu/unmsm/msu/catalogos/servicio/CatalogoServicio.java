package pe.edu.unmsm.msu.catalogos.servicio;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.Predicate;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.catalogos.dto.CatalogoEntrada;
import pe.edu.unmsm.msu.catalogos.dto.CatalogoItem;
import pe.edu.unmsm.msu.catalogos.dto.CatalogosActivos;
import pe.edu.unmsm.msu.catalogos.dto.TipoCatalogo;
import pe.edu.unmsm.msu.catalogos.entidad.Area;
import pe.edu.unmsm.msu.catalogos.entidad.Categoria;
import pe.edu.unmsm.msu.catalogos.entidad.Estado;
import pe.edu.unmsm.msu.catalogos.entidad.Prioridad;
import pe.edu.unmsm.msu.catalogos.entidad.Ubicacion;
import pe.edu.unmsm.msu.catalogos.repositorio.AreaRepositorio;
import pe.edu.unmsm.msu.catalogos.repositorio.CategoriaRepositorio;
import pe.edu.unmsm.msu.catalogos.repositorio.EstadoRepositorio;
import pe.edu.unmsm.msu.catalogos.repositorio.PrioridadRepositorio;
import pe.edu.unmsm.msu.catalogos.repositorio.UbicacionRepositorio;
import pe.edu.unmsm.msu.comun.error.ErrorCampo;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;
import pe.edu.unmsm.msu.comun.web.Pagina;
import pe.edu.unmsm.msu.solicitudes.servicio.ConsultaSolicitudes;

/**
 * HU21 Mantener los catálogos (RF26, RF28). Los datos referenciados se desactivan, no se
 * borran (RN11); estados y prioridades conservan identificadores y reglas fijos.
 */
@Service
@Transactional(readOnly = true)
public class CatalogoServicio {

    private final AreaRepositorio areas;
    private final CategoriaRepositorio categorias;
    private final UbicacionRepositorio ubicaciones;
    private final EstadoRepositorio estados;
    private final PrioridadRepositorio prioridades;
    private final ConsultaSolicitudes solicitudes;

    public CatalogoServicio(AreaRepositorio areas, CategoriaRepositorio categorias, UbicacionRepositorio ubicaciones,
                            EstadoRepositorio estados, PrioridadRepositorio prioridades,
                            ConsultaSolicitudes solicitudes) {
        this.areas = areas;
        this.categorias = categorias;
        this.ubicaciones = ubicaciones;
        this.estados = estados;
        this.prioridades = prioridades;
        this.solicitudes = solicitudes;
    }

    /** Opciones que se ofrecen en formularios: solo activas (y categorías de áreas activas). */
    public CatalogosActivos activos() {
        return new CatalogosActivos(activos(TipoCatalogo.AREAS), activos(TipoCatalogo.CATEGORIAS),
                activos(TipoCatalogo.UBICACIONES), activos(TipoCatalogo.ESTADOS), activos(TipoCatalogo.PRIORIDADES));
    }

    public List<CatalogoItem> activos(TipoCatalogo tipo) {
        return switch (tipo) {
            case AREAS -> areas.findAll(Sort.by("nombre")).stream()
                    .filter(Area::isActivo).map(CatalogoItem::de).toList();
            case CATEGORIAS -> categorias.findAll(Sort.by("area.nombre", "nombre")).stream()
                    .filter(Categoria::disponible).map(CatalogoItem::de).toList();
            case UBICACIONES -> ubicaciones.findAll(Sort.by("edificio", "ambiente")).stream()
                    .filter(Ubicacion::isActivo).map(CatalogoItem::de).toList();
            case ESTADOS, PRIORIDADES -> todos(tipo);
        };
    }

    /** Listado administrativo, incluidas las opciones desactivadas, con paginación. */
    public Pagina<CatalogoItem> listar(TipoCatalogo tipo, Boolean activo, Integer pagina, Integer tamano) {
        Predicate<CatalogoItem> filtro = activo == null ? i -> true : i -> i.activo() == activo;
        List<CatalogoItem> filtrados = todos(tipo).stream().filter(filtro).toList();
        var pedido = Pagina.solicitud(pagina, tamano, Sort.unsorted());
        int desde = (int) Math.min(pedido.getOffset(), filtrados.size());
        int hasta = Math.min(desde + pedido.getPageSize(), filtrados.size());
        return new Pagina<>(filtrados.subList(desde, hasta), pedido.getPageNumber() + 1, pedido.getPageSize(),
                filtrados.size());
    }

    @Transactional
    public CatalogoItem crear(TipoCatalogo tipo, CatalogoEntrada e) {
        return switch (tipo) {
            case AREAS -> {
                String nombre = requerido("nombre", e.nombre(), 2);
                if (areas.existsByNombreIgnoreCase(nombre)) {
                    throw duplicado("Ya existe un área con ese nombre.");
                }
                yield CatalogoItem.de(areas.save(new Area(nombre)));
            }
            case CATEGORIAS -> {
                List<ErrorCampo> errores = new ArrayList<>();
                String nombre = requerido("nombre", e.nombre(), 2, errores);
                Area area = areaActiva(e.areaId(), errores);
                lanzarSiHay(errores);
                if (categorias.existsByAreaIdAndNombreIgnoreCase(area.getId(), nombre)) {
                    throw duplicado("El área ya tiene una categoría con ese nombre.");
                }
                yield CatalogoItem.de(categorias.save(new Categoria(nombre, area)));
            }
            case UBICACIONES -> {
                List<ErrorCampo> errores = new ArrayList<>();
                String edificio = requerido("edificio", e.edificio(), 2, errores);
                String ambiente = requerido("ambiente", e.ambiente(), 1, errores);
                lanzarSiHay(errores);
                if (ubicaciones.existsByEdificioIgnoreCaseAndAmbienteIgnoreCase(edificio, ambiente)) {
                    throw duplicado("Ya existe esa combinación de edificio y ambiente.");
                }
                yield CatalogoItem.de(ubicaciones.save(new Ubicacion(edificio, ambiente)));
            }
            case ESTADOS, PRIORIDADES -> throw fijo(tipo);
        };
    }

    @Transactional
    public CatalogoItem actualizar(TipoCatalogo tipo, String id, CatalogoEntrada e) {
        return switch (tipo) {
            case AREAS -> {
                Area area = areas.findById(idNumerico(id)).orElseThrow(() -> noExiste(tipo));
                if (e.nombre() != null) {
                    String nombre = requerido("nombre", e.nombre(), 2);
                    if (areas.existsByNombreIgnoreCaseAndIdNot(nombre, area.getId())) {
                        throw duplicado("Ya existe un área con ese nombre.");
                    }
                    area.setNombre(nombre);
                }
                if (e.activo() != null) {
                    area.setActivo(e.activo());
                }
                yield CatalogoItem.de(area);
            }
            case CATEGORIAS -> {
                Categoria categoria = categorias.findById(idNumerico(id)).orElseThrow(() -> noExiste(tipo));
                if (e.areaId() != null && !e.areaId().equals(categoria.getArea().getId())) {
                    if (solicitudes.categoriaUsada(categoria.getId())) {
                        throw ExcepcionApi.conflicto("CATEGORIA_EN_USO",
                                "La categoría ya fue usada en solicitudes y no puede cambiar de área. "
                                        + "Cree una categoría nueva en el área deseada.");
                    }
                    List<ErrorCampo> errores = new ArrayList<>();
                    Area destino = areaActiva(e.areaId(), errores);
                    lanzarSiHay(errores);
                    categoria.setArea(destino);
                }
                if (e.nombre() != null) {
                    categoria.setNombre(requerido("nombre", e.nombre(), 2));
                }
                if (categorias.existsByAreaIdAndNombreIgnoreCaseAndIdNot(categoria.getArea().getId(),
                        categoria.getNombre(), categoria.getId())) {
                    throw duplicado("El área ya tiene una categoría con ese nombre.");
                }
                if (e.activo() != null) {
                    categoria.setActivo(e.activo());
                }
                yield CatalogoItem.de(categoria);
            }
            case UBICACIONES -> {
                Ubicacion ubicacion = ubicaciones.findById(idNumerico(id)).orElseThrow(() -> noExiste(tipo));
                if (e.edificio() != null) {
                    ubicacion.setEdificio(requerido("edificio", e.edificio(), 2));
                }
                if (e.ambiente() != null) {
                    ubicacion.setAmbiente(requerido("ambiente", e.ambiente(), 1));
                }
                if (ubicaciones.existsByEdificioIgnoreCaseAndAmbienteIgnoreCaseAndIdNot(ubicacion.getEdificio(),
                        ubicacion.getAmbiente(), ubicacion.getId())) {
                    throw duplicado("Ya existe esa combinación de edificio y ambiente.");
                }
                if (e.activo() != null) {
                    ubicacion.setActivo(e.activo());
                }
                yield CatalogoItem.de(ubicacion);
            }
            case ESTADOS -> {
                Estado estado = estados.findById(id).orElseThrow(() -> noExiste(tipo));
                rechazarDesactivacion(tipo, e);
                if (e.nombre() != null) {
                    estado.setNombreVisible(requerido("nombre", e.nombre(), 2));
                }
                yield CatalogoItem.de(estado);
            }
            case PRIORIDADES -> {
                Prioridad prioridad = prioridades.findById(id).orElseThrow(() -> noExiste(tipo));
                rechazarDesactivacion(tipo, e);
                if (e.nombre() != null) {
                    prioridad.setNombreVisible(requerido("nombre", e.nombre(), 2));
                }
                yield CatalogoItem.de(prioridad);
            }
        };
    }

    /** DELETE como desactivación lógica: la opción deja de ofrecerse y se conserva en el historial. */
    @Transactional
    public CatalogoItem desactivar(TipoCatalogo tipo, String id) {
        if (tipo.esFijo()) {
            if (tipo == TipoCatalogo.ESTADOS ? !estados.existsById(id) : !prioridades.existsById(id)) {
                throw noExiste(tipo);
            }
            throw fijo(tipo);
        }
        return actualizar(tipo, id, new CatalogoEntrada(null, null, null, null, false));
    }

    private List<CatalogoItem> todos(TipoCatalogo tipo) {
        return switch (tipo) {
            case AREAS -> areas.findAll(Sort.by("nombre")).stream().map(CatalogoItem::de).toList();
            case CATEGORIAS -> categorias.findAll(Sort.by("area.nombre", "nombre")).stream()
                    .map(CatalogoItem::de).toList();
            case UBICACIONES -> ubicaciones.findAll(Sort.by("edificio", "ambiente")).stream()
                    .map(CatalogoItem::de).toList();
            case ESTADOS -> estados.findAll().stream().map(CatalogoItem::de)
                    .sorted(Comparator.comparingInt(i -> ordenEstado((String) i.id()))).toList();
            case PRIORIDADES -> prioridades.findAll(Sort.by("orden")).stream().map(CatalogoItem::de).toList();
        };
    }

    private static int ordenEstado(String codigo) {
        List<String> flujo = List.of("REGISTRADA", "EN_EVALUACION", "ASIGNADA", "EN_ATENCION", "RESUELTA",
                "CERRADA", "CANCELADA");
        int i = flujo.indexOf(codigo);
        return i < 0 ? flujo.size() : i;
    }

    private Area areaActiva(Long areaId, List<ErrorCampo> errores) {
        if (areaId == null) {
            errores.add(new ErrorCampo("area_id", "Seleccione el área a la que pertenece."));
            return null;
        }
        Area area = areas.findById(areaId).orElse(null);
        if (area == null || !area.isActivo()) {
            errores.add(new ErrorCampo("area_id", "Seleccione un área activa."));
            return null;
        }
        return area;
    }

    private static void rechazarDesactivacion(TipoCatalogo tipo, CatalogoEntrada e) {
        if (Boolean.FALSE.equals(e.activo())) {
            throw fijo(tipo);
        }
    }

    private static String requerido(String campo, String valor, int minimo) {
        List<ErrorCampo> errores = new ArrayList<>();
        String limpio = requerido(campo, valor, minimo, errores);
        lanzarSiHay(errores);
        return limpio;
    }

    private static String requerido(String campo, String valor, int minimo, List<ErrorCampo> errores) {
        String limpio = valor == null ? "" : valor.trim();
        if (limpio.length() < minimo) {
            errores.add(new ErrorCampo(campo, limpio.isEmpty()
                    ? "Este campo es obligatorio."
                    : "Use al menos " + minimo + " caracteres."));
        } else if (limpio.length() > 100) {
            errores.add(new ErrorCampo(campo, "Use como máximo 100 caracteres."));
        }
        return limpio;
    }

    private static void lanzarSiHay(List<ErrorCampo> errores) {
        if (!errores.isEmpty()) {
            throw ExcepcionApi.datosInvalidos(errores);
        }
    }

    private static long idNumerico(String id) {
        try {
            return Long.parseLong(id);
        } catch (NumberFormatException e) {
            throw ExcepcionApi.noEncontrado("La opción indicada no existe.");
        }
    }

    private static ExcepcionApi noExiste(TipoCatalogo tipo) {
        return ExcepcionApi.noEncontrado("La opción indicada no existe en " + tipo.getRuta() + ".");
    }

    private static ExcepcionApi duplicado(String mensaje) {
        return ExcepcionApi.conflicto("DUPLICADO", mensaje);
    }

    private static ExcepcionApi fijo(TipoCatalogo tipo) {
        String nombre = tipo == TipoCatalogo.ESTADOS ? "Los estados" : "Las prioridades";
        return ExcepcionApi.conflicto("CATALOGO_FIJO", nombre + " forman parte del flujo: no se pueden crear, "
                + "eliminar ni desactivar. Solo se puede cambiar su nombre visible.");
    }
}
