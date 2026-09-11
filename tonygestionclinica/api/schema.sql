-- Tony Gallardo Gestion Clinica - esquema SQLite

CREATE TABLE IF NOT EXISTS pacientes (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre            TEXT    NOT NULL,
    apellidos         TEXT    NOT NULL DEFAULT '',
    dni               TEXT    NOT NULL DEFAULT '',
    fecha_nacimiento  TEXT    NOT NULL DEFAULT '',
    sexo              TEXT    NOT NULL DEFAULT '',
    telefono          TEXT    NOT NULL DEFAULT '',
    email             TEXT    NOT NULL DEFAULT '',
    direccion         TEXT    NOT NULL DEFAULT '',
    ciudad            TEXT    NOT NULL DEFAULT '',
    cp                TEXT    NOT NULL DEFAULT '',
    -- anamnesis
    alerta_medica     TEXT    NOT NULL DEFAULT '',
    alergias          TEXT    NOT NULL DEFAULT '',
    enfermedades      TEXT    NOT NULL DEFAULT '',
    medicacion        TEXT    NOT NULL DEFAULT '',
    embarazo          INTEGER NOT NULL DEFAULT 0,
    fumador           INTEGER NOT NULL DEFAULT 0,
    anticoagulantes   INTEGER NOT NULL DEFAULT 0,
    notas             TEXT    NOT NULL DEFAULT '',
    activo            INTEGER NOT NULL DEFAULT 1,
    creado_en         TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_pacientes_nombre ON pacientes (apellidos, nombre);

CREATE TABLE IF NOT EXISTS doctores (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre       TEXT    NOT NULL,
    especialidad TEXT    NOT NULL DEFAULT '',
    color        TEXT    NOT NULL DEFAULT '#0ea5e9',
    activo       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS gabinetes (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT    NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS citas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL REFERENCES pacientes (id) ON DELETE CASCADE,
    doctor_id   INTEGER     NULL REFERENCES doctores (id) ON DELETE SET NULL,
    gabinete_id INTEGER     NULL REFERENCES gabinetes (id) ON DELETE SET NULL,
    fecha       TEXT    NOT NULL,
    hora_inicio TEXT    NOT NULL,
    hora_fin    TEXT    NOT NULL,
    motivo      TEXT    NOT NULL DEFAULT '',
    estado      TEXT    NOT NULL DEFAULT 'pendiente',
    notas       TEXT    NOT NULL DEFAULT '',
    creado_en   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas (fecha, hora_inicio);
CREATE INDEX IF NOT EXISTS idx_citas_paciente ON citas (paciente_id);

CREATE TABLE IF NOT EXISTS odontograma (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id   INTEGER NOT NULL REFERENCES pacientes (id) ON DELETE CASCADE,
    pieza         TEXT    NOT NULL,
    estado        TEXT    NOT NULL DEFAULT 'sano',
    notas         TEXT    NOT NULL DEFAULT '',
    actualizado_en TEXT   NOT NULL DEFAULT (datetime('now','localtime')),
    UNIQUE (paciente_id, pieza)
);

CREATE TABLE IF NOT EXISTS catalogo_actos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    TEXT    NOT NULL,
    categoria TEXT    NOT NULL DEFAULT '',
    precio    REAL    NOT NULL DEFAULT 0,
    activo    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS presupuestos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL REFERENCES pacientes (id) ON DELETE CASCADE,
    titulo      TEXT    NOT NULL DEFAULT 'Presupuesto',
    fecha       TEXT    NOT NULL DEFAULT (date('now','localtime')),
    estado      TEXT    NOT NULL DEFAULT 'borrador',
    notas       TEXT    NOT NULL DEFAULT '',
    creado_en   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_presupuestos_paciente ON presupuestos (paciente_id);

CREATE TABLE IF NOT EXISTS actos_clinicos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    presupuesto_id INTEGER NOT NULL REFERENCES presupuestos (id) ON DELETE CASCADE,
    nombre         TEXT    NOT NULL,
    pieza          TEXT    NOT NULL DEFAULT '',
    cantidad       INTEGER NOT NULL DEFAULT 1,
    precio         REAL    NOT NULL DEFAULT 0,
    estado         TEXT    NOT NULL DEFAULT 'planificado',
    creado_en      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_actos_presupuesto ON actos_clinicos (presupuesto_id);

CREATE TABLE IF NOT EXISTS pagos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    presupuesto_id INTEGER NOT NULL REFERENCES presupuestos (id) ON DELETE CASCADE,
    paciente_id    INTEGER NOT NULL REFERENCES pacientes (id) ON DELETE CASCADE,
    importe        REAL    NOT NULL DEFAULT 0,
    metodo         TEXT    NOT NULL DEFAULT 'efectivo',
    fecha          TEXT    NOT NULL DEFAULT (date('now','localtime')),
    notas          TEXT    NOT NULL DEFAULT '',
    creado_en      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos (fecha);
CREATE INDEX IF NOT EXISTS idx_pagos_presupuesto ON pagos (presupuesto_id);
