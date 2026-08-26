-- ============================================================
-- MIGRACION 09 — Diagnostico, causa y repuestos de una correctiva
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- Se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- Un preventivo y un correctivo no piden los mismos datos.
--
-- Hasta ahora la hoja era la misma para los dos, y todo lo que un
-- correctivo tiene de propio —que se reviso, por que fallo y que
-- repuestos se pusieron— acababa escrito revuelto dentro de
-- "actividades realizadas". Asi no se puede buscar por causa de falla
-- ni sumar repuestos por equipo.
--
-- Quedan vacios en las preventivas y en las actas anteriores. No se
-- rellenan a posteriori: no sabemos que se diagnostico en cada una.
-- ------------------------------------------------------------

alter table intervenciones
  add column if not exists diagnostico text not null default '',
  add column if not exists causa_falla text not null default '',
  add column if not exists repuestos text not null default '';

comment on column intervenciones.diagnostico is
  'Correctivas: que se reviso y que se encontro.';
comment on column intervenciones.causa_falla is
  'Correctivas: por que fallo. Es el dato que se analiza para que no se repita.';
comment on column intervenciones.repuestos is
  'Correctivas: repuestos utilizados, uno por linea.';

-- Para poder buscar por causa de falla sin recorrer toda la tabla.
create index if not exists idx_intervenciones_causa_falla
  on intervenciones (id_equipo)
  where causa_falla <> '';

-- ============================================================
-- FIN
-- ============================================================
