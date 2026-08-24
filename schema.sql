-- ============================================================
-- SISTEMA DE CONTROL DE CAMPO PBI
-- CONTROL DE GENERACION - PBI SAS ESP
--
-- Esquema de base de datos PostgreSQL (Supabase)
-- Version: 1.0
-- Reemplaza la base de datos anterior en Google Sheets
--
-- Los archivos (fotos, PDF de intervenciones) siguen viviendo
-- en Google Drive. Esta base de datos guarda unicamente los
-- metadatos y las referencias (IDs y URLs) hacia esos archivos.
-- ============================================================


-- ------------------------------------------------------------
-- EXTENSIONES
-- ------------------------------------------------------------

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ------------------------------------------------------------
-- TIPOS ENUMERADOS
--
-- Se definen como enum en vez de texto libre para evitar
-- inconsistencias como "Preventivo" vs "preventivo" vs "PREV".
-- ------------------------------------------------------------

create type tipo_intervencion as enum (
  'preventiva',
  'correctiva',
  'diagnostico',
  'inspeccion',
  'configuracion',
  'prueba_funcionamiento',
  'emergencia',
  'mejora',
  'otra'
);

create type estado_equipo as enum (
  'operativo',
  'operativo_con_observaciones',
  'fuera_de_servicio',
  'pendiente',
  'sin_informacion'
);

create type resultado_intervencion as enum (
  'satisfactorio',
  'satisfactorio_con_observaciones',
  'no_satisfactorio'
);

create type tipo_combustible as enum (
  'diesel',
  'glp',
  'gas',
  'otro'
);

create type tipo_equipo_generacion as enum (
  'grupo_electrogeno',
  'controlador'
);

create type rol_usuario as enum (
  'administrador',
  'supervisor',
  'tecnico'
);


-- ------------------------------------------------------------
-- FUNCION AUXILIAR: actualizar updated_at automaticamente
-- ------------------------------------------------------------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- ============================================================
-- TABLA: usuarios
--
-- Tecnicos, supervisores y administradores del sistema.
-- Se referencia por FK en auth.users si se usa Supabase Auth.
-- ============================================================

