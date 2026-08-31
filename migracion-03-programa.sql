-- ============================================================
-- MIGRACION 03 — Programa de mantenimiento (FOR-MTO-17)
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- Se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- EQUIPOS: separar los generadores del resto de activos
--
-- El programa de mantenimiento no cubre solo generadores: tambien
-- el power center, el tanque de combustible, el scrubber de GLP y
-- la oficina. Son activos con mantenimiento programado, pero no
-- tienen potencia ni horometro, asi que no deben mezclarse con los
-- generadores en la pantalla de inicio.
-- ------------------------------------------------------------

alter table equipos
  add column if not exists tipo_activo text not null default 'generador';

comment on column equipos.tipo_activo is
  'generador = grupo electrogeno; apoyo = tanque, power center, oficina y demas '
  'activos del programa de mantenimiento que no generan energia.';

-- ------------------------------------------------------------
-- PROGRAMA DE MANTENIMIENTO
--
-- Una fila por equipo y mes, que es exactamente una fila del PDT.
-- De aqui salen las dos vistas del formato: el plan anual (la
-- rejilla de 12 meses por 4 semanas) y la hoja del mes. Al ser el
-- mismo dato, no pueden desincronizarse — que es justo lo que hoy
-- obliga a verificar a mano trece hojas.
--
-- Lo ejecutado NO se guarda aqui cuando viene de un acta: se
-- deduce al leer, buscando intervenciones de ese equipo en ese mes.
-- Asi, si un acta se corrige o se borra, el cumplimiento se corrige
-- solo. La columna `ejecutado` es para los activos que no llevan
-- acta, como la oficina o el tanque.
-- ------------------------------------------------------------

create table if not exists programa_mantenimiento (
  id uuid primary key default uuid_generate_v4(),
  id_equipo text not null
    references equipos (id_equipo) on update cascade on delete cascade,
  anio integer not null,
  mes integer not null check (mes between 1 and 12),
  -- La semana del mes en que toca, 1 a 4 como en el formato impreso.
  semana integer not null default 1 check (semana between 1 and 4),
  programado text not null default '',
  ejecutado text not null default '',
  semana_ejecucion integer check (semana_ejecucion between 1 and 4),
  actualizado_por text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Un equipo tiene una linea por mes, como en la hoja.
  unique (id_equipo, anio, mes)
);

create index if not exists idx_programa_anio on programa_mantenimiento (anio, mes);
create index if not exists idx_programa_equipo on programa_mantenimiento (id_equipo, anio);

drop trigger if exists trg_programa_updated_at on programa_mantenimiento;
create trigger trg_programa_updated_at
  before update on programa_mantenimiento
  for each row execute function set_updated_at();

-- ============================================================
-- FIN
-- ============================================================
