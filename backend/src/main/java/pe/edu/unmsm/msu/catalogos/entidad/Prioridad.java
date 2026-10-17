package pe.edu.unmsm.msu.catalogos.entidad;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Prioridad con código y orden fijos; solo se administra su nombre visible (RN11, RF28). */
@Entity
@Table(name = "prioridad")
public class Prioridad {

    @Id
    @Column(length = 20)
    private String codigo;

    @Column(name = "nombre_visible", nullable = false, length = 60)
    private String nombreVisible;

    @Column(nullable = false)
    private int orden;

    protected Prioridad() {
    }

    public String getCodigo() {
        return codigo;
    }

    public String getNombreVisible() {
        return nombreVisible;
    }

    public void setNombreVisible(String nombreVisible) {
        this.nombreVisible = nombreVisible;
    }

    public int getOrden() {
        return orden;
    }
}
