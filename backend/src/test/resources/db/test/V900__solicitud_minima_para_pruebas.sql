-- Solo para pruebas: tabla mínima de solicitudes para comprobar la carga pendiente
-- de un técnico (HU20 BDD 2) y el uso de una categoría (HU21), mientras no exista
-- la migración completa de Marcelo (MR01).
CREATE TABLE IF NOT EXISTS solicitud (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL,
    categoria_id BIGINT NOT NULL,
    estado_codigo VARCHAR(20) NOT NULL,
    tecnico_id BIGINT NULL
);
