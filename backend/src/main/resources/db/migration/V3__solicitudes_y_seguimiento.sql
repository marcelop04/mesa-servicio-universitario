-- Solicitudes y seguimiento (informe, sección 9.3, tabla 16) y revocación de sesión (tabla 15).
-- Marcelo (MR01). Las descripciones, motivos y comentarios usan VARCHAR con el límite de la
-- tabla 16 en lugar de TEXT, para que la validación del esquema sea igual en MySQL y en H2.

CREATE TABLE solicitud (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL,
    solicitante_id BIGINT NOT NULL,
    categoria_id BIGINT NOT NULL,
    area_id BIGINT NOT NULL,
    ubicacion_id BIGINT NOT NULL,
    referencia VARCHAR(200) NULL,
    descripcion VARCHAR(2000) NOT NULL,
    impacto VARCHAR(10) NOT NULL,
    urgencia VARCHAR(10) NOT NULL,
    prioridad_codigo VARCHAR(20) NOT NULL,
    estado_codigo VARCHAR(20) NOT NULL,
    tecnico_id BIGINT NULL,
    duplicada_de_id BIGINT NULL,
    -- Control de la solicitud (fechas en UTC, límites calculados en el servidor)
    registrada_en DATETIME(3) NOT NULL,
    primera_atencion_en DATETIME(3) NULL,
    ultima_resolucion_en DATETIME(3) NULL,
    cerrada_en DATETIME(3) NULL,
    cancelada_en DATETIME(3) NULL,
    limite_atencion DATETIME(3) NOT NULL,
    limite_resolucion DATETIME(3) NOT NULL,
    politica_id BIGINT NOT NULL,
    matriz_aplicada JSON NOT NULL,
    version_fechas INT NOT NULL DEFAULT 1,
    version INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_solicitud_codigo UNIQUE (codigo),
    CONSTRAINT fk_solicitud_solicitante FOREIGN KEY (solicitante_id) REFERENCES usuario (id),
    CONSTRAINT fk_solicitud_categoria FOREIGN KEY (categoria_id) REFERENCES categoria (id),
    CONSTRAINT fk_solicitud_area FOREIGN KEY (area_id) REFERENCES area (id),
    CONSTRAINT fk_solicitud_ubicacion FOREIGN KEY (ubicacion_id) REFERENCES ubicacion (id),
    CONSTRAINT fk_solicitud_prioridad FOREIGN KEY (prioridad_codigo) REFERENCES prioridad (codigo),
    CONSTRAINT fk_solicitud_estado FOREIGN KEY (estado_codigo) REFERENCES estado (codigo),
    CONSTRAINT fk_solicitud_tecnico FOREIGN KEY (tecnico_id) REFERENCES usuario (id),
    CONSTRAINT fk_solicitud_duplicada FOREIGN KEY (duplicada_de_id) REFERENCES solicitud (id),
    CONSTRAINT fk_solicitud_politica FOREIGN KEY (politica_id) REFERENCES politica (id),
    CONSTRAINT ck_solicitud_impacto CHECK (impacto IN ('ALTO', 'MEDIO', 'BAJO')),
    CONSTRAINT ck_solicitud_urgencia CHECK (urgencia IN ('ALTA', 'MEDIA', 'BAJA')),
    CONSTRAINT ck_solicitud_limites CHECK (limite_atencion <= limite_resolucion)
);

CREATE INDEX ix_solicitud_filtros ON solicitud (estado_codigo, area_id, prioridad_codigo, registrada_en);
CREATE INDEX ix_solicitud_solicitante ON solicitud (solicitante_id, registrada_en);
CREATE INDEX ix_solicitud_tecnico ON solicitud (tecnico_id, estado_codigo);

CREATE TABLE comentario (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id BIGINT NOT NULL,
    autor_id BIGINT NOT NULL,
    texto VARCHAR(1000) NOT NULL,
    creado_en DATETIME(3) NOT NULL,
    CONSTRAINT fk_comentario_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitud (id),
    CONSTRAINT fk_comentario_autor FOREIGN KEY (autor_id) REFERENCES usuario (id)
);

CREATE INDEX ix_comentario_solicitud ON comentario (solicitud_id, creado_en);

