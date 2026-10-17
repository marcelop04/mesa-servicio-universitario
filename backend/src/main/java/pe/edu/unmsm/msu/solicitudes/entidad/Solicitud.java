package pe.edu.unmsm.msu.solicitudes.entidad;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import pe.edu.unmsm.msu.catalogos.entidad.Area;
import pe.edu.unmsm.msu.catalogos.entidad.Categoria;
import pe.edu.unmsm.msu.catalogos.entidad.Estado;
import pe.edu.unmsm.msu.catalogos.entidad.Prioridad;
import pe.edu.unmsm.msu.catalogos.entidad.Ubicacion;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.politicas.entidad.Politica;

/**
 * Entidad central del modelo (tabla 16): datos de la solicitud y su control (fechas, límites,
 * política aplicada y versiones). El estado solo cambia mediante {@code TransicionesServicio};
 * no existe una actualización libre que permita saltar transiciones (sección 4.3).
 */
@Entity
@Table(name = "solicitud")
public class Solicitud {

    public static final String REGISTRADA = "REGISTRADA";
    public static final String EN_EVALUACION = "EN_EVALUACION";
    public static final String ASIGNADA = "ASIGNADA";
    public static final String EN_ATENCION = "EN_ATENCION";
    public static final String RESUELTA = "RESUELTA";
    public static final String CERRADA = "CERRADA";
    public static final String CANCELADA = "CANCELADA";

