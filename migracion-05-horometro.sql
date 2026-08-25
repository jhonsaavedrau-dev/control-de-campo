-- ============================================================
-- MIGRACION 05 — Lectura mensual del horometro
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- Se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- El horometro al cerrar cada mes.
--
-- Es el ultimo dato que seguia escribiendose a mano. Las horas de
-- operacion de un mes son la resta de dos lecturas consecutivas, asi
-- que con una lectura mensual —aunque no haya habido intervencion— el
-- numerador del indicador sale solo.
--
-- `horas_operacion` se queda: si esta escrito, manda sobre la resta.
-- Hay meses que no se pueden deducir (el primero de la serie, o
-- despues de cambiar un horometro averiado) y ahi hace falta el
-- numero a mano.
-- ------------------------------------------------------------

alter table indicadores_mensuales
  add column if not exists horometro numeric;

comment on column indicadores_mensuales.horometro is
  'Lectura del horometro al cerrar el mes. Las horas de operacion salen '
  'de restar la lectura del mes anterior.';

-- ============================================================
-- FIN
-- ============================================================
