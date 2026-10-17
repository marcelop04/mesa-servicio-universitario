-- AX01 · Código MSU-AAAA-NNNN correlativo por año (America/Lima). Una fila por año; se bloquea
-- al generar un código para que dos registros simultáneos no obtengan el mismo número.
CREATE TABLE secuencia_codigo (
    anio INT PRIMARY KEY,
    ultimo INT NOT NULL
);
