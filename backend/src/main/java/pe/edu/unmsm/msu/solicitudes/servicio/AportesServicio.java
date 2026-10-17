package pe.edu.unmsm.msu.solicitudes.servicio;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;
import pe.edu.unmsm.msu.identidad.entidad.Rol;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;
import pe.edu.unmsm.msu.notificaciones.servicio.Notificador;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;
import pe.edu.unmsm.msu.solicitudes.dto.ComentarioVista;
import pe.edu.unmsm.msu.solicitudes.dto.EvidenciaVista;
import pe.edu.unmsm.msu.solicitudes.entidad.Comentario;
import pe.edu.unmsm.msu.solicitudes.entidad.Evidencia;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.repositorio.ComentarioRepositorio;
import pe.edu.unmsm.msu.solicitudes.repositorio.EvidenciaRepositorio;
import pe.edu.unmsm.msu.solicitudes.repositorio.SolicitudRepositorio;

/**
 * AX03 · HU06 Aportar comentarios y evidencias (Alex).
 * <ul>
 *   <li>Comentarios de 1 a 1000 caracteres, sin edición ni borrado, con autor y fecha del servidor.</li>
 *   <li>Hasta tres imágenes por solicitud, JPEG o PNG reales (se revisa la firma del archivo, no la
 *       extensión) de hasta 5 MB. Se guardan fuera de la carpeta pública con un nombre aleatorio.</li>
 *   <li>La descarga vuelve a comprobar el acceso actual a la solicitud (RNF12: sin enlaces públicos).</li>
 * </ul>
 */
@Service
public class AportesServicio {

    static final int COMENTARIO_MAX = 1000;
    private static final Set<String> FINALES = Set.of(Solicitud.CERRADA, Solicitud.CANCELADA);

    private final SolicitudRepositorio solicitudes;
    private final ComentarioRepositorio comentarios;
    private final EvidenciaRepositorio evidencias;
    private final UsuarioRepositorio usuarios;
    private final TransicionesServicio transiciones;
    private final Notificador notificador;
    private final Clock reloj;
    private final Path directorio;

    public AportesServicio(SolicitudRepositorio solicitudes, ComentarioRepositorio comentarios,
                           EvidenciaRepositorio evidencias, UsuarioRepositorio usuarios,
                           TransicionesServicio transiciones, Notificador notificador, Clock reloj,
                           @Value("${msu.archivos.directorio}") String directorio) {
        this.solicitudes = solicitudes;
        this.comentarios = comentarios;
        this.evidencias = evidencias;
        this.usuarios = usuarios;
        this.transiciones = transiciones;
        this.notificador = notificador;
        this.reloj = reloj;
        this.directorio = Path.of(directorio).toAbsolutePath().normalize();
    }

    @Transactional(readOnly = true)
    public List<ComentarioVista> comentarios(long solicitudId, UsuarioAutenticado sesion) {
        cargarConAcceso(solicitudId, sesion);
        return comentarios.findBySolicitudIdOrderByCreadoEnAscIdAsc(solicitudId).stream()
                .map(ComentarioVista::de).toList();
    }

    /** HU06 BDD 1: se conserva con la identidad del autor y se avisa a los otros participantes. */
    @Transactional
    public ComentarioVista comentar(long solicitudId, String texto, UsuarioAutenticado sesion) {
        Solicitud s = cargarActiva(solicitudId, sesion);
        String limpio = texto == null ? "" : texto.trim();
        if (limpio.isEmpty() || limpio.length() > COMENTARIO_MAX) {
            throw ExcepcionApi.datoInvalido("texto", "El comentario debe tener entre 1 y " + COMENTARIO_MAX + " caracteres.");
        }
        Usuario autor = usuarios.getReferenceById(sesion.id());
        Comentario c = comentarios.save(new Comentario(s, autor, limpio, Instant.now(reloj)));
        transiciones.registrarEvento(s, sesion.id(), "COMENTAR", null, Map.of("comentario_id", c.getId()), null);
        for (Usuario participante : participantes(s)) {
            notificador.avisar(participante, sesion.id(), s, "COMENTARIO",
                    sesion.nombre() + " comentó en la solicitud " + s.getCodigo() + ".", "c" + c.getId());
        }
        return ComentarioVista.de(c);
    }

    @Transactional(readOnly = true)
    public List<EvidenciaVista> evidencias(long solicitudId, UsuarioAutenticado sesion) {
        cargarConAcceso(solicitudId, sesion);
        return evidencias.findBySolicitudIdOrderByCreadaEnAscIdAsc(solicitudId).stream().map(EvidenciaVista::de).toList();
    }

