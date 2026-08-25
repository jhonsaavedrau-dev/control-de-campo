-- ============================================================
-- MIGRACION 08 — Reporte de falla (FOR-MTO-53)
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- Se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- REPORTES DE FALLA
--
-- El formato FOR-MTO-53, version 01. Es el documento donde se
-- explica un evento: la secuencia registrada por el controlador,
-- que variables se movieron y cual fue la causa mas probable.
--
-- Se guarda aparte del acta de intervencion porque son dos cosas
-- distintas: el acta dice que se le hizo al equipo, y el reporte
-- dice que le paso. Un evento puede no llevar intervencion, y una
-- intervencion puede no venir de una falla. Cuando si van juntos,
-- `id_intervencion` los enlaza.
--
-- Y de aqui sale el numero de fallas del mes en los indicadores.
-- Hasta ahora se deducia contando intervenciones correctivas, que
-- es una aproximacion: dos correctivas del mismo evento contaban
-- dos fallas, y un evento sin intervencion no contaba ninguna. Un
-- reporte de falla es un evento, uno y solo uno.
-- ------------------------------------------------------------

create table if not exists reportes_falla (
  id_reporte text primary key,

  id_equipo text not null
    references equipos (id_equipo) on update cascade on delete cascade,
  id_sede text not null default '',

  -- Cabecera del formato. Se rellena sola desde la sede y el equipo,
  -- pero queda escrita: es la foto de como se llamaban ese dia.
  bloque text not null default '',
  campo text not null default '',
  sistema text not null default 'GENERACION',
  denominacion_equipos text not null default '',
  codigo_serial text not null default '',
  horometro numeric,

  -- Cuando ocurrio. De esta fecha depende en que mes cuenta la falla
  -- dentro de los indicadores, asi que es obligatoria.
  fecha_evento date not null,
  -- El "TIEMPO H/H" del formato: a que hora empezo y a que hora acabo.
  hora_inicio text not null default '',
  hora_fin text not null default '',
  -- El formato distingue el reporte preliminar del definitivo.
  fecha_final date,

  descripcion_evento text not null default '',
  conclusion text not null default '',

  -- El acta de la correctiva, si la hubo. Sin ella el reporte vale
  -- igual: hay eventos que se explican y no se interviene.
  id_intervencion text
    references intervenciones (id_intervencion) on update cascade on delete set null,

  pdf_drive_id text not null default '',
  pdf_drive_url text not null default '',

  creado_por text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Los indicadores preguntan siempre por equipo y por mes del evento.
create index if not exists idx_reportes_falla_equipo_fecha
  on reportes_falla (id_equipo, fecha_evento);
create index if not exists idx_reportes_falla_fecha
  on reportes_falla (fecha_evento);

drop trigger if exists trg_reportes_falla_updated_at on reportes_falla;
create trigger trg_reportes_falla_updated_at
  before update on reportes_falla
  for each row execute function set_updated_at();

-- ============================================================
-- FIN
-- ============================================================
