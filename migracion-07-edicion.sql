-- ============================================================
-- MIGRACION 07 — Correccion de actas ya guardadas
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- Se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- Un acta se puede corregir, pero la correccion se nota.
--
-- Hasta ahora un dato mal anotado se quedaba mal para siempre: la unica
-- salida era registrar otra intervencion, lo que ensuciaba el programa
-- de mantenimiento con una ejecucion que nunca ocurrio.
--
-- El acta es un documento firmado, asi que no se reescribe en silencio.
-- Estas tres columnas dejan constancia de quien corrigio, cuando y por
-- que, y el acta lo imprime al pie. Sin eso, "editable" y "confiable"
-- no pueden ser ciertas a la vez.
-- ------------------------------------------------------------

alter table intervenciones
  add column if not exists editada_en timestamptz,
  add column if not exists editada_por text not null default '',
  add column if not exists motivo_edicion text not null default '';

comment on column intervenciones.editada_en is
  'Cuando se corrigio por ultima vez. Nulo si nunca se ha corregido.';
comment on column intervenciones.editada_por is
  'Quien hizo la ultima correccion.';
comment on column intervenciones.motivo_edicion is
  'Que se corrigio y por que. Se imprime al pie del acta.';

-- ============================================================
-- FIN
-- ============================================================
