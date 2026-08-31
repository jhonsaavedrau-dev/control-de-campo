-- ============================================================
-- MIGRACION 01 — Campos que pidio Karol para la ficha
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- Se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- EQUIPOS
-- ------------------------------------------------------------

-- Las placas de datos que el tecnico necesita ver al llegar
alter table equipos add column if not exists placa_motor text default '';
alter table equipos add column if not exists placa_generador text default '';

-- El TAG viene del inventario FOR-MTO-04 (ej: 'D-C18', 'PG-3412-N1')
alter table equipos add column if not exists tag text default '';

-- Datos del inventario que hoy solo viven en el Excel
alter table equipos add column if not exists descripcion text default '';
alter table equipos add column if not exists producto text default '';
alter table equipos add column if not exists ubicacion text default '';
alter table equipos add column if not exists puesta_en_servicio date;

comment on column equipos.placa_motor is
  'Datos de la placa del motor: numero de motor, modelo, lo que este grabado';
comment on column equipos.placa_generador is
  'Datos de la placa del alternador o generador';
comment on column equipos.tag is
  'TAG del inventario FOR-MTO-04';

-- ------------------------------------------------------------
-- CONTROLADORES
-- ------------------------------------------------------------

-- Clave de configuracion del controlador.
-- Suele ser el mismo numero de serie, pero se guarda aparte porque no
-- siempre coincide y es lo que el tecnico necesita para entrar al equipo.
alter table controladores add column if not exists clave text default '';

comment on column controladores.clave is
  'Clave para configurar el controlador. Normalmente es su numero de serie. '
  'Dato sensible: el sistema exige login para mostrarla.';

-- ------------------------------------------------------------
-- Quien toco cada ficha por ultima vez
-- ------------------------------------------------------------

alter table equipos add column if not exists actualizado_por text default '';
alter table controladores add column if not exists actualizado_por text default '';

-- ============================================================
-- FIN
-- ============================================================
