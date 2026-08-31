import { createClient } from "@supabase/supabase-js";
import { motorDeDatos } from "./db";

/**
 * Diagnóstico de la base de datos, sin escribir nada.
 *
 * Está aquí y no dentro de la ruta de API porque la pantalla de
 * administración lo necesita en el propio servidor. Antes se pedía a sí
 * misma por HTTP, y una petición del servidor a su propia API no lleva
 * la sesión: en cuanto la ruta exigió permiso, la pantalla se quedaba
 * sin poder leer su propio estado.
 */

export type EstadoDatos = {
  motor: "supabase" | "archivo";
  conectado: boolean;
  problema?: string;
  conteos?: Record<string, number>;
};

const TABLAS = ["sedes", "equipos", "controladores", "intervenciones"];

export async function estadoDatos(): Promise<EstadoDatos> {
  const motor = motorDeDatos();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const llave = process.env.SUPABASE_SERVICE_KEY?.trim();

  if (motor === "archivo") {
    return {
      motor,
      conectado: false,
      problema: !url
        ? "Falta NEXT_PUBLIC_SUPABASE_URL en .env.local"
        : !llave
          ? "Falta SUPABASE_SERVICE_KEY en .env.local"
          : "Supabase no está configurado",
    };
  }

  try {
    const db = createClient(url!, llave!, { auth: { persistSession: false } });
    const conteos: Record<string, number> = {};
    for (const tabla of TABLAS) {
      const { count, error } = await db
        .from(tabla)
        .select("*", { count: "exact", head: true });
      if (error) throw new Error(`${tabla}: ${error.message}`);
      conteos[tabla] = count ?? 0;
    }
    return { motor, conectado: true, conteos };
  } catch (e) {
    return {
      motor,
      conectado: false,
      problema:
        e instanceof Error ? e.message : "No se pudo consultar la base de datos",
    };
  }
}
