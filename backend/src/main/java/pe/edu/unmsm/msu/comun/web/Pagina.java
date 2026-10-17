package pe.edu.unmsm.msu.comun.web;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** Listado paginado con los campos acordados en el informe: items, pagina, tamaño y total. */
public record Pagina<T>(List<T> items, int pagina, @JsonProperty("tamaño") int tamano, long total) {

    public static final int TAMANO_POR_DEFECTO = 20;
    public static final int TAMANO_MAXIMO = 100;

    public static <E, T> Pagina<T> de(Page<E> page, Function<E, T> mapeo) {
        return new Pagina<>(page.getContent().stream().map(mapeo).toList(),
                page.getNumber() + 1, page.getSize(), page.getTotalElements());
    }

    /** Las páginas empiezan en 1 para el usuario; el tamaño se limita a 100 (HU05). */
    public static Pageable solicitud(Integer pagina, Integer tamano, Sort orden) {
        int p = pagina == null || pagina < 1 ? 1 : pagina;
        int t = tamano == null || tamano < 1 ? TAMANO_POR_DEFECTO : Math.min(tamano, TAMANO_MAXIMO);
        return PageRequest.of(p - 1, t, orden);
    }
}
