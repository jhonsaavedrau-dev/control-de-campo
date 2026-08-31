-- ============================================================
-- MIGRACION 10 — Sincronismo y equipos asociados
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- Se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- Como opera cada equipo y con cuales va en paralelo.
--
-- La potencia, la marca y el controlador ya estaban. Faltaba lo que
-- explica por que dos equipos de un mismo campo se comportan igual:
-- que sincronizan entre si.
--
-- `grupo_sincronismo` es el nombre de la barra o del grupo con el que
-- va en paralelo —"Barra 1", "Casa de maquinas"—. Los equipos de una
-- misma sede que comparten ese texto son los asociados entre si. Se
-- hace con un texto y no con una tabla de relaciones porque un grupo de
-- sincronismo es una lista sin jerarquia: escribir el mismo nombre en
-- tres equipos ya los relaciona, y no hay que mantener nada aparte.
-- ------------------------------------------------------------

alter table equipos
  add column if not exists sincronismo text not null default 'individual',
  add column if not exists grupo_sincronismo text not null default '';

-- Solo los tres modos que existen en campo.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'equipos_sincronismo_valido'
  ) then
    alter table equipos
      add constraint equipos_sincronismo_valido
      check (sincronismo in ('individual', 'paralelo', 'respaldo'));
  end if;
end $$;

comment on column equipos.sincronismo is
  'Como opera: individual, en paralelo con otros, o de respaldo.';
comment on column equipos.grupo_sincronismo is
  'Barra o grupo con el que sincroniza. Los equipos de una sede que '
  'comparten este texto son los asociados entre si.';

-- Para sacar de una vez los asociados de un equipo.
create index if not exists idx_equipos_grupo_sincronismo
  on equipos (id_sede, grupo_sincronismo)
  where grupo_sincronismo <> '';

-- ============================================================
-- FIN
-- ============================================================
