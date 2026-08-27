-- ============================================================
-- MIGRACION 13 — Adiciones de aceite
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- Se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- El consumo de aceite, con las columnas de su propia hoja.
--
-- Es el formato que ya llevan en "Consumo de aceites de los generadores
-- de PBI.xlsx": fecha, marca, modelo, tag, horometro, nombre del
-- aceite, cantidad en galones y si fue cambio o reposicion.
--
-- Una adicion de aceite no es una intervencion. Se hace mucho mas
-- seguido —cada pocos dias— y no lleva acta, ni firma, ni fotos: es
-- una linea. Por eso va aparte y con su propio boton, en vez de
-- obligar a abrir una hoja de cinco secciones para anotar tres galones.
--
-- La marca, el modelo y el tag se copian del equipo al registrar, no se
-- leen despues por relacion: es la foto de como se llamaba ese dia, y
-- ademas es lo que hace que la tabla se pueda leer sola.
--
-- Lo que en la hoja son las columnas "ultimo consumo" y "consumo medio"
-- no se guardan: se calculan. En la hoja estan vacias de numeros y en
-- su lugar alguien apunta a mano "stock 25", que es otra cosa —lo que
-- queda en la caneca— y va a `observacion`.
-- ------------------------------------------------------------

create table if not exists adiciones_aceite (
  id_adicion text primary key,             -- 'AC-2026-0001'

  id_equipo text not null
    references equipos (id_equipo) on update cascade on delete cascade,
  id_sede text not null default '',

  fecha date not null,

  -- Copia fiel del equipo al momento de la adicion.
  marca text not null default '',
  modelo text not null default '',
  tag text not null default '',

  horometro numeric check (horometro is null or horometro >= 0),

  nombre_aceite text not null default '',
  -- En galones, como en su hoja.
  cantidad_gln numeric not null check (cantidad_gln > 0),
  -- Un cambio vacia y llena; una reposicion solo completa nivel. La
  -- diferencia importa: el consumo solo tiene sentido entre
  -- reposiciones.
  operacion text not null default 'reposicion'
    check (operacion in ('cambio', 'reposicion')),

  -- Donde va el "stock 25" que hoy se apunta a mano.
  observacion text not null default '',

  -- Si el aceite esta en el catalogo, para descontar de bodega.
  id_consumible text
    references consumibles (id_consumible) on update cascade on delete set null,
  id_intervencion text
    references intervenciones (id_intervencion) on update cascade on delete set null,

  registrado_por text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Se consulta siempre por equipo y en orden de fecha: es como se lee
-- una hoja de consumo.
create index if not exists idx_aceite_equipo_fecha
  on adiciones_aceite (id_equipo, fecha, horometro);
create index if not exists idx_aceite_fecha
  on adiciones_aceite (fecha desc);

drop trigger if exists trg_aceite_updated_at on adiciones_aceite;
create trigger trg_aceite_updated_at
  before update on adiciones_aceite
  for each row execute function set_updated_at();

-- ============================================================
-- FIN
-- ============================================================
