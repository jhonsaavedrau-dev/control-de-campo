-- ============================================================
-- MIGRACION 16 — Quien registro el acta
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- Se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- El tecnico que intervino y la persona que digito el acta no
-- siempre son la misma, y mientras el equipo aprende a usar el
-- sistema casi nunca lo son: quien lidera el proyecto registra las
-- intervenciones de sus companeros a nombre de ellos.
--
-- Eso tiene que poder hacerse: obligar a que cada quien entre con su
-- cuenta el primer dia es la forma mas rapida de que nadie use el
-- sistema y se vuelva al papel.
--
-- Pero el acta se firma, y la firma digital se busca POR EL NOMBRE del
-- tecnico. Si el nombre es texto libre y ademas no queda constancia de
-- quien lo escribio, el documento no tiene como responder "¿quien
-- registro esto?" — y esa es justo la pregunta de una auditoria.
--
-- Esta columna es la respuesta. No cambia nada de lo que el acta dice
-- ni de a quien senala como ejecutante: solo anota, al lado, la cuenta
-- desde la que se guardo.
--
-- Queda vacia en las actas anteriores. No se rellena a posteriori: no
-- sabemos quien digito cada una, y adivinarlo seria peor que dejarlo
-- en blanco.
-- ------------------------------------------------------------

alter table intervenciones
  add column if not exists registrado_por text not null default '';

comment on column intervenciones.registrado_por is
  'Cuenta desde la que se guardo el acta. Puede no coincidir con '
  'tecnico_nombre: mientras el equipo aprende, una persona registra '
  'las intervenciones de sus companeros. Vacio en las actas '
  'anteriores a septiembre de 2026, cuando la columna no existia.';

-- Los reportes de falla ya tenian su equivalente, creado_por: alli
-- esta resuelto desde el principio.

-- ============================================================
-- FIN
-- ============================================================
