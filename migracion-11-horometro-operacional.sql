-- ============================================================
-- MIGRACION 11 — Lecturas de horometro (data operacional)
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- Se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- El horometro deja de escribirse a mano.
--
-- El calculo de "cuantas horas faltan para el preventivo" ya existia y
-- estaba bien: frecuencia menos las horas corridas desde el ultimo
-- preventivo. El problema era de donde salia el horometro actual —de
-- que alguien lo escribiera en la ficha— y por eso envejecia.
--
-- Aqui se guarda cada lectura con su momento. De dos lecturas
-- consecutivas salen las horas operadas en ese tramo, y de ahi el ritmo
-- real del equipo: cuantas horas al dia trabaja. Con ese ritmo, "faltan
-- 120 horas" se convierte en una fecha.
--
-- Las lecturas se guardan todas, no se pisan: una serie de lecturas es
-- el historial operacional del equipo y es el dato que despues permite
-- ver oscilaciones y comparar meses.
-- ------------------------------------------------------------

create table if not exists lecturas_horometro (
  id uuid primary key default uuid_generate_v4(),

  id_equipo text not null
    references equipos (id_equipo) on update cascade on delete cascade,

  -- Cuando se tomo la lectura, no cuando se digito.
  momento timestamptz not null default now(),
  horometro numeric not null check (horometro >= 0),

  -- De donde vino: la ficha, un acta, el cierre de mes o una carga.
  origen text not null default 'manual'
    check (origen in ('manual', 'acta', 'indicador', 'importado')),

  -- Lo que la ata a su origen, para poder rehacer o corregir.
  id_intervencion text
    references intervenciones (id_intervencion) on update cascade on delete set null,

  registrado_por text not null default '',
  created_at timestamptz not null default now(),

  -- Dos lecturas del mismo equipo en el mismo instante son la misma
  -- lectura digitada dos veces.
  unique (id_equipo, momento)
);

create index if not exists idx_lecturas_equipo_momento
  on lecturas_horometro (id_equipo, momento desc);

-- ------------------------------------------------------------
-- El horometro de la ficha se pone al dia solo.
--
-- Va en un disparador y no en el codigo a proposito: asi da igual quien
-- escriba la lectura —la pantalla, un acta, una carga masiva o alguien
-- desde el propio Supabase—, la ficha queda siempre coherente. Es la
-- unica forma de que "evitar actualizaciones manuales" sea cierto y no
-- dependa de acordarse.
--
-- Solo hacia adelante: una lectura vieja que se digita tarde no debe
-- hacer retroceder el horometro de la ficha.
-- ------------------------------------------------------------

create or replace function sincronizar_horometro_equipo()
returns trigger
language plpgsql
as $$
begin
  update equipos
     set horometro_actual = new.horometro
   where id_equipo = new.id_equipo
     and (horometro_actual is null or new.horometro >= horometro_actual);
  return new;
end;
$$;

drop trigger if exists trg_lectura_sincroniza_equipo on lecturas_horometro;
create trigger trg_lectura_sincroniza_equipo
  after insert on lecturas_horometro
  for each row execute function sincronizar_horometro_equipo();

-- ------------------------------------------------------------
-- Siembra: lo que ya se sabe hoy no se pierde.
--
-- Cada equipo con horometro en la ficha entra como su primera lectura,
-- para que la serie no empiece vacia. Se marca como importada y solo se
-- hace si el equipo todavia no tiene ninguna.
-- ------------------------------------------------------------

insert into lecturas_horometro (id_equipo, momento, horometro, origen, registrado_por)
select e.id_equipo, coalesce(e.updated_at, now()), e.horometro_actual,
       'importado', 'migracion 11'
  from equipos e
 where e.horometro_actual is not null
   and not exists (
     select 1 from lecturas_horometro l where l.id_equipo = e.id_equipo
   );

-- ============================================================
-- FIN
-- ============================================================
