package pe.edu.unmsm.msu.catalogos.controlador;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.unmsm.msu.catalogos.dto.CatalogoEntrada;
import pe.edu.unmsm.msu.catalogos.dto.CatalogoItem;
import pe.edu.unmsm.msu.catalogos.dto.TipoCatalogo;
import pe.edu.unmsm.msu.catalogos.servicio.CatalogoServicio;
import pe.edu.unmsm.msu.comun.web.Pagina;

/** GB05 · HU21: CRUD completo de catálogos; DELETE es una desactivación lógica. */
@RestController
@RequestMapping("/api/v1/admin/catalogos/{tipo}")
@Tag(name = "Administración de catálogos", description = "Solo administradores (HU21)")
public class AdminCatalogoControlador {

    private final CatalogoServicio servicio;

    public AdminCatalogoControlador(CatalogoServicio servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    @Operation(summary = "Listar opciones, incluidas las desactivadas")
    public Pagina<CatalogoItem> listar(@PathVariable String tipo,
                                       @RequestParam(required = false) Boolean activo,
                                       @RequestParam(required = false) Integer pagina,
                                       @RequestParam(required = false) Integer tamano) {
        return servicio.listar(TipoCatalogo.desdeRuta(tipo), activo, pagina, tamano);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Crear una opción", description = "Estados y prioridades son fijos: responde 409.")
    public CatalogoItem crear(@PathVariable String tipo, @Valid @RequestBody CatalogoEntrada entrada) {
        return servicio.crear(TipoCatalogo.desdeRuta(tipo), entrada);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar, desactivar o reactivar una opción",
            description = "Una categoría ya usada no cambia de área. En estados y prioridades solo cambia el nombre.")
    public CatalogoItem actualizar(@PathVariable String tipo, @PathVariable String id,
                                   @Valid @RequestBody CatalogoEntrada entrada) {
        return servicio.actualizar(TipoCatalogo.desdeRuta(tipo), id, entrada);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Desactivar una opción (borrado lógico)",
            description = "La opción deja de ofrecerse en altas y sigue visible en los casos anteriores. "
                    + "Estados y prioridades no se pueden desactivar: responde 409.")
    public CatalogoItem desactivar(@PathVariable String tipo, @PathVariable String id) {
        return servicio.desactivar(TipoCatalogo.desdeRuta(tipo), id);
    }
}
