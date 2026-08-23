-- ============================================================
-- SISTEMA DE CONTROL DE CAMPO PBI
-- CONTROL DE GENERACION - GESTION ENERGY SAS
--
-- Esquema PostgreSQL para Supabase.
--
-- Reemplaza a schema.sql: mismo diseño, mas las columnas que
-- aparecieron al leer el Excel maestro (nombre del equipo,
-- voltaje, frecuencia, rpm, direccion y puerto del controlador,
-- comunicacion, modo de operacion, sincronismo, load sharing).
--
-- Los archivos (fotos, PDF) viven en Google Drive. Aqui solo
-- quedan los metadatos y las referencias.
--
-- Ejecutar completo en: Supabase -> SQL Editor -> New query
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- TIPOS ENUMERADOS
--
-- Los valores salen del formato oficial Formato_Intervencion_PBI:
-- son exactamente las casillas que se pueden marcar en el papel.
-- ------------------------------------------------------------

do $$ begin
  create type tipo_intervencion as enum (
    'preventiva', 'correctiva', 'diagnostico', 'inspeccion', 'otra'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_equipo as enum (
    'operativo', 'operativo_con_observaciones',
    'fuera_de_servicio', 'pendiente', 'sin_informacion'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type resultado_intervencion as enum (
    'satisfactorio', 'satisfactorio_con_observaciones', 'no_satisfactorio'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_combustible as enum ('diesel', 'glp', 'gas', 'otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rol_usuario as enum ('administrador', 'supervisor', 'tecnico');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- updated_at automatico
-- ------------------------------------------------------------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- USUARIOS
-- ============================================================

create table if not exists usuarios (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique,
  nombre_completo text not null,
  correo text unique not null,
  telefono text default '',
  rol rol_usuario not null default 'tecnico',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_usuarios_updated_at on usuarios;
create trigger trg_usuarios_updated_at
  before update on usuarios
  for each row execute function set_updated_at();

-- ============================================================
-- SEDES
-- ============================================================

create table if not exists sedes (
  id_sede text primary key,               -- 'SD-001'
  nombre text not null,
  cliente text default '',
  ubicacion text default '',
  direccion text default '',
  contacto_nombre text default '',
  contacto_telefono text default '',
  carpeta_drive_id text default '',
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_sedes_updated_at on sedes;
create trigger trg_sedes_updated_at
  before update on sedes
  for each row execute function set_updated_at();

-- ============================================================
-- EQUIPOS
-- ============================================================

create table if not exists equipos (
  id_equipo text primary key,             -- 'GE-001'
  id_sede text not null references sedes (id_sede) on update cascade,
  nombre text default '',                 -- 'GEN N1'
  fabricante text default '',
  modelo text default '',
  serial text default '',
  motor text default '',
  alternador text default '',
  combustible tipo_combustible,
  potencia_nominal_kw numeric(10, 2),
  potencia_eficiente_kw numeric(10, 2),
  potencia_maxima_operativa_kw numeric(10, 2),
  voltaje_v numeric(10, 2),
  frecuencia_hz numeric(10, 2),
  rpm numeric(10, 2),
  horometro_actual numeric(12, 2),
  estado estado_equipo not null default 'sin_informacion',
  foto_equipo_url text default '',
  foto_planta_url text default '',
  carpeta_drive_id text default '',
  carpeta_intervenciones_drive_id text default '',
  observaciones text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_equipos_updated_at on equipos;
create trigger trg_equipos_updated_at
  before update on equipos
  for each row execute function set_updated_at();

create index if not exists idx_equipos_id_sede on equipos (id_sede);
create index if not exists idx_equipos_estado on equipos (estado);

-- ============================================================
-- CONTROLADORES
-- ============================================================

create table if not exists controladores (
  id_controlador text primary key,        -- 'CTRL-001'
  id_equipo text not null references equipos (id_equipo) on update cascade,
  id_sede text not null references sedes (id_sede) on update cascade,
  fabricante text default '',
  modelo text default '',
  firmware text default '',
  ip text default '',
  adress text default '',
  puerto text default '',
  serial text default '',
  comunicacion text default '',
  modo_operacion text default '',
  sincronismo text default '',
  load_sharing text default '',
  estado estado_equipo not null default 'sin_informacion',
  foto_controlador_url text default '',
  foto_equipo_url text default '',
  foto_planta_url text default '',
  carpeta_drive_url text default '',
  url_ficha text default '',
  qr_generado boolean not null default false,
  observaciones text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_controladores_updated_at on controladores;
create trigger trg_controladores_updated_at
  before update on controladores
  for each row execute function set_updated_at();

create index if not exists idx_controladores_id_equipo on controladores (id_equipo);
create index if not exists idx_controladores_id_sede on controladores (id_sede);

-- ============================================================
-- CONSECUTIVO INT-AAAA-NNNN
--
-- Con lock de fila: dos tecnicos guardando a la vez no colisionan.
-- ============================================================

create table if not exists contador_consecutivos (
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
-- INTERVENCIONES
--
-- Las secciones siguen el formato oficial: 1 datos, 2 equipo,
-- 3 intervencion, 4 grupo electrogeno, 5 controlador,
-- 6 resultado y recomendaciones.
-- ============================================================

create table if not exists intervenciones (
  id_intervencion text primary key,

  id_controlador text references controladores (id_controlador) on update cascade,
  id_equipo text not null references equipos (id_equipo) on update cascade,
  id_sede text not null references sedes (id_sede) on update cascade,

  fecha date not null default current_date,
  hora text not null default '',

  -- 1. Datos de la intervencion
  tecnico_id uuid references usuarios (id),
  tecnico_nombre text not null,
  orden_servicio text default '',
  permiso_trabajo text default '',
  tipo_intervencion tipo_intervencion not null,

  -- 2. Equipo (copia fiel al momento de la intervencion)
  fabricante_equipo text default '',
  modelo_equipo text default '',
  serial_equipo text default '',
  horometro numeric(12, 2),

  -- 3. Intervencion
  motivo text default '',
  estado_inicial text default '',
  actividades_realizadas text not null,
  estado_final estado_equipo,

  -- 4. Grupo electrogeno
  motor_obs text default '',
  alternador_obs text default '',
  combustible tipo_combustible,
  potencia_kw numeric(10, 2),
  horas_operacion numeric(12, 2),
  estado_equipo_obs text default '',

  -- 5. Controlador
  marca_controlador text default '',
  modelo_controlador text default '',
  serial_controlador text default '',
  firmware_controlador text default '',
  alarmas_eventos text default '',
  parametros_modificados text default '',
  configuracion_realizada text default '',
  observaciones_controlador text default '',
  backup_realizado boolean not null default false,

  -- 6. Resultado y recomendaciones
  resultado resultado_intervencion,
  recomendaciones text default '',
  pendientes text default '',
  recibido_por text default '',
  responsable_cliente text default '',
  observaciones_finales text default '',

  -- Drive
  carpeta_drive_id text default '',
  carpeta_drive_url text default '',
  pdf_drive_id text default '',
  pdf_drive_url text default '',

  creado_por uuid references usuarios (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_intervenciones_updated_at on intervenciones;
create trigger trg_intervenciones_updated_at
  before update on intervenciones
  for each row execute function set_updated_at();

create index if not exists idx_intervenciones_id_equipo on intervenciones (id_equipo);
create index if not exists idx_intervenciones_id_sede on intervenciones (id_sede);
create index if not exists idx_intervenciones_id_controlador on intervenciones (id_controlador);
create index if not exists idx_intervenciones_fecha on intervenciones (fecha desc);

-- ============================================================
-- EVIDENCIA FOTOGRAFICA
-- ============================================================

create table if not exists intervencion_fotos (
  id uuid primary key default uuid_generate_v4(),
  id_intervencion text not null
    references intervenciones (id_intervencion) on delete cascade,
  drive_file_id text not null,
  drive_url text not null,
  nombre_archivo text default '',
  orden smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_intervencion_fotos_id
  on intervencion_fotos (id_intervencion);

-- ============================================================
-- BACKUPS Y DOCUMENTOS
-- ============================================================

create table if not exists backups (
  id uuid primary key default uuid_generate_v4(),
  id_controlador text not null
    references controladores (id_controlador) on delete cascade,
  fecha date not null default current_date,
  version text default '',
  estado text default '',
  drive_file_id text default '',
  drive_url text default '',
  descripcion text default '',
  creado_por uuid references usuarios (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_backups_id_controlador on backups (id_controlador);

create table if not exists documentos (
  id uuid primary key default uuid_generate_v4(),
  id_controlador text not null
    references controladores (id_controlador) on delete cascade,
  nombre text not null,
  tipo text default '',
  drive_file_id text default '',
  drive_url text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_documentos_id_controlador on documentos (id_controlador);

-- ============================================================
-- VISTA: ficha_equipo
--
-- Lo que necesita la ficha que abre el tecnico al escanear el QR.
-- ============================================================

create or replace view ficha_equipo as
select
  e.id_equipo,
  e.nombre as nombre_equipo,
  e.fabricante as fabricante_equipo,
  e.modelo as modelo_equipo,
  e.serial as serial_equipo,
  e.potencia_nominal_kw,
  e.horometro_actual,
  e.estado as estado_equipo,
  c.id_controlador,
  c.fabricante as fabricante_controlador,
  c.modelo as modelo_controlador,
  c.firmware,
  c.estado as estado_controlador,
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
from equipos e
join sedes s on s.id_sede = e.id_sede
left join controladores c on c.id_equipo = e.id_equipo;

-- ============================================================
-- SEGURIDAD (Row Level Security)
--
-- El sistema entra con la llave de servicio, que se salta RLS.
-- Estas politicas protegen el acceso desde el navegador cuando
-- montemos el login de los tecnicos.
-- ============================================================

alter table sedes enable row level security;
alter table equipos enable row level security;
alter table controladores enable row level security;
alter table intervenciones enable row level security;
alter table intervencion_fotos enable row level security;
alter table backups enable row level security;
alter table documentos enable row level security;

do $$ begin
  create policy "leer sedes" on sedes for select
    using (auth.role() = 'authenticated');
  create policy "leer equipos" on equipos for select
    using (auth.role() = 'authenticated');
  create policy "leer controladores" on controladores for select
    using (auth.role() = 'authenticated');
  create policy "leer intervenciones" on intervenciones for select
    using (auth.role() = 'authenticated');
  create policy "crear intervenciones" on intervenciones for insert
    with check (auth.role() = 'authenticated');
  create policy "leer fotos" on intervencion_fotos for select
    using (auth.role() = 'authenticated');
  create policy "crear fotos" on intervencion_fotos for insert
    with check (auth.role() = 'authenticated');
  create policy "leer backups" on backups for select
    using (auth.role() = 'authenticated');
  create policy "leer documentos" on documentos for select
    using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- ============================================================
-- FIN
-- ============================================================
