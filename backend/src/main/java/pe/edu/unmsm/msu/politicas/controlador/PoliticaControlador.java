package pe.edu.unmsm.msu.politicas.controlador;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.unmsm.msu.politicas.dto.NuevaPolitica;
import pe.edu.unmsm.msu.politicas.dto.PoliticaVista;
import pe.edu.unmsm.msu.politicas.servicio.PoliticaServicio;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;

/** HU22 · Políticas de plazos (P12). Solo administradores (regla /admin/** en SeguridadConfig). */
@RestController
@RequestMapping("/api/v1/admin/politicas")
@Tag(name = "Políticas de plazos", description = "HU22: consultar y publicar versiones; las anteriores no se editan")
public class PoliticaControlador {

    private final PoliticaServicio servicio;

    public PoliticaControlador(PoliticaServicio servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    @Operation(summary = "Historial de versiones",
            description = "La más reciente primero, con la vigente marcada y cuántas solicitudes guardaron cada versión.")
    public List<PoliticaVista> historial() {
        return servicio.historial();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Publicar una versión nueva",
            description = "Matriz completa de las cuatro prioridades en horas corridas. Rige desde ese instante para las "
                    + "solicitudes nuevas; las existentes conservan su matriz.",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(examples = @ExampleObject(
                    name = "Matriz coherente", value = """
                            {"version_base": 1, "detalles": [
                              {"prioridad_codigo": "CRITICA", "horas_primera_atencion": 2, "horas_resolucion": 24},
                              {"prioridad_codigo": "ALTA", "horas_primera_atencion": 6, "horas_resolucion": 48},
                              {"prioridad_codigo": "MEDIA", "horas_primera_atencion": 24, "horas_resolucion": 96},
                              {"prioridad_codigo": "BAJA", "horas_primera_atencion": 48, "horas_resolucion": 168}]}"""))))
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Versión publicada y vigente"),
            @ApiResponse(responseCode = "400", description = "DATOS_INVALIDOS: el campo indica prioridad y dato "
                    + "(p. ej. ALTA.horas_primera_atencion)", content = @Content),
            @ApiResponse(responseCode = "403", description = "Rol distinto de administrador", content = @Content),
            @ApiResponse(responseCode = "409", description = "POLITICA_DESACTUALIZADA o POLITICA_SIN_CAMBIOS",
                    content = @Content)})
    public PoliticaVista publicar(@RequestBody NuevaPolitica datos, @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return servicio.publicar(datos, sesion.id());
    }
}
