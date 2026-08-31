import { NextResponse } from "next/server";
import { sincronizar, correoDelRobot, idHojaConfigurada } from "@/lib/sincronizar";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";
import { ultimasSincronizaciones } from "@/lib/db";

export const dynamic = "force-dynamic";
/**
 * Traer veintiséis mil filas y encadenar mil y pico diferencias no cabe
 * en los diez segundos de una función normal.
 */
export const maxDuration = 300;

/**
 * La puerta de la sincronización con la hoja de Google.
 *
 *   GET   dice cómo va: cuándo fue la última y si entró.
 *   POST  la dispara.
 *
 * El cron de Vercel es la excepción: solo sabe pedir con GET, así que
 * cuando el que llama es él —trae la clave CRON_SECRET— el GET
 * sincroniza en vez de informar.
 *
 * Corre una vez al día, a las 6 de la mañana de Colombia (11:00 UTC en
 * `vercel.json`). Dos razones para esa hora: el cierre de las 24:00 ya
 * está anotado y cerrado, y la planta se mira a primera hora, así que
 * quien abra la página se la encuentra al día.
 *
 * Una vez al día es lo que da el plan de Vercel que tienen. No es un
 * problema mientras el botón de la pantalla esté a mano: quien acabe de
 * anotar algo en la hoja lo trae en el momento sin esperar al cron.
 *
 * Cada corrida queda anotada con quién la disparó. Conviene: si mañana
 * el cron deja de correr, el diario de `sincronizaciones` lo dice sin
 * tener que adivinarlo.
 */

/** ¿Viene del cron de Vercel y trae la clave? */
function esElCron(peticion: Request): boolean {
  const clave = (process.env.CRON_SECRET ?? "").trim();
  const cabecera = peticion.headers.get("authorization") ?? "";
  if (clave && cabecera === `Bearer ${clave}`) return true;
  // Vercel marca sus propias llamadas. Sin CRON_SECRET configurado es
  // lo único que hay, y es mejor que dejar la puerta abierta del todo.
  return !clave && peticion.headers.get("x-vercel-cron") === "1";
}

export async function GET(peticion: Request) {
  // El cron de Vercel solo sabe pedir con GET. Si llega él, no se le
  // cuenta cómo va la cosa: se corre.
  if (esElCron(peticion)) {
    const r = await sincronizar({ disparo: "cron" });
    return NextResponse.json(r, { status: r.ok ? 200 : 500 });
  }

  try {
    const [corridas, robot] = await Promise.all([
      ultimasSincronizaciones(5),
      correoDelRobot().catch(() => ""),
    ]);
    return NextResponse.json({
      hoja: idHojaConfigurada(),
      correoRobot: robot,
      corridas,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "No se pudo leer el estado",
        corridas: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(peticion: Request) {
  const delCron = esElCron(peticion);

  if (!delCron && loginConfigurado()) {
    const usuario = await usuarioActual();
    if (!puedeEditar(usuario)) {
      return NextResponse.json(
        { error: "No tienes permiso para sincronizar." },
        { status: 403 },
      );
    }
  }

  // A mano se trae siempre, aunque la hoja no se haya movido: quien
  // aprieta el botón está comprobando algo y merece la corrida entera.
  // La que dispara la pantalla sola —`?auto=1`— no fuerza: si la hoja no
  // se ha tocado se sale en un suspiro, que es lo que hace que mirarla
  // cada diez minutos no cueste nada.
  const automatica = new URL(peticion.url).searchParams.get("auto") === "1";
  const resultado = await sincronizar({
    disparo: delCron ? "cron" : "manual",
    forzar: !delCron && !automatica,
  });

  // Que la hoja no esté compartida no es un error del sistema: es algo
  // que alguien tiene que ir a hacer en Google. Se responde con 409 para
  // que la pantalla lo distinga de una caída y muestre el correo.
  const estado = resultado.ok ? 200 : resultado.correoRobot ? 409 : 500;
  return NextResponse.json(resultado, { status: estado });
}
