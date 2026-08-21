import type { ReactNode } from "react";

export function Dato({
  icono,
  etiqueta,
  children,
}: {
  icono?: ReactNode;
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-[7px]">
      <div className="flex items-center gap-2 min-w-0">
        {icono ? <span className="text-[#98a2b3] shrink-0">{icono}</span> : null}
        <span className="etiqueta truncate">{etiqueta}:</span>
      </div>
      <span className="valor">{children || "—"}</span>
    </div>
  );
}

const TONOS: Record<string, string> = {
  verde: "bg-[#e7f8ee] text-[#12703a] border-[#b7e6c9]",
  ambar: "bg-[#fff5e0] text-[#9a6400] border-[#ffe0a3]",
  rojo: "bg-[#feecec] text-[#a52020] border-[#f8c9c9]",
  gris: "bg-[#f1f3f7] text-[#475467] border-[#dfe4ee]",
  azul: "bg-[#e8effc] text-[#1a3d8f] border-[#c3d4f5]",
};

export function tonoDeEstado(valor: string) {
  const v = (valor || "").toUpperCase();
  if (["OPERATIVO", "EXITOSO", "VIGENTE", "CERRADA"].includes(v)) return "verde";
  if (["EN REVISIÓN", "PARCIAL", "DESACTUALIZADO", "ABIERTA", "MEDIA"].includes(v))
    return "ambar";
  if (["FUERA DE SERVICIO", "FALLIDO", "CRÍTICA", "ALTA"].includes(v)) return "rojo";
  return "gris";
}

export function Distintivo({
  children,
  tono = "gris",
  punto = false,
  grande = false,
}: {
  children: ReactNode;
  tono?: string;
  punto?: boolean;
  grande?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold ${
        TONOS[tono] ?? TONOS.gris
      } ${grande ? "px-4 py-1.5 text-[13px]" : "px-2.5 py-1 text-[11px]"}`}
    >
      {punto ? (
        <span className="w-2 h-2 rounded-full bg-current opacity-80" />
      ) : null}
      {children}
    </span>
  );
}

export function fecha(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function hora(iso: string) {
  if (!iso || iso.length <= 10) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true })
    .replace("a. m.", "a.m.")
    .replace("p. m.", "p.m.");
}
