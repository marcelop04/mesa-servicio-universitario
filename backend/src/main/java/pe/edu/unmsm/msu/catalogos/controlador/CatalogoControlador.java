package pe.edu.unmsm.msu.catalogos.controlador;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.unmsm.msu.catalogos.dto.TipoCatalogo;
import pe.edu.unmsm.msu.catalogos.servicio.CatalogoServicio;

@RestController
@RequestMapping("/api/v1/catalogos")
@Tag(name = "Catálogos", description = "Opciones activas para los formularios")
public class CatalogoControlador {

    private final CatalogoServicio servicio;

    public CatalogoControlador(CatalogoServicio servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    @Operation(summary = "Opciones activas",
            description = "Sin tipo devuelve todos los catálogos; con tipo (areas, categorias, ubicaciones, "
                    + "estados o prioridades) devuelve solo esa lista. Las opciones desactivadas no se ofrecen.")
    public Object activos(@RequestParam(required = false) String tipo) {
        return tipo == null ? servicio.activos() : servicio.activos(TipoCatalogo.desdeRuta(tipo));
    }
}
