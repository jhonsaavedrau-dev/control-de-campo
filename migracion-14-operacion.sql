-- ============================================================
-- MIGRACION 14 — Registro horario de operación
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- Se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- La hoja "BD Generación" del Excel de PBI, tal cual.
--
-- 25.412 registros horarios desde noviembre de 2025: kW, factor de
-- carga, amperaje, voltaje, temperaturas, presiones, combustible y
-- energia, hora a hora y por equipo. Es la fuente que alimenta los
-- indicadores, el desgaste y la trazabilidad.
--
-- Se traen TODAS las columnas del Excel, incluidas las que hoy vienen
-- casi vacias: quitar una columna es una decision que no se puede
-- deshacer sin volver a importar.
--
-- Dos cosas que no son evidentes y conviene tener escritas:
--
-- 1. La columna rotulada "Horometro Inicial" NO contiene un horometro.
--    Contiene el amperaje calculado: coincide con
--    kW*1000/(V*PF*1,73) en el 86,8% de 12.737 filas comparables, con
--    error mediano del 0,00%, y se parece a un horometro en 1 fila de
--    13.005. Por eso entra como `amperaje` y no se acerca a la serie de
--    horometros. La columna "Amp Prom", que deberia llevarlo, viene
--    vacia en 25.616 de 26.409 filas.
--
-- 2. `sospechoso` marca las filas que no se pueden creer pero tampoco
--    se descartan: horometros imposibles y filas con los valores
--    corridos de columna. Se importan igual —son el registro de lo que
--    paso— pero quedan senaladas para que ningun promedio las use sin
--    saberlo.
-- ------------------------------------------------------------

create table if not exists registros_operacion (
  id uuid primary key default uuid_generate_v4(),

  id_equipo text not null
    references equipos (id_equipo) on update cascade on delete cascade,
  id_sede text not null default '',

  -- Fecha y hora del registro. Un equipo no tiene dos lecturas en la
  -- misma hora: si llegan dos, es la misma digitada dos veces.
  fecha date not null,
  hora text not null default '',
  momento timestamptz,

  ubicacion text not null default '',
  estado text not null default '',

  kw_nominal numeric,
  kw_real numeric,
  factor_carga numeric,

  horometro numeric,
  -- Ver la nota 1 de arriba: la columna del Excel se llama
  -- "Horometro Inicial" pero lo que trae es amperaje.
  amperaje numeric,
  horometro_final numeric,
  horas_en_linea numeric,
  amp_prom numeric,

  voltaje_prom numeric,
  factor_potencia numeric,
  potencia_aparente numeric,
  potencia_aparente_r numeric,
  frecuencia numeric,
  carga_bateria numeric,

  temp_motor_f numeric,
  temp_motor_c numeric,
  presion_aceite_bar numeric,
  presion_aceite_psi numeric,
  presion_gas_psi numeric,

  kw_acumulado numeric,
  consumo_diesel_gln numeric,
  consumo_diesel_lt numeric,
  consumo_glp_m3 numeric,
  energia_dia_kwh numeric,
  energia_acum_hoy numeric,
  energia_acum_ayer numeric,

  operador text not null default '',

  -- De donde salio y si hay que desconfiar.
  origen text not null default 'excel',
  sospechoso text not null default '',
  fila_origen integer,

  created_at timestamptz not null default now(),

  unique (id_equipo, fecha, hora)
);

create index if not exists idx_operacion_equipo_fecha
  on registros_operacion (id_equipo, fecha desc, hora desc);
create index if not exists idx_operacion_fecha
  on registros_operacion (fecha desc);
-- Para poder listar rapido lo que hay que revisar.
create index if not exists idx_operacion_sospechoso
  on registros_operacion (id_equipo, fecha)
  where sospechoso <> '';

-- ============================================================
-- FIN
-- ============================================================