create table usuarios (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique,
  nombre_completo text not null,
  correo text unique not null,
  telefono text,
  rol rol_usuario not null default 'tecnico',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_usuarios_updated_at
  before update on usuarios
  for each row execute function set_updated_at();


-- ============================================================
-- TABLA: sedes
--
-- Sitios o campos donde opera PBI SAS ESP.
-- Corresponde a las carpetas SD-XXX dentro de 01_SEDES en Drive.
-- ============================================================

create table sedes (
  id_sede text primary key,               -- Ej: 'SD-001'
  nombre text not null,
  cliente text,
  ubicacion text,
  direccion text,
  contacto_nombre text,
  contacto_telefono text,
  carpeta_drive_id text,                  -- ID de la carpeta SD-XXX en Drive
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_sedes_updated_at
  before update on sedes
  for each row execute function set_updated_at();

create index idx_sedes_activa on sedes (activa);


-- ============================================================
-- TABLA: equipos
--
-- Equipos fisicos de generacion (grupos electrogenos).
-- Corresponde a las carpetas GE-XXX dentro de 01_EQUIPOS en Drive.
-- ============================================================

create table equipos (
  id_equipo text primary key,             -- Ej: 'GE-001'
  id_sede text not null references sedes (id_sede) on update cascade,
  tipo_equipo tipo_equipo_generacion not null default 'grupo_electrogeno',
  fabricante text,
  modelo text,
  serial text,
  motor text,
  alternador text,
  combustible tipo_combustible,
  potencia_nominal_kw numeric(10, 2),
  potencia_eficiente_kw numeric(10, 2),
  potencia_maxima_operativa_kw numeric(10, 2),
  horometro_actual numeric(12, 2),
  estado estado_equipo not null default 'sin_informacion',
  foto_equipo_url text,
  foto_planta_url text,
  carpeta_drive_id text,                  -- ID de la carpeta GE-XXX en Drive
  carpeta_intervenciones_drive_id text,   -- ID de 06_INTERVENCIONES
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_equipos_updated_at
  before update on equipos
  for each row execute function set_updated_at();

create index idx_equipos_id_sede on equipos (id_sede);
create index idx_equipos_estado on equipos (estado);


-- ============================================================
-- TABLA: controladores
--
-- Paneles de control asociados a un equipo (COMAP, InteliGen,
-- EMCP, etc). Cada controlador tiene su propia ficha con QR.
-- ============================================================

create table controladores (
  id_controlador text primary key,        -- Ej: 'CTRL-001'
  id_equipo text not null references equipos (id_equipo) on update cascade,
  id_sede text not null references sedes (id_sede) on update cascade,
  fabricante text,
  modelo text,
  firmware text,
  ip text,
  serial text,
  estado estado_equipo not null default 'sin_informacion',
  foto_controlador_url text,
  url_ficha text,                         -- URL publica generada para el QR
  qr_generado boolean not null default false,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_controladores_updated_at
  before update on controladores
  for each row execute function set_updated_at();

create index idx_controladores_id_equipo on controladores (id_equipo);
create index idx_controladores_id_sede on controladores (id_sede);


-- ============================================================
-- TABLA: contador_consecutivos
--
-- Reemplaza el uso de PropertiesService de Apps Script para
-- generar IDs tipo INT-2026-0001, evitando colisiones entre
-- tecnicos que guardan al mismo tiempo (se controla con un
-- lock a nivel de fila mediante SELECT ... FOR UPDATE).
-- ============================================================

create table contador_consecutivos (
  anio integer primary key,
  ultimo_numero integer not null default 0
);

create or replace function siguiente_id_intervencion()
returns text as $$
declare
  anio_actual integer := extract(year from now())::integer;
  numero integer;
begin
  insert into contador_consecutivos (anio, ultimo_numero)
  values (anio_actual, 0)
  on conflict (anio) do nothing;

  update contador_consecutivos
    set ultimo_numero = ultimo_numero + 1
    where anio = anio_actual
    returning ultimo_numero into numero;

  return 'INT-' || anio_actual || '-' || lpad(numero::text, 4, '0');
end;
$$ language plpgsql;


-- ============================================================
-- TABLA: intervenciones
--
-- Nucleo del sistema. Cada fila corresponde a un mantenimiento,
-- diagnostico o inspeccion realizado sobre un equipo.
-- ============================================================

create table intervenciones (
  id_intervencion text primary key default siguiente_id_intervencion(),

  id_controlador text references controladores (id_controlador) on update cascade,
  id_equipo text not null references equipos (id_equipo) on update cascade,
  id_sede text not null references sedes (id_sede) on update cascade,

  fecha date not null default current_date,
  hora time not null default current_time,

  -- 1. Datos de la intervencion
  tecnico_id uuid references usuarios (id),
  tecnico_nombre text not null,          -- copia textual, por si el usuario se elimina despues
  orden_servicio text,
  permiso_trabajo text,
  tipo_intervencion tipo_intervencion not null,

  -- 2. Equipo (copia al momento de la intervencion, para historial fiel)
  fabricante_equipo text,
  modelo_equipo text,
  serial_equipo text,
  horometro numeric(12, 2),

  -- 3. Intervencion
  motivo text,
  estado_inicial text,
  actividades_realizadas text not null,
  estado_final estado_equipo,

  -- 4. Grupo electrogeno
  motor_obs text,
  alternador_obs text,
  combustible tipo_combustible,
  potencia_kw numeric(10, 2),
  horas_operacion numeric(12, 2),
  estado_equipo_obs text,

  -- 5. Controlador
  marca_controlador text,
  modelo_controlador text,
  serial_controlador text,
  firmware_controlador text,
  alarmas_eventos text,
  parametros_modificados text,
  configuracion_realizada text,
  observaciones_controlador text,
  backup_realizado boolean not null default false,

  -- 6. Resultado y recomendaciones
  resultado resultado_intervencion,
  recomendaciones text,
  pendientes text,
  recibido_por text,
  responsable_cliente text,
  observaciones_finales text,

  -- Almacenamiento en Drive
  carpeta_drive_id text,                  -- carpeta creada para esta intervencion
  carpeta_drive_url text,
  pdf_drive_id text,
  pdf_drive_url text,

  creado_por uuid references usuarios (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_intervenciones_updated_at
  before update on intervenciones
  for each row execute function set_updated_at();

create index idx_intervenciones_id_equipo on intervenciones (id_equipo);
create index idx_intervenciones_id_sede on intervenciones (id_sede);
create index idx_intervenciones_id_controlador on intervenciones (id_controlador);
create index idx_intervenciones_fecha on intervenciones (fecha desc);
create index idx_intervenciones_tipo on intervenciones (tipo_intervencion);


-- ============================================================
-- TABLA: intervencion_fotos
--
-- Cada fotografia de evidencia queda como una fila propia en
-- vez de una lista de URLs separadas por salto de linea (como
-- se hacia en la hoja de Sheets), lo que permite consultarlas,
-- ordenarlas o eliminarlas individualmente.
-- ============================================================

create table intervencion_fotos (
  id uuid primary key default uuid_generate_v4(),
  id_intervencion text not null references intervenciones (id_intervencion) on delete cascade,
  drive_file_id text not null,
  drive_url text not null,
  nombre_archivo text,
  orden smallint not null default 0,
  created_at timestamptz not null default now()
);

create index idx_intervencion_fotos_id_intervencion on intervencion_fotos (id_intervencion);


-- ============================================================
-- TABLA: backups
--
-- Respaldo de configuraciones de un controlador (heredado del
-- diseno anterior en Sheets, se conserva por continuidad).
-- ============================================================

create table backups (
  id uuid primary key default uuid_generate_v4(),
  id_controlador text not null references controladores (id_controlador) on delete cascade,
  fecha date not null default current_date,
  drive_file_id text,
  drive_url text,
  descripcion text,
  creado_por uuid references usuarios (id),
  created_at timestamptz not null default now()
);

create index idx_backups_id_controlador on backups (id_controlador);


-- ============================================================
-- TABLA: documentos
--
-- Documentos generales asociados a un controlador que no son
-- ni fotos de evidencia ni backups (manuales, planos, fichas
-- tecnicas del fabricante, etc).
-- ============================================================

create table documentos (
  id uuid primary key default uuid_generate_v4(),
  id_controlador text not null references controladores (id_controlador) on delete cascade,
  nombre text not null,
  tipo text,
  drive_file_id text,
  drive_url text,
  created_at timestamptz not null default now()
);

create index idx_documentos_id_controlador on documentos (id_controlador);


-- ============================================================
-- VISTA: ficha_equipo
--
-- Consolida equipo + controlador + sede + ultima intervencion
-- en una sola consulta, que es exactamente lo que necesita la
-- ficha digital que ve el tecnico al escanear el QR.
-- ============================================================

create view ficha_equipo as
select
  c.id_controlador,
  c.fabricante as fabricante_controlador,
  c.modelo as modelo_controlador,
  c.estado as estado_controlador,
  e.id_equipo,
  e.fabricante as fabricante_equipo,
  e.modelo as modelo_equipo,
  e.serial as serial_equipo,
  e.horometro_actual,
  e.estado as estado_equipo,
  s.id_sede,
  s.nombre as nombre_sede,
  s.cliente,
  s.ubicacion,
  (
    select i.fecha
    from intervenciones i
    where i.id_equipo = e.id_equipo
    order by i.fecha desc, i.hora desc
    limit 1
  ) as fecha_ultima_intervencion
from controladores c
join equipos e on e.id_equipo = c.id_equipo
join sedes s on s.id_sede = c.id_sede;


-- ============================================================
-- POLITICAS DE SEGURIDAD (Row Level Security)
--
-- Se activan por defecto en Supabase. Se deja preparado el
-- esqueleto; las condiciones exactas se ajustan cuando se
-- defina el modelo de autenticacion de los tecnicos.
-- ============================================================

alter table sedes enable row level security;
alter table equipos enable row level security;
alter table controladores enable row level security;
alter table intervenciones enable row level security;
alter table intervencion_fotos enable row level security;

create policy "Usuarios autenticados pueden leer sedes"
  on sedes for select
  using (auth.role() = 'authenticated');

create policy "Usuarios autenticados pueden leer equipos"
  on equipos for select
  using (auth.role() = 'authenticated');

create policy "Usuarios autenticados pueden leer controladores"
  on controladores for select
  using (auth.role() = 'authenticated');

create policy "Usuarios autenticados pueden leer y crear intervenciones"
  on intervenciones for select
  using (auth.role() = 'authenticated');

create policy "Usuarios autenticados pueden registrar intervenciones"
  on intervenciones for insert
  with check (auth.role() = 'authenticated');

create policy "Usuarios autenticados pueden leer fotos de intervencion"
  on intervencion_fotos for select
  using (auth.role() = 'authenticated');

create policy "Usuarios autenticados pueden registrar fotos de intervencion"
  on intervencion_fotos for insert
  with check (auth.role() = 'authenticated');


-- ============================================================
-- FIN DEL ESQUEMA
-- ============================================================
