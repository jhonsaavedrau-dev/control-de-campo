-- ============================================================
-- MIGRACION 06 — Cargo del tecnico que firma
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- Se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- El acta se firma con nombre y cargo.
--
-- Hasta ahora el cierre tenia dos columnas —tecnico y cliente— y la del
-- cliente se imprimia vacia en cada acta. PBI pidio dejar una sola y
-- que diga con que cargo firma quien intervino: Operador Mantenedor,
-- Supervisor de generacion o Mecanico.
--
-- Queda vacio en las actas anteriores. No se rellena a posteriori: no
-- sabemos con que cargo firmo cada quien ese dia, y adivinarlo en un
-- documento firmado es peor que dejarlo en blanco.
-- ------------------------------------------------------------

alter table intervenciones
  add column if not exists tecnico_cargo text not null default '';

comment on column intervenciones.tecnico_cargo is
  'Cargo con el que firma el tecnico. Vacio en las actas anteriores a '
  'agosto de 2026, cuando el campo no existia.';

-- ============================================================
-- FIN
-- ============================================================
