import type { ReactNode } from "react";
import {
  ETIQUETA_ESTADO, ETIQUETA_RESULTADO, ABREVIATURA_RESULTADO,
  semaforo, semaforoResultado,
} from "@/lib/tipos";
import type { EstadoEquipo, ResultadoIntervencion } from "@/lib/tipos";

/** Rótulo de sección con la línea que continúa hasta el borde. */
export function Rotulo({ children }: { children: ReactNode }) {
  return <div className="rotulo">{children}</div>;
}

/** Rejilla de datos técnicos: valores en monoespaciada, como una lectura. */
export function Datos({
  children,
  columnas = 2,
}: {
  children: ReactNode;
  columnas?: 1 | 2;
}) {
  return <div className={columnas === 1 ? "datos datos-1" : "datos"}>{children}</div>;
}

export function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: ReactNode;
}) {
  const vacio =
    children === null || children === undefined || children === "" || children === "—";
  return (
    <div className="dato">
      <div className="dato-etiqueta">{etiqueta}</div>
      <div
        className="dato-valor"
        style={vacio ? { color: "var(--color-sin-info)" } : undefined}
      >
        {vacio ? "—" : children}
      </div>
    </div>
  );
}

/** LED de estado: el mismo lenguaje visual del controlador físico. */
export function Led({ estado }: { estado: EstadoEquipo }) {
  const s = semaforo(estado);
  const color = {
    operativo: "var(--color-operativo)",
    pendiente: "var(--color-pendiente)",
    critico: "var(--color-critico)",
    "sin-info": "var(--color-sin-info)",
  }[s];

  return (
    <div className="flex items-center gap-1.5 shrink-0 pt-1">
      <span
        className="w-[7px] h-[7px] rounded-full shrink-0"
        style={{ background: color }}
      />
      <span className="font-[family-name:var(--font-mono)] text-[11px]">
        {ETIQUETA_ESTADO[estado]}
      </span>
    </div>
  );
}

export function Insignia({
  tono,
  children,
}: {
  tono: "operativo" | "pendiente" | "critico" | "sin-info";
  children: ReactNode;
}) {
  const clase =
    tono === "sin-info" ? "insignia" : `insignia insignia-${tono}`;
  return <span className={clase}>{children}</span>;
}

export function InsigniaResultado({
  resultado,
}: {
  resultado: ResultadoIntervencion | null;
}) {
  if (!resultado) return <Insignia tono="sin-info">—</Insignia>;
  return (
    <Insignia tono={semaforoResultado(resultado)}>
      {ABREVIATURA_RESULTADO[resultado]}
    </Insignia>
  );
}

export function claseBordePlaca(estado: EstadoEquipo) {
  const s = semaforo(estado);
  return s === "sin-info" ? "placa" : `placa placa-${s}`;
}

/* ---------- Formato ---------- */

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

/** "14 AGO" — el formato compacto de la bitácora. */
export function fechaCorta(iso: string) {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return iso;
  return `${String(d).padStart(2, "0")} ${MESES[m - 1]}`;
}

export function fechaLarga(iso: string) {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${a}`;
}

/** Números con espacio como separador de miles: 14 208.3 */
export function numero(valor: number | null, sufijo = "") {
  if (valor === null || valor === undefined) return "";
  const [entero, decimal] = String(valor).split(".");
  const conEspacios = entero.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${conEspacios}${decimal ? `.${decimal}` : ""}${sufijo}`;
}

export { ETIQUETA_ESTADO, ETIQUETA_RESULTADO };
