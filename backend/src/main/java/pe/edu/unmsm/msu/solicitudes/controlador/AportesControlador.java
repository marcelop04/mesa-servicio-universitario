package pe.edu.unmsm.msu.solicitudes.controlador;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;
import pe.edu.unmsm.msu.solicitudes.dto.ComentarioVista;
import pe.edu.unmsm.msu.solicitudes.dto.EvidenciaVista;
import pe.edu.unmsm.msu.solicitudes.servicio.AportesServicio;
import pe.edu.unmsm.msu.solicitudes.servicio.AportesServicio.Archivo;

/** AX03 · HU06 Comentarios y evidencias (Alex). Mismo acceso que el detalle de la solicitud. */
@RestController
@Tag(name = "Comentarios y evidencias", description = "HU06: aportes de los participantes de una solicitud activa")
public class AportesControlador {

    private final AportesServicio servicio;

    public AportesControlador(AportesServicio servicio) {
        this.servicio = servicio;
    }

    @GetMapping("/api/v1/solicitudes/{id}/comentarios")
    @Operation(summary = "Comentarios de la solicitud, del más antiguo al más reciente")
    public List<ComentarioVista> comentarios(@PathVariable long id, @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return servicio.comentarios(id, sesion);
    }

    @PostMapping("/api/v1/solicitudes/{id}/comentarios")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Agregar un comentario (1 a 1000 caracteres)",
            description = "Solo en solicitudes no cerradas ni canceladas. No se edita ni se borra.")
    public ComentarioVista comentar(@PathVariable long id, @RequestBody Map<String, String> cuerpo,
                                    @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return servicio.comentar(id, cuerpo.get("texto"), sesion);
    }

    @GetMapping("/api/v1/solicitudes/{id}/evidencias")
    @Operation(summary = "Evidencias de la solicitud (sin rutas internas)")
    public List<EvidenciaVista> evidencias(@PathVariable long id, @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return servicio.evidencias(id, sesion);
    }

    @PostMapping(path = "/api/v1/solicitudes/{id}/evidencias", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Subir una imagen (campo archivo)",
            description = "JPEG o PNG reales de hasta 5 MB, máximo tres por solicitud. 413 si es grande, 415 si no es "
                    + "una imagen admitida, 409 si ya hay tres.")
    public EvidenciaVista subir(@PathVariable long id, @RequestParam("archivo") MultipartFile archivo,
                                @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return servicio.subir(id, archivo, sesion);
    }

    @GetMapping("/api/v1/evidencias/{id}/archivo")
    @Operation(summary = "Descarga protegida", description = "Revalida el acceso actual a la solicitud.")
    public ResponseEntity<Resource> descargar(@PathVariable long id, @AuthenticationPrincipal UsuarioAutenticado sesion) {
        Archivo a = servicio.descargar(id, sesion);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(a.tipo()))
                .contentLength(a.bytes())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(a.nombre(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(a.contenido());
    }
}
