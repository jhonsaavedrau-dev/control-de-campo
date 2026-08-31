-- ============================================================
-- MIGRACION 04 — Indicadores mensuales (FOR-HSEQ-87)
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- Se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- INDICADORES MENSUALES
--
-- Una fila por equipo y mes. De ella salen los dos indicadores que
-- se trabajan hoy:
--
--   Disponibilidad = horas_operacion / horas_requeridas
--   Confiabilidad  = e^(-24 / MTBF),  MTBF = horas_operacion / fallas
--
-- Las horas se guardan una sola vez. En el Excel se digitan dos
-- veces —numerador de disponibilidad y "tiempo operando" de
-- confiabilidad— y son siempre el mismo numero.
--
-- `fallas` en null significa "cuentalas tu": el sistema las deduce
-- de las intervenciones correctivas de ese mes. Un numero escrito
-- a mano manda sobre el conteo, para los casos que el sistema no
-- puede saber.
-- ------------------------------------------------------------

create table if not exists indicadores_mensuales (
  id uuid primary key default uuid_generate_v4(),
  id_equipo text not null
    references equipos (id_equipo) on update cascade on delete cascade,
  anio integer not null,
  mes integer not null check (mes between 1 and 12),

  -- Numerador de disponibilidad y tiempo operando de confiabilidad.
  horas_operacion numeric,
  -- Denominador: las horas que se le exigieron al equipo ese mes.
  horas_requeridas numeric,
  -- null = las cuenta el sistema desde las correctivas del mes.
  fallas integer check (fallas is null or fallas >= 0),

  obs_disponibilidad text not null default '',
  tendencia_disponibilidad text not null default '',
  obs_confiabilidad text not null default '',
  tendencia_confiabilidad text not null default '',

  actualizado_por text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (id_equipo, anio, mes)
);

create index if not exists idx_indicadores_anio
  on indicadores_mensuales (anio, mes);
create index if not exists idx_indicadores_equipo
  on indicadores_mensuales (id_equipo, anio);

drop trigger if exists trg_indicadores_updated_at on indicadores_mensuales;
create trigger trg_indicadores_updated_at
  before update on indicadores_mensuales
  for each row execute function set_updated_at();

-- ============================================================
-- FIN
-- ============================================================
