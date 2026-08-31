-- ============================================================
-- MIGRACION 15 — Generacion diaria y sincronizacion con la hoja
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- Se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- El cierre de cada dia, por equipo.
--
-- Es lo que PBI mira de verdad: el horometro, cuanto combustible se
-- gasto y cuantos kilovatios se generaron. Sale del registro de las
-- 24:00 de la hoja "BD Generacion", que es el corte del dia.
--
-- Tres cosas que conviene tener escritas, porque se comprobaron contra
-- la propia hoja "BD Consolidados" de PBI y no son evidentes:
--
-- 1. La hoja NO anota el consumo del dia: anota un CONTADOR acumulado.
--    El consumo del dia es la diferencia contra el cierre anterior del
--    mismo equipo. Comprobado: la diferencia del contador de diesel del
--    C18 da 513, 512, 469, 499 galones en los dias del 14 al 20 de
--    agosto, que es exactamente lo que dice "Consumo Real ACPM GAL".
--
-- 2. Lo mismo con la energia: la diferencia del contador "Kw Acumulado"
--    da los kWh del dia, y coincide al kilovatio con "Consumo Real
--    KWH/dia".
--
-- 3. Los equipos de GLP usan la MISMA columna que los de diesel, pero
--    lo que traen son metros cubicos, no galones. La hoja los cobra en
--    kilogramos: la razon entre los dos es constante, 2,19 kg por m3,
--    en todos los dias comparados. Por eso se guardan las dos cifras.
--
-- `dias_cubiertos` dice cuantos dias abarca la cifra. Normalmente 1. Si
-- un dia no quedo cerrado en la hoja, la diferencia del contador cae
-- entera en el siguiente cierre: se guarda ahi, con el numero de dias,
-- y no se reparte. Repartir seria inventarse el reparto; asi el total
-- del mes sigue siendo exacto y el dia queda senalado.
-- ------------------------------------------------------------

create table if not exists generacion_diaria (
  id uuid primary key default uuid_generate_v4(),

  id_equipo text not null
    references equipos (id_equipo) on update cascade on delete cascade,
  id_sede text not null default '',
  fecha date not null,

  -- 'diesel' o 'glp'. Decide que significa el contador de consumo.
  combustible text not null default '',

  -- Lectura del cierre, tal cual viene.
  horometro numeric,
  -- Horas operadas en el periodo: diferencia contra el cierre anterior.
  horas_dia numeric,

  kwh_dia numeric,
  diesel_gln numeric,
  glp_m3 numeric,
  glp_kg numeric,

  dias_cubiertos integer not null default 1,

  estado text not null default '',
  operador text not null default '',

  -- Vacio si la cifra es limpia; si no, dice por que hay que mirarla.
  nota text not null default '',
  origen text not null default 'hoja',
  actualizado_en timestamptz not null default now(),

  unique (id_equipo, fecha)
);

create index if not exists idx_generacion_fecha
  on generacion_diaria (fecha desc);
create index if not exists idx_generacion_equipo_fecha
  on generacion_diaria (id_equipo, fecha desc);
create index if not exists idx_generacion_combustible
  on generacion_diaria (combustible, fecha desc);

-- ------------------------------------------------------------
-- El consumo de la planta, medido en el tanque.
--
-- No es lo mismo que la suma de los equipos, y por eso va aparte.
--
-- El contador del motor dice cuanto quemo ESE equipo. El tanque dice
-- cuanto salio de la planta: incluye los equipos que no llevan contador,
-- lo que se trasiega y lo que se pierde. La cifra del tanque es siempre
-- mayor, y es la que PBI usa para pedir el proximo carrotanque.
--
-- Que son dos cosas distintas esta comprobado: la columna de diesel de
-- la pestana "BD Consolidados" es identica a la de "BD Diesel" —el
-- nivel del tanque— en 139 de 149 dias, y no a la diferencia de los
-- contadores de los motores. Confundirlas haria que la pagina discutiera
-- con la hoja todos los dias por una diferencia que es real.
-- ------------------------------------------------------------

create table if not exists consumo_planta (
  id uuid primary key default uuid_generate_v4(),
  id_sede text not null default '',
  fecha date not null,

  -- Del tanque: lo que bajo el nivel ese dia.
  diesel_gln numeric,
  nivel_tanque_gln numeric,
  entrada_gln numeric,
  dias_restantes numeric,
  alerta text not null default '',

  -- De la pestana de consolidados: lo que se factura.
  glp_kg numeric,
  kwh_glp numeric,
  kwh_diesel numeric,

  origen text not null default 'hoja',
  actualizado_en timestamptz not null default now(),

  unique (id_sede, fecha)
);

create index if not exists idx_consumo_planta_fecha
  on consumo_planta (fecha desc);

-- ------------------------------------------------------------
-- El diario de las sincronizaciones.
--
-- Sin esto, "la pagina se actualiza sola con el Excel" no se puede
-- comprobar: no habria forma de saber si la ultima corrida entro, a que
-- hora, ni por que fallo. Cada corrida deja una linea, salga bien o mal.
-- ------------------------------------------------------------

create table if not exists sincronizaciones (
  id uuid primary key default uuid_generate_v4(),
  id_hoja text not null default '',
  momento timestamptz not null default now(),
  ok boolean not null default false,

  filas_leidas integer not null default 0,
  registros integer not null default 0,
  cierres integer not null default 0,
  lecturas integer not null default 0,
  planta integer not null default 0,

  -- 'cron' o 'manual': quien la disparo.
  disparo text not null default 'manual',
  segundos numeric,
  mensaje text not null default ''
);

create index if not exists idx_sincronizaciones_momento
  on sincronizaciones (momento desc);

-- ============================================================
-- FIN
-- ============================================================