    /** HU06 BDD 2: un archivo que no es imagen admitida o supera el límite se rechaza sin publicar nada. */
    @Transactional
    public EvidenciaVista subir(long solicitudId, MultipartFile archivo, UsuarioAutenticado sesion) {
        Solicitud s = cargarActiva(solicitudId, sesion);
        if (archivo == null || archivo.isEmpty()) {
            throw ExcepcionApi.datoInvalido("archivo", "Seleccione una imagen JPEG o PNG.");
        }
        if (archivo.getSize() > Evidencia.BYTES_MAXIMOS) {
            throw new ExcepcionApi(HttpStatus.PAYLOAD_TOO_LARGE, "ARCHIVO_GRANDE",
                    "La imagen supera el máximo de 5 MB.", null);
        }
        if (evidencias.countBySolicitudId(s.getId()) >= Evidencia.MAXIMO_POR_SOLICITUD) {
            throw ExcepcionApi.conflicto("LIMITE_EVIDENCIAS",
                    "La solicitud ya tiene " + Evidencia.MAXIMO_POR_SOLICITUD + " imágenes, el máximo permitido.");
        }
        String tipo = tipoReal(archivo);
        if (tipo == null) {
            throw new ExcepcionApi(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "TIPO_NO_ADMITIDO",
                    "Solo se admiten imágenes JPEG o PNG.", null);
        }

        String nombre = UUID.randomUUID() + (tipo.equals("image/png") ? ".png" : ".jpg");
        Path destino = directorio.resolve(nombre);
        try (InputStream entrada = archivo.getInputStream()) {
            Files.createDirectories(directorio);
            Files.copy(entrada, destino, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo guardar la evidencia", e);
        }
        borrarSiSeRevierte(destino);
        Evidencia ev = evidencias.save(new Evidencia(s, usuarios.getReferenceById(sesion.id()),
                nombreSeguro(archivo.getOriginalFilename()), nombre, tipo, (int) archivo.getSize(), Instant.now(reloj)));
        transiciones.registrarEvento(s, sesion.id(), "ADJUNTAR_EVIDENCIA", null,
                Map.of("evidencia_id", ev.getId(), "nombre", ev.getNombreOriginal()), null);
        return EvidenciaVista.de(ev);
    }

    public record Archivo(Resource contenido, String tipo, String nombre, long bytes) {
    }

    /** Descarga protegida: se revalida el acceso actual a la solicitud en cada petición. */
    @Transactional(readOnly = true)
    public Archivo descargar(long evidenciaId, UsuarioAutenticado sesion) {
        Evidencia ev = evidencias.findById(evidenciaId)
                .orElseThrow(() -> ExcepcionApi.noEncontrado("La evidencia no existe."));
        cargarConAcceso(ev.getSolicitud().getId(), sesion);
        Path ruta = directorio.resolve(ev.getRutaPrivada()).normalize();
        if (!ruta.startsWith(directorio) || !Files.isRegularFile(ruta)) {
            throw ExcepcionApi.noEncontrado("El archivo de la evidencia no está disponible.");
        }
        return new Archivo(new FileSystemResource(ruta), ev.getTipoReal(), ev.getNombreOriginal(), ev.getBytes());
    }

    private Solicitud cargarConAcceso(long id, UsuarioAutenticado sesion) {
        Permisos.exigirRol(sesion, Rol.SOLICITANTE, Rol.TECNICO, Rol.SUPERVISOR);
        Solicitud s = solicitudes.findConDetalleById(id)
                .orElseThrow(() -> ExcepcionApi.noEncontrado("La solicitud no existe."));
        Permisos.exigirAcceso(sesion, s);
        return s;
    }

    private Solicitud cargarActiva(long id, UsuarioAutenticado sesion) {
        Solicitud s = cargarConAcceso(id, sesion);
        if (FINALES.contains(s.getEstadoCodigo())) {
            throw ExcepcionApi.conflicto("SOLICITUD_FINALIZADA", "La solicitud " + s.getCodigo() + " está "
                    + s.getEstado().getNombreVisible().toLowerCase() + " y ya no admite aportes.");
        }
        return s;
    }

    /** Solicitante, técnico asignado y, si comenta otro participante, los supervisores activos. */
    private Set<Usuario> participantes(Solicitud s) {
        Set<Usuario> destino = new LinkedHashSet<>();
        destino.add(s.getSolicitante());
        if (s.getTecnico() != null) {
            destino.add(s.getTecnico());
        }
        destino.addAll(usuarios.buscar(Rol.SUPERVISOR, true, null, Pageable.unpaged()).getContent());
        return destino;
    }

    /** Tipo real según la firma del archivo (magic bytes), no según la extensión ni el Content-Type enviado. */
    static String tipoReal(MultipartFile archivo) {
        byte[] cabecera = new byte[8];
        try (InputStream entrada = archivo.getInputStream()) {
            int leidos = entrada.readNBytes(cabecera, 0, cabecera.length);
            if (leidos >= 3 && (cabecera[0] & 0xFF) == 0xFF && (cabecera[1] & 0xFF) == 0xD8
                    && (cabecera[2] & 0xFF) == 0xFF) {
                return "image/jpeg";
            }
            if (leidos == 8 && (cabecera[0] & 0xFF) == 0x89 && cabecera[1] == 'P' && cabecera[2] == 'N'
                    && cabecera[3] == 'G' && cabecera[4] == 0x0D && cabecera[5] == 0x0A && cabecera[6] == 0x1A
                    && cabecera[7] == 0x0A) {
                return "image/png";
            }
            return null;
        } catch (IOException e) {
            return null;
        }
    }

    static String nombreSeguro(String original) {
        String nombre = original == null ? "" : Path.of(original.replace('\\', '/')).getFileName().toString();
        nombre = nombre.replaceAll("[^\\p{L}\\p{N}._ -]", "_").trim();
        if (nombre.isEmpty()) {
            nombre = "evidencia";
        }
        return nombre.length() > 255 ? nombre.substring(nombre.length() - 255) : nombre;
    }

    /** Si la transacción se revierte, el archivo ya escrito no queda huérfano en el disco. */
    private static void borrarSiSeRevierte(Path archivo) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int estado) {
                    if (estado != STATUS_COMMITTED) {
                        try {
                            Files.deleteIfExists(archivo);
                        } catch (IOException ignorada) {
                            // Se intentó limpiar; el archivo no está referenciado en la base.
                        }
                    }
                }
            });
        }
    }
}
