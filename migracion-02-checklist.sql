-- ============================================================
-- MIGRACION 02 — Checklist de mantenimiento y ficha tecnica
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- Se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- INTERVENCIONES: que se le hizo, marcado en lista
-- ------------------------------------------------------------

-- Las tareas marcadas por el tecnico. Va como lista para poder
-- contarlas despues (cuantos cambios de aceite lleva el equipo, etc).
alter table intervenciones
  add column if not exists checklist jsonb default '[]'::jsonb;

comment on column intervenciones.checklist is
  'Tareas marcadas en el formulario. Complementa a actividades_realizadas, '
  'que sigue siendo el texto libre.';

-- ------------------------------------------------------------
-- EQUIPOS: los datos de la ficha tecnica del FOR-MTO-16
--
-- Hoy solo viven dentro del Excel. Aqui permiten generar la hoja
-- de vida completa desde el sistema.
-- ------------------------------------------------------------

alter table equipos add column if not exists pais_fabricacion text default '';
alter table equipos add column if not exists numero_cilindros text default '';
alter table equipos add column if not exists numero_motor text default '';
alter table equipos add column if not exists fases text default '';
alter table equipos add column if not exists temperatura text default '';
alter table equipos add column if not exists capacidad_aceite text default '';
alter table equipos add column if not exists entrega_corriente text default '';
alter table equipos add column if not exists tipo_aceite text default '';
alter table equipos add column if not exists tipo_refrigerante text default '';
alter table equipos add column if not exists peso text default '';
alter table equipos add column if not exists medidas text default '';
alter table equipos add column if not exists frecuencia_mto text default '';
alter table equipos add column if not exists filtro_aire text default '';
alter table equipos add column if not exists filtro_aceite text default '';
alter table equipos add column if not exists filtro_combustible text default '';
alter table equipos add column if not exists programa_mantenimiento text default '';
alter table equipos add column if not exists condiciones_electricas text default '';
alter table equipos add column if not exists condiciones_hidraulicas text default '';
alter table equipos add column if not exists condiciones_mecanicas text default '';

comment on column equipos.frecuencia_mto is
  'Cada cuantas horas toca preventivo, segun el fabricante';

-- ============================================================
-- FIN
-- ============================================================
