/**
 * ¿En qué unidad marca el contador de combustible de cada equipo?
 *
 *   npm run unidades
 *
 * No se pregunta: se mide. Un motor de esta talla gasta del orden de
 * quince a veinticinco galones por hora. Si el contador de un equipo da
 * tres veces y media eso, no es que gaste más: es que está en litros.
 *
 * Así se descubrió que el C15 marca litros y el C18 galones, y por eso
 * `lib/sincronizar.ts` lleva la tabla `CONTADOR_EN_LITROS`. Cuando
 * entren las otras cinco plantas, esto es lo primero que hay que correr
 * con sus equipos: si a alguno le sale una tasa rara, lo que hay que
 * cambiar es esa tabla, no la cifra.
 */
import { leerLibro, aFecha, aNumero } from "../lib/hoja-google.ts";
const libro = await leerLibro("15aPINwbOSnlg834sEI9S9OsRElw4CT4jRV2tXDstlc8");
const g = libro.find((h) => h.nombre === "BD Generación");

for (const eq of ["C18", "C15", "C32"]) {
  const f = g.filas.slice(1)
    .filter((r) => String(r[3] ?? "") === "24:00"
      && String(r[4] ?? "").trim().toUpperCase() === eq && aFecha(r[2] ?? null))
    .map((r) => ({ fecha: aFecha(r[2]), hor: aNumero(r[10] ?? null), c: aNumero(r[27] ?? null) }))
    .filter((x) => x.hor != null && x.hor > 1000 && x.c != null && x.c > 1000)
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

  const tasas = [];
  for (let i = 1; i < f.length; i++) {
    const dh = f[i].hor - f[i - 1].hor;
    const dc = f[i].c - f[i - 1].c;
    if (dh > 4 && dh < 60 && dc > 0 && dc < 5000) tasas.push(dc / dh);
  }
  tasas.sort((a, b) => a - b);
  const mediana = tasas.length ? tasas[Math.floor(tasas.length / 2)] : null;
  console.log(
    `${eq.padEnd(5)} ${String(tasas.length).padStart(4)} tramos · mediana ` +
    `${mediana ? mediana.toFixed(1) : "—"} unidades por hora` +
    (mediana ? `  →  si fueran litros serían ${(mediana / 3.78541).toFixed(1)} gln/h` : ""),
  );
}
