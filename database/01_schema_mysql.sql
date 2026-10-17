-- =========================================================================
-- MESA DE SERVICIOS UNIVERSITARIOS - ESQUEMA RELACIONAL MYSQL
-- =========================================================================
DROP DATABASE IF EXISTS mesa_servicios_unmsm;
CREATE DATABASE mesa_servicios_unmsm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mesa_servicios_unmsm;

CREATE TABLE rol (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre_visible VARCHAR(60) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE area (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE ubicacion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    edificio VARCHAR(100) NOT NULL,
    ambiente VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_ubicacion UNIQUE (edificio, ambiente)
) ENGINE=InnoDB;

CREATE TABLE categoria (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    area_id BIGINT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_cat_area FOREIGN KEY (area_id) REFERENCES area(id)
) ENGINE=InnoDB;

CREATE TABLE estado (
    codigo VARCHAR(30) PRIMARY KEY,
    nombre_visible VARCHAR(60) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE prioridad (
    codigo VARCHAR(20) PRIMARY KEY,
    nombre_visible VARCHAR(50) NOT NULL,
    orden INT NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE usuario (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    vinculo VARCHAR(30) NOT NULL,
    rol_id BIGINT NOT NULL,
    area_id BIGINT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_usr_rol FOREIGN KEY (rol_id) REFERENCES rol(id),
    CONSTRAINT fk_usr_area FOREIGN KEY (area_id) REFERENCES area(id)
) ENGINE=InnoDB;

CREATE TABLE politica (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,
    vigente_desde DATETIME(3) NOT NULL,
    publicada_por BIGINT NOT NULL,
    vigente BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_pol_pub FOREIGN KEY (publicada_por) REFERENCES usuario(id)
) ENGINE=InnoDB;

CREATE TABLE detalle_politica (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    politica_id BIGINT NOT NULL,
    prioridad_codigo VARCHAR(20) NOT NULL,
    horas_primera_atencion INT NOT NULL,
    horas_resolucion INT NOT NULL,
    CONSTRAINT uq_pol_prio UNIQUE (politica_id, prioridad_codigo),
    CONSTRAINT fk_det_pol FOREIGN KEY (politica_id) REFERENCES politica(id),
    CONSTRAINT fk_det_prio FOREIGN KEY (prioridad_codigo) REFERENCES prioridad(codigo)
) ENGINE=InnoDB;

CREATE TABLE solicitud (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    solicitante_id BIGINT NOT NULL,
    categoria_id BIGINT NOT NULL,
    area_id BIGINT NOT NULL,
    ubicacion_id BIGINT NOT NULL,
    referencia VARCHAR(200) NULL,
    descripcion VARCHAR(2000) NOT NULL,
    impacto VARCHAR(20) NOT NULL,
    urgencia VARCHAR(20) NOT NULL,
    prioridad_codigo VARCHAR(20) NOT NULL,
    estado_codigo VARCHAR(30) NOT NULL,
    tecnico_id BIGINT NULL,
    solucion VARCHAR(2000) NULL,
    registrada_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    primera_atencion_en DATETIME(3) NULL,
    ultima_resolucion_en DATETIME(3) NULL,
    cerrada_en DATETIME(3) NULL,
    cancelada_en DATETIME(3) NULL,
    limite_atencion DATETIME(3) NOT NULL,
    limite_resolucion DATETIME(3) NOT NULL,
    politica_id BIGINT NOT NULL,
    matriz_aplicada JSON NOT NULL,
    version_fechas INT NOT NULL DEFAULT 1,
    version BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_sol_solicitante FOREIGN KEY (solicitante_id) REFERENCES usuario(id),
    CONSTRAINT fk_sol_cat FOREIGN KEY (categoria_id) REFERENCES categoria(id),
    CONSTRAINT fk_sol_area FOREIGN KEY (area_id) REFERENCES area(id),
    CONSTRAINT fk_sol_ubi FOREIGN KEY (ubicacion_id) REFERENCES ubicacion(id),
    CONSTRAINT fk_sol_prio FOREIGN KEY (prioridad_codigo) REFERENCES prioridad(codigo),
    CONSTRAINT fk_sol_est FOREIGN KEY (estado_codigo) REFERENCES estado(codigo),
    CONSTRAINT fk_sol_tec FOREIGN KEY (tecnico_id) REFERENCES usuario(id),
    CONSTRAINT fk_sol_pol FOREIGN KEY (politica_id) REFERENCES politica(id)
) ENGINE=InnoDB;

CREATE TABLE comentario (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id BIGINT NOT NULL,
    autor_id BIGINT NOT NULL,
    texto VARCHAR(1000) NOT NULL,
    creado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_com_sol FOREIGN KEY (solicitud_id) REFERENCES solicitud(id),
    CONSTRAINT fk_com_aut FOREIGN KEY (autor_id) REFERENCES usuario(id)
) ENGINE=InnoDB;

CREATE TABLE evento_operativo (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id BIGINT NOT NULL,
    actor_id BIGINT NULL,
    accion VARCHAR(60) NOT NULL,
    anterior VARCHAR(255) NULL,
    nuevo VARCHAR(255) NULL,
    motivo VARCHAR(1000) NULL,
    creado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_ev_sol FOREIGN KEY (solicitud_id) REFERENCES solicitud(id),
    CONSTRAINT fk_ev_act FOREIGN KEY (actor_id) REFERENCES usuario(id)
) ENGINE=InnoDB;
