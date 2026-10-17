package pe.edu.unmsm.msu.solicitudes.controlador;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.unmsm.msu.comun.web.Pagina;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;
import pe.edu.unmsm.msu.solicitudes.dto.NuevaSolicitud;
import pe.edu.unmsm.msu.solicitudes.dto.SolicitudDetalle;
import pe.edu.unmsm.msu.solicitudes.dto.SolicitudResumen;
import pe.edu.unmsm.msu.solicitudes.servicio.ListadoSolicitudesServicio;
import pe.edu.unmsm.msu.solicitudes.servicio.ListadoSolicitudesServicio.Filtros;
import pe.edu.unmsm.msu.solicitudes.servicio.RegistroSolicitudServicio;

/** Registro (AX01) y consulta de solicitudes según rol (tabla 18). */
@RestController
@RequestMapping("/api/v1/solicitudes")
@Tag(name = "Solicitudes", description = "Listado y detalle según el rol de la sesión")
public class SolicitudControlador {

    private final ListadoSolicitudesServicio servicio;
    private final RegistroSolicitudServicio registro;

    public SolicitudControlador(ListadoSolicitudesServicio servicio, RegistroSolicitudServicio registro) {
        this.servicio = servicio;
        this.registro = registro;
    }

    @PostMapping
    @Operation(summary = "Registrar una solicitud (HU04)",
            description = "Solo solicitantes. Responde 201 con código MSU, prioridad inicial y límites. Las imágenes se "
                    + "suben después con POST /solicitudes/{id}/evidencias.")
    public ResponseEntity<SolicitudDetalle> registrar(@Valid @RequestBody NuevaSolicitud datos,
                                                      @AuthenticationPrincipal UsuarioAutenticado sesion) {
        SolicitudDetalle creada = registro.registrar(datos, sesion);
        return ResponseEntity.created(URI.create("/api/v1/solicitudes/" + creada.id())).body(creada);
    }

    @GetMapping
    @Operation(summary = "Listar solicitudes",
            description = "Supervisor: todas. Solicitante: propias. Técnico: asignadas. Administrador: 403. "
                    + "estado acepta un código o PENDIENTES; responsable acepta el id de un técnico o SIN_ASIGNAR; "
                    + "orden: recientes (por defecto), antiguedad, prioridad o vencimiento. desde y hasta (AAAA-MM-DD, hora de Lima) filtran por fecha de registro. Tamaño 20 por defecto, máximo 100.")
    public Pagina<SolicitudResumen> listar(@RequestParam(required = false) String estado,
                                           @RequestParam(name = "area_id", required = false) Long areaId,
                                           @RequestParam(name = "categoria_id", required = false) Long categoriaId,
                                           @RequestParam(required = false) String prioridad,
                                           @RequestParam(required = false) String responsable,
                                           @RequestParam(required = false) String q,
                                           @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate desde,
                                           @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate hasta,
                                           @RequestParam(required = false) String orden,
                                           @RequestParam(required = false) Integer pagina,
                                           @RequestParam(required = false) Integer tamano,
                                           @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return servicio.listar(new Filtros(estado, areaId, categoriaId, prioridad, responsable, q, desde, hasta, orden,
                pagina, tamano), sesion);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detalle de una solicitud",
            description = "Propietario, técnico asignado o supervisor. Incluye la matriz aplicada y la versión.")
    public SolicitudDetalle detalle(@PathVariable long id, @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return servicio.detalle(id, sesion);
    }
}
