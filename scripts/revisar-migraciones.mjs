/**
 * Que migraciones estan puestas en la base y cuales faltan.
 *
 *   node scripts/revisar-migraciones.mjs
 *
 * Existe porque no habia forma de saberlo sin abrir Supabase y mirar
 * tabla por tabla, y acabas ejecutando dos veces la misma migracion sin
 * estar seguro. Aqui se pregunta a la base y se responde.
 *
 * Solo lee: pide una fila de cada tabla pidiendo la columna que
 * introduce cada migracion. Si la columna o la tabla no existe,
 * PostgREST responde con un error que dice cual falta. No escribe nada.
 */
import { readFile } from "node:fs/promises";

const env = await readFile(".env.local", "utf8");
const dame = (k) =>
  env.split(/\r?\n/).find((l) => l.startsWith(k + "="))?.slice(k.length + 1).trim();

const URL_BASE = dame("NEXT_PUBLIC_SUPABASE_URL");
const LLAVE = dame("SUPABASE_SERVICE_KEY");

if (!URL_BASE || !LLAVE) {
  console.log("No hay credenciales de Supabase en .env.local");
  process.exit(1);
}

const COMPROBACIONES = [
  { n: "01", que: "Campos de la ficha", tabla: "equipos", columna: "frecuencia_mto" },
  { n: "02", que: "Checklist del acta", tabla: "intervenciones", columna: "checklist" },
  { n: "03a", que: "Tipo de activo", tabla: "equipos", columna: "tipo_activo" },
  { n: "03b", que: "Programa de mantenimiento", tabla: "programa_mantenimiento", columna: "id_equipo" },
  { n: "04", que: "Indicadores mensuales", tabla: "indicadores_mensuales", columna: "horas_operacion" },
  { n: "05", que: "Horometro mensual", tabla: "indicadores_mensuales", columna: "horometro" },
  { n: "06", que: "Cargo del tecnico", tabla: "intervenciones", columna: "tecnico_cargo" },
  { n: "07", que: "Correccion de actas", tabla: "intervenciones", columna: "editada_en" },
  { n: "08", que: "Reportes de falla", tabla: "reportes_falla", columna: "fecha_evento" },
  { n: "09", que: "Diagnostico y repuestos", tabla: "intervenciones", columna: "causa_falla" },
  { n: "10", que: "Sincronismo", tabla: "equipos", columna: "grupo_sincronismo" },
  { n: "11", que: "Lecturas de horometro", tabla: "lecturas_horometro", columna: "horometro" },
  { n: "12", que: "Consumibles", tabla: "consumibles", columna: "vida_util_horas" },
  { n: "13", que: "Consumo de aceite", tabla: "adiciones_aceite", columna: "cantidad_gln" },
  { n: "14", que: "Registro horario de operacion", tabla: "registros_operacion", columna: "kw_real" },
  { n: "15a", que: "Generacion diaria", tabla: "generacion_diaria", columna: "kwh_dia" },
  { n: "15b", que: "Consumo de la planta", tabla: "consumo_planta", columna: "nivel_tanque_gln" },
  { n: "15c", que: "Diario de sincronizaciones", tabla: "sincronizaciones", columna: "cierres" },
  { n: "16", que: "Quien registro el acta", tabla: "intervenciones", columna: "registrado_por" },
];

const cabeceras = {
  apikey: LLAVE,
  Authorization: `Bearer ${LLAVE}`,
  Accept: "application/json",
};

const faltan = [];

for (const c of COMPROBACIONES) {
  const u = `${URL_BASE}/rest/v1/${c.tabla}?select=${c.columna}&limit=1`;
  const r = await fetch(u, { headers: cabeceras });
  if (r.ok) {
    console.log(`  ${c.n}  OK        ${c.que}`);
    continue;
  }
  const cuerpo = await r.json().catch(() => ({}));
  const codigo = cuerpo.code ?? r.status;
  const falta =
    codigo === "42P01" || codigo === "PGRST205"
      ? `falta la tabla ${c.tabla}`
      : codigo === "42703" || codigo === "PGRST204" || codigo === "PGRST100"
        ? `falta la columna ${c.tabla}.${c.columna}`
        : `${codigo}: ${cuerpo.message ?? ""}`;
  console.log(`  ${c.n}  FALTA     ${c.que}  ->  ${falta}`);
  faltan.push(c.n);
}

console.log("");
if (faltan.length) {
  console.log(`Pendientes: ${faltan.join(", ")}`);
  console.log("");
  console.log("Abre el archivo migracion-NN-*.sql que corresponda, copia todo");
  console.log("y pegalo en Supabase -> SQL Editor -> New query -> Run.");
  console.log("Todas se pueden ejecutar varias veces sin romper nada.");
} else {
  console.log("Todo aplicado. No hay nada pendiente en Supabase.");
}
