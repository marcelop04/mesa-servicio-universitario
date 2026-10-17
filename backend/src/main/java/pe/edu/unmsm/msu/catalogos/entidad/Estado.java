package pe.edu.unmsm.msu.catalogos.entidad;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Estado del flujo con código fijo; solo se administra su nombre visible (RN11, RF28). */
@Entity
@Table(name = "estado")
public class Estado {

    @Id
    @Column(length = 20)
    private String codigo;

    @Column(name = "nombre_visible", nullable = false, length = 60)
    private String nombreVisible;

    protected Estado() {
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
}
