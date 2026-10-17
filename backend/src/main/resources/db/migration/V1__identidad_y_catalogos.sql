-- Identidad y catálogos (informe, sección 9.2, tabla 15).
-- Gabriel (GB04, GB05, GB07). Las tablas de solicitudes y seguimiento (tabla 16)
-- las agrega Marcelo (MR01) en migraciones V3 en adelante.

CREATE TABLE rol (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL,
    nombre_visible VARCHAR(60) NOT NULL,
    CONSTRAINT uq_rol_codigo UNIQUE (codigo)
);

CREATE TABLE area (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_area_nombre UNIQUE (nombre)
);

CREATE TABLE categoria (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    area_id BIGINT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_categoria_area FOREIGN KEY (area_id) REFERENCES area (id),
    CONSTRAINT uq_categoria_area_nombre UNIQUE (area_id, nombre)
);

CREATE TABLE ubicacion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    edificio VARCHAR(100) NOT NULL,
    ambiente VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_ubicacion UNIQUE (edificio, ambiente)
);

CREATE TABLE estado (
    codigo VARCHAR(20) PRIMARY KEY,
    nombre_visible VARCHAR(60) NOT NULL
);

CREATE TABLE prioridad (
    codigo VARCHAR(20) PRIMARY KEY,
    nombre_visible VARCHAR(60) NOT NULL,
    orden INT NOT NULL,
    CONSTRAINT uq_prioridad_orden UNIQUE (orden)
);

CREATE TABLE usuario (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(254) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    vinculo VARCHAR(20) NOT NULL,
    rol_id BIGINT NOT NULL,
    area_id BIGINT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en DATETIME(3) NOT NULL,
    version_autorizacion INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_usuario_correo UNIQUE (correo),
    CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES rol (id),
    CONSTRAINT fk_usuario_area FOREIGN KEY (area_id) REFERENCES area (id)
);

CREATE TABLE politica (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    version INT NOT NULL,
    vigente_desde DATETIME(3) NOT NULL,
    publicada_por BIGINT NOT NULL,
    CONSTRAINT uq_politica_version UNIQUE (version),
    CONSTRAINT fk_politica_usuario FOREIGN KEY (publicada_por) REFERENCES usuario (id)
);

CREATE TABLE detalle_politica (
    politica_id BIGINT NOT NULL,
    prioridad_codigo VARCHAR(20) NOT NULL,
    horas_primera_atencion INT NOT NULL,
    horas_resolucion INT NOT NULL,
    PRIMARY KEY (politica_id, prioridad_codigo),
    CONSTRAINT fk_detalle_politica FOREIGN KEY (politica_id) REFERENCES politica (id),
    CONSTRAINT fk_detalle_prioridad FOREIGN KEY (prioridad_codigo) REFERENCES prioridad (codigo),
    CONSTRAINT ck_detalle_horas CHECK (horas_primera_atencion > 0 AND horas_primera_atencion <= horas_resolucion)
);

CREATE INDEX ix_usuario_rol_activo ON usuario (rol_id, activo);
CREATE INDEX ix_categoria_activo ON categoria (activo);
