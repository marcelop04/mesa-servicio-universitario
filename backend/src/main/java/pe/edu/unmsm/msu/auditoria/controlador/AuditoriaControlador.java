package pe.edu.unmsm.msu.auditoria.controlador;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.unmsm.msu.auditoria.dto.AuditoriaVista;
import pe.edu.unmsm.msu.auditoria.servicio.AuditoriaServicio;
import pe.edu.unmsm.msu.comun.web.Pagina;

/** HU23 · Auditoría administrativa (P12). Solo lectura y solo administradores (regla en SeguridadConfig). */
@RestController
@RequestMapping("/api/v1/admin/auditoria")
@Tag(name = "Auditoría administrativa", description = "HU23: accesos y cambios administrativos, sin secretos")
public class AuditoriaControlador {

    private final AuditoriaServicio servicio;

    public AuditoriaControlador(AuditoriaServicio servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    @Operation(summary = "Consultar la auditoría",
            description = "Más reciente primero. Filtros opcionales por acción, entidad, actor (nombre o correo) y "
                    + "rango de fechas en hora de Lima. Página desde 1; tamaño 20 por defecto y máximo 100. "
                    + "No existen rutas de edición ni borrado.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Página de registros"),
            @ApiResponse(responseCode = "400", description = "DATOS_INVALIDOS: rango de fechas invertido",
                    content = @Content),
            @ApiResponse(responseCode = "403", description = "Rol distinto de administrador", content = @Content)})
    public Pagina<AuditoriaVista> listar(
            @Parameter(example = "USUARIO_ACTUALIZAR") @RequestParam(required = false) String accion,
            @Parameter(example = "POLITICA") @RequestParam(required = false) String entidad,
            @Parameter(description = "Nombre o correo del actor", example = "admin")
            @RequestParam(required = false) String actor,
            @Parameter(example = "2026-11-01") @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @Parameter(example = "2026-11-30") @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) Integer pagina,
            @RequestParam(required = false) Integer tamano) {
        return servicio.listar(accion, entidad, actor, desde, hasta, pagina, tamano);
    }

    @GetMapping("/opciones")
    @Operation(summary = "Acciones y entidades registradas", description = "Valores para los filtros de P12.")
    public Map<String, List<String>> opciones() {
        return servicio.opciones();
    }
}
