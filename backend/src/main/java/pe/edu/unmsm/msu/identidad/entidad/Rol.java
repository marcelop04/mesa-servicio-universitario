package pe.edu.unmsm.msu.identidad.entidad;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Rol con código fijo; la autorización usa el código, nunca el nombre visible. */
@Entity
@Table(name = "rol")
public class Rol {

    public static final String SOLICITANTE = "SOLICITANTE";
    public static final String TECNICO = "TECNICO";
    public static final String SUPERVISOR = "SUPERVISOR";
    public static final String ADMINISTRADOR = "ADMINISTRADOR";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String codigo;

    @Column(name = "nombre_visible", nullable = false, length = 60)
    private String nombreVisible;

    protected Rol() {
    }

    public Long getId() {
        return id;
    }

    public String getCodigo() {
        return codigo;
    }

    public String getNombreVisible() {
        return nombreVisible;
    }

    public boolean esInterno() {
        return !SOLICITANTE.equals(codigo);
    }
}
