# Tony Gallardo · Gestión Clínica

Software de gestión integral para clínica dental. Stack portable pensado para hosting
compartido: **HTML5 + Tailwind (CDN) + Vanilla JS (SPA)** en el frontend y
**PHP 8 + SQLite** en el backend.

## Módulos

| Módulo | Descripción |
|---|---|
| **Panel principal** | Citas pendientes del día, ingresos de hoy y del mes, pacientes activos, saldos pendientes y acceso rápido al alta de paciente. |
| **Pacientes** | CRUD completo con buscador (nombre, DNI, teléfono, email). Ficha con datos personales y anamnesis. Las alertas médicas se destacan en rojo. |
| **Odontograma** | Representación visual FDI (cuadrantes 1–4, piezas 11–48) en CSS Grid. Clic en una pieza para registrar estado: Sano, Caries, Ausente, Empaste o Implante, con anotación clínica. |
| **Agenda** | Calendario diario multigabinete (Sillón 1, Sillón 2). Cita asignada a paciente, doctor y gabinete, con estados Pendiente / En sala de espera / Atendido / Cancelado. |
| **Presupuestos y cobros** | Presupuestos por paciente con actos clínicos (catálogo precargado o manuales), cálculo automático de total, pagado y pendiente, y registro de pagos. |

## Estructura

```
build_clinicweb/
├── index.html              SPA (único punto de entrada)
├── .htaccess               Seguridad y cabeceras
├── api/
│   ├── index.php           Router de la API REST
│   ├── config.php          Constantes y helpers
│   ├── db.php              Conexión PDO, autocreación y datos iniciales
│   ├── schema.sql          Esquema SQLite
│   └── routes/             dashboard · pacientes · citas · odontograma · presupuestos · catalogo
├── db/                     Base de datos (se genera sola, sin acceso web)
└── assets/
    ├── css/app.css
    └── js/                 api.js · ui.js · app.js · views/
```

## Instalación

1. Sube el contenido de `build_clinicweb/` por FTP a la carpeta pública del hosting.
2. Asegúrate de que la carpeta `db/` tenga permisos de escritura (`755` o `777` si el hosting lo exige).
3. Abre la URL en el navegador. En la primera visita se crea `db/clinica.sqlite` con el
   esquema, los gabinetes, los doctores y el catálogo de actos clínicos.

**Requisitos:** PHP 8.0+ con la extensión `pdo_sqlite` (incluida por defecto en la mayoría de hostings).

## API

Todas las llamadas pasan por `api/index.php?r=<recurso>`. Los métodos `PUT` y `DELETE`
se envían como `POST` con la cabecera `X-HTTP-Method-Override`, para evitar problemas
con hostings compartidos que los bloquean.

| Recurso | Métodos | Parámetros |
|---|---|---|
| `dashboard` | GET | — |
| `pacientes` | GET, POST, PUT, DELETE | `id`, `q` |
| `citas` | GET, POST, PUT, DELETE | `id`, `fecha`, `paciente_id` |
| `odontograma` | GET, POST | `paciente_id` |
| `presupuestos` | GET, POST, PUT, DELETE | `id`, `paciente_id` |
| `actos` | POST, PUT, DELETE | `id` |
| `pagos` | POST, DELETE | `id` |
| `catalogo`, `doctores`, `gabinetes` | GET | — |

## Notas

- La baja de un paciente es lógica (`activo = 0`): su historial, citas y cobros se conservan.
- Una pieza dental marcada como *Sano* y sin anotación no ocupa registro en la base de datos.
- El directorio `db/` se protege con `.htaccess`; aun así, conviene ubicarlo fuera del
  directorio público si el hosting lo permite.