CREATE TABLE evidencia (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id BIGINT NOT NULL,
    autor_id BIGINT NOT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    ruta_privada VARCHAR(500) NOT NULL,
    tipo_real VARCHAR(20) NOT NULL,
    bytes INT NOT NULL,
    creada_en DATETIME(3) NOT NULL,
    CONSTRAINT fk_evidencia_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitud (id),
    CONSTRAINT fk_evidencia_autor FOREIGN KEY (autor_id) REFERENCES usuario (id),
    CONSTRAINT uq_evidencia_ruta UNIQUE (ruta_privada),
    CONSTRAINT ck_evidencia_tipo CHECK (tipo_real IN ('image/jpeg', 'image/png')),
    CONSTRAINT ck_evidencia_bytes CHECK (bytes > 0 AND bytes <= 5242880)
);

CREATE INDEX ix_evidencia_solicitud ON evidencia (solicitud_id);

-- Un evento por cada transición o cambio operativo (HU23). Actor nulo solo en acciones del sistema.
CREATE TABLE evento_operativo (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id BIGINT NOT NULL,
    actor_id BIGINT NULL,
    accion VARCHAR(40) NOT NULL,
    anterior JSON NULL,
    nuevo JSON NULL,
    motivo VARCHAR(2000) NULL,
    creado_en DATETIME(3) NOT NULL,
    CONSTRAINT fk_evento_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitud (id),
    CONSTRAINT fk_evento_actor FOREIGN KEY (actor_id) REFERENCES usuario (id)
);

CREATE INDEX ix_evento_solicitud ON evento_operativo (solicitud_id, creado_en);

CREATE TABLE asignacion_historica (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id BIGINT NOT NULL,
    tecnico_anterior_id BIGINT NULL,
    tecnico_nuevo_id BIGINT NOT NULL,
    actor_id BIGINT NOT NULL,
    motivo VARCHAR(1000) NULL,
    creada_en DATETIME(3) NOT NULL,
    CONSTRAINT fk_asignacion_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitud (id),
    CONSTRAINT fk_asignacion_anterior FOREIGN KEY (tecnico_anterior_id) REFERENCES usuario (id),
    CONSTRAINT fk_asignacion_nuevo FOREIGN KEY (tecnico_nuevo_id) REFERENCES usuario (id),
    CONSTRAINT fk_asignacion_actor FOREIGN KEY (actor_id) REFERENCES usuario (id)
);

CREATE INDEX ix_asignacion_solicitud ON asignacion_historica (solicitud_id, creada_en);

CREATE TABLE notificacion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    solicitud_id BIGINT NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    texto VARCHAR(300) NOT NULL,
    version_fechas INT NOT NULL,
    creada_en DATETIME(3) NOT NULL,
    leida_en DATETIME(3) NULL,
    clave_evento VARCHAR(150) NOT NULL,
    CONSTRAINT fk_notificacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id),
    CONSTRAINT fk_notificacion_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitud (id),
    CONSTRAINT uq_notificacion_clave UNIQUE (clave_evento)
);

CREATE INDEX ix_notificacion_usuario ON notificacion (usuario_id, leida_en, creada_en);

CREATE TABLE encuesta (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id BIGINT NOT NULL,
    solicitante_id BIGINT NOT NULL,
    calificacion INT NOT NULL,
    comentario VARCHAR(500) NULL,
    creada_en DATETIME(3) NOT NULL,
    CONSTRAINT uq_encuesta_solicitud UNIQUE (solicitud_id),
    CONSTRAINT fk_encuesta_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitud (id),
    CONSTRAINT fk_encuesta_solicitante FOREIGN KEY (solicitante_id) REFERENCES usuario (id),
    CONSTRAINT ck_encuesta_calificacion CHECK (calificacion BETWEEN 1 AND 5)
);

-- Auditoría administrativa (HU23 BDD 2): sin contraseñas, tokens ni contenido de evidencias.
CREATE TABLE auditoria (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_id BIGINT NULL,
    accion VARCHAR(60) NOT NULL,
    entidad VARCHAR(60) NOT NULL,
    entidad_id VARCHAR(64) NULL,
    metadatos JSON NULL,
    creada_en DATETIME(3) NOT NULL,
    CONSTRAINT fk_auditoria_actor FOREIGN KEY (actor_id) REFERENCES usuario (id)
);

CREATE INDEX ix_auditoria_fecha ON auditoria (creada_en);

-- Tabla 15: permite invalidar un JWT antes de expirar (DV04). Guarda solo el identificador del token.
CREATE TABLE revocacion_sesion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    token_id VARCHAR(64) NOT NULL,
    usuario_id BIGINT NOT NULL,
    revocado_en DATETIME(3) NOT NULL,
    expira_en DATETIME(3) NOT NULL,
    CONSTRAINT uq_revocacion_token UNIQUE (token_id),
    CONSTRAINT fk_revocacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
);

CREATE INDEX ix_revocacion_expira ON revocacion_sesion (expira_en);