    /** Pendiente significa Registrada, En evaluación, Asignada o En atención (sección 4.3). */
    public static final Set<String> PENDIENTES = Set.of(REGISTRADA, EN_EVALUACION, ASIGNADA, EN_ATENCION);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String codigo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "solicitante_id")
    private Usuario solicitante;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "categoria_id")
    private Categoria categoria;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_id")
    private Area area;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ubicacion_id")
    private Ubicacion ubicacion;

    @Column(length = 200)
    private String referencia;

    @Column(nullable = false, length = 2000)
    private String descripcion;

    @Column(nullable = false, length = 10)
    private String impacto;

    @Column(nullable = false, length = 10)
    private String urgencia;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prioridad_codigo")
    private Prioridad prioridad;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "estado_codigo")
    private Estado estado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tecnico_id")
    private Usuario tecnico;

    /** HU09: un caso cancelado por duplicado referencia al original. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "duplicada_de_id")
    private Solicitud duplicadaDe;

    @Column(name = "registrada_en", nullable = false)
    private Instant registradaEn;

    @Column(name = "primera_atencion_en")
    private Instant primeraAtencionEn;

    @Column(name = "ultima_resolucion_en")
    private Instant ultimaResolucionEn;

    @Column(name = "cerrada_en")
    private Instant cerradaEn;

    @Column(name = "cancelada_en")
    private Instant canceladaEn;

    @Column(name = "limite_atencion", nullable = false)
    private Instant limiteAtencion;

    @Column(name = "limite_resolucion", nullable = false)
    private Instant limiteResolucion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "politica_id")
    private Politica politica;

    /** RN04: copia de la política completa; no cambia aunque se publique otra versión. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "matriz_aplicada", nullable = false)
    private Map<String, Map<String, Integer>> matrizAplicada;

    /** Aumenta cuando cambian los límites; deduplica avisos de plazos (RN10). */
    @Column(name = "version_fechas", nullable = false)
    private int versionFechas = 1;

    /** Control optimista (RNF03, HU24): una acción con versión antigua responde 409. */
    @Version
    @Column(nullable = false)
    private int version;

    protected Solicitud() {
    }

    /**
     * Nueva solicitud en estado Registrada. El código, el solicitante y la fecha los fija el servidor;
     * después se debe llamar a {@code PlazosServicio.aplicarPoliticaVigente} antes de guardarla.
     */
    public Solicitud(String codigo, Usuario solicitante, Categoria categoria, Ubicacion ubicacion, String referencia,
                     String descripcion, String impacto, String urgencia, Prioridad prioridad, Estado registrada,
                     Instant registradaEn) {
        this.codigo = codigo;
        this.solicitante = solicitante;
        this.categoria = categoria;
        this.area = categoria.getArea();
        this.ubicacion = ubicacion;
        this.referencia = referencia == null || referencia.isBlank() ? null : referencia.trim();
        this.descripcion = descripcion.trim();
        this.impacto = impacto;
        this.urgencia = urgencia;
        this.prioridad = prioridad;
        this.estado = registrada;
        this.registradaEn = registradaEn;
    }

    public boolean esPendiente() {
        return PENDIENTES.contains(getEstadoCodigo());
    }

    public void aplicarPolitica(Politica politica, Map<String, Map<String, Integer>> matriz, Instant limiteAtencion,
                                Instant limiteResolucion) {
        this.politica = politica;
        this.matrizAplicada = matriz;
        this.limiteAtencion = limiteAtencion;
        this.limiteResolucion = limiteResolucion;
    }

    /** RN05: los límites nuevos se calculan desde el registro; la fecha de registro no cambia. */
    public void cambiarPrioridad(String impacto, String urgencia, Prioridad prioridad, Instant limiteAtencion,
                                 Instant limiteResolucion) {
        boolean cambianFechas = !prioridad.getCodigo().equals(getPrioridadCodigo());
        this.impacto = impacto;
        this.urgencia = urgencia;
        this.prioridad = prioridad;
        this.limiteAtencion = limiteAtencion;
        this.limiteResolucion = limiteResolucion;
        if (cambianFechas) {
            versionFechas++;
        }
    }

    /** Cambiar de categoría cambia también el área responsable. */
    public void reclasificar(Categoria categoria) {
        this.categoria = categoria;
        this.area = categoria.getArea();
    }

    public void asignar(Usuario tecnico) {
        this.tecnico = tecnico;
    }

    public void marcarDuplicadaDe(Solicitud original) {
        this.duplicadaDe = original;
    }

    /** Solo lo usa TransicionesServicio, que valida el origen y registra el evento. */
    public void cambiarEstado(Estado destino) {
        this.estado = destino;
    }

    /** HU10: la primera atención se registra una sola vez; una reapertura no la modifica. */
    public void registrarPrimeraAtencion(Instant instante) {
        if (primeraAtencionEn == null) {
            primeraAtencionEn = instante;
        }
    }

    public void registrarResolucion(Instant instante) {
        this.ultimaResolucionEn = instante;
    }

    public void registrarCierre(Instant instante) {
        this.cerradaEn = instante;
    }

    public void registrarCancelacion(Instant instante) {
        this.canceladaEn = instante;
    }

    public Long getId() {
        return id;
    }

    public String getCodigo() {
        return codigo;
    }

    public Usuario getSolicitante() {
        return solicitante;
    }

    public Categoria getCategoria() {
        return categoria;
    }

    public Area getArea() {
        return area;
    }

    public Ubicacion getUbicacion() {
        return ubicacion;
    }

    public String getReferencia() {
        return referencia;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public String getImpacto() {
        return impacto;
    }

    public String getUrgencia() {
        return urgencia;
    }

    public Prioridad getPrioridad() {
        return prioridad;
    }

    public String getPrioridadCodigo() {
        return prioridad.getCodigo();
    }

    public Estado getEstado() {
        return estado;
    }

    public String getEstadoCodigo() {
        return estado.getCodigo();
    }

    public Usuario getTecnico() {
        return tecnico;
    }

    public Solicitud getDuplicadaDe() {
        return duplicadaDe;
    }

    public Instant getRegistradaEn() {
        return registradaEn;
    }

    public Instant getPrimeraAtencionEn() {
        return primeraAtencionEn;
    }

    public Instant getUltimaResolucionEn() {
        return ultimaResolucionEn;
    }

    public Instant getCerradaEn() {
        return cerradaEn;
    }

    public Instant getCanceladaEn() {
        return canceladaEn;
    }

    public Instant getLimiteAtencion() {
        return limiteAtencion;
    }

    public Instant getLimiteResolucion() {
        return limiteResolucion;
    }

    public Politica getPolitica() {
        return politica;
    }

    public Map<String, Map<String, Integer>> getMatrizAplicada() {
        return matrizAplicada;
    }

    public int getVersionFechas() {
        return versionFechas;
    }

    public int getVersion() {
        return version;
    }
}
