-- ============================================================
-- MIGRACION 12 — Consumibles: existencias, consumo y desgaste
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- Se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- Tres tablas, porque son tres preguntas distintas.
--
--   consumibles    -> que cosas se manejan y cada cuanto se cambian
--   movimientos    -> cuanto entro y cuanto salio  (existencias)
--   instalaciones  -> que hay puesto en cada equipo (desgaste)
--
-- La existencia NO se guarda como un numero. Se calcula sumando el
-- libro de movimientos. Un numero guardado se corrige a mano cuando
-- alguien ve que no cuadra, y a partir de ahi ya nadie sabe cual era el
-- bueno; un libro dice ademas por que cambio.
-- ------------------------------------------------------------

create table if not exists consumibles (
  id_consumible text primary key,          -- 'CN-0001'
  nombre text not null,
  -- Para agrupar y para saber que se le pide a cada uno.
  tipo text not null default 'otro'
    check (tipo in ('aceite','filtro','refrigerante','correa','bujia',
                    'bateria','grasa','repuesto','otro')),
  -- Referencia del fabricante. Es lo que se pide al proveedor.
  referencia text not null default '',
  marca text not null default '',
  -- 'unidad', 'L', 'kg', 'galon'.
  unidad text not null default 'unidad',

  -- Periodicidad: cada cuantas horas de operacion se cambia. De aqui
  -- sale el desgaste de lo que esta puesto.
  vida_util_horas numeric check (vida_util_horas is null or vida_util_horas > 0),
  -- Cuando avisar de que queda poco.
  stock_minimo numeric not null default 0 check (stock_minimo >= 0),

  observaciones text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- El libro de existencias.
--
-- `cantidad` siempre positiva; el signo lo pone el tipo. Un ajuste es
-- para cuando el conteo fisico no cuadra: se anota la diferencia y por
-- que, en vez de reescribir el saldo.
-- ------------------------------------------------------------

create table if not exists movimientos_consumible (
  id uuid primary key default uuid_generate_v4(),
  id_consumible text not null
    references consumibles (id_consumible) on update cascade on delete cascade,

  tipo text not null check (tipo in ('entrada','salida','ajuste')),
  cantidad numeric not null check (cantidad > 0),
  -- En un ajuste dice si suma o resta. En los demas se ignora.
  signo smallint not null default 1 check (signo in (1, -1)),

  fecha date not null default current_date,
  -- A que equipo se fue, cuando es una salida.
  id_equipo text
    references equipos (id_equipo) on update cascade on delete set null,
  id_intervencion text
    references intervenciones (id_intervencion) on update cascade on delete set null,

  motivo text not null default '',
  registrado_por text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_movimientos_consumible
  on movimientos_consumible (id_consumible, fecha desc);
create index if not exists idx_movimientos_equipo
  on movimientos_consumible (id_equipo, fecha desc)
  where id_equipo is not null;

-- ------------------------------------------------------------
-- Lo que esta puesto en cada equipo.
--
-- Una fila por cada vez que se instala algo. Se cierra —`retirado_en`—
-- cuando se cambia, y entonces queda cuanto duro de verdad: la
-- diferencia de horometros. Eso es lo que despues permite comparar la
-- vida util del fabricante con la que da en campo.
-- ------------------------------------------------------------

create table if not exists instalaciones_consumible (
  id uuid primary key default uuid_generate_v4(),
  id_equipo text not null
    references equipos (id_equipo) on update cascade on delete cascade,
  id_consumible text not null
    references consumibles (id_consumible) on update cascade on delete cascade,

  cantidad numeric not null default 1 check (cantidad > 0),
  instalado_en date not null default current_date,
  -- El horometro al instalar. Sin el no hay desgaste que calcular.
  horometro_instalacion numeric,

  retirado_en date,
  horometro_retiro numeric,
  motivo_retiro text not null default '',

  id_intervencion text
    references intervenciones (id_intervencion) on update cascade on delete set null,
  registrado_por text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lo puesto hoy en un equipo es lo que no tiene fecha de retiro.
create index if not exists idx_instalaciones_equipo_activas
  on instalaciones_consumible (id_equipo)
  where retirado_en is null;
create index if not exists idx_instalaciones_consumible
  on instalaciones_consumible (id_consumible, instalado_en desc);

drop trigger if exists trg_consumibles_updated_at on consumibles;
create trigger trg_consumibles_updated_at
  before update on consumibles
  for each row execute function set_updated_at();

drop trigger if exists trg_instalaciones_updated_at on instalaciones_consumible;
create trigger trg_instalaciones_updated_at
  before update on instalaciones_consumible
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- Las existencias, calculadas.
--
-- Una vista y no una columna: siempre cuadra con el libro porque es el
-- libro. Se consulta como una tabla mas.
-- ------------------------------------------------------------

create or replace view existencias_consumible as
select c.id_consumible,
       coalesce(sum(
         case m.tipo
           when 'entrada' then m.cantidad
           when 'salida'  then -m.cantidad
           when 'ajuste'  then m.cantidad * m.signo
         end
       ), 0) as existencia
  from consumibles c
  left join movimientos_consumible m using (id_consumible)
 group by c.id_consumible;

-- ============================================================
-- FIN
-- ============================================================
