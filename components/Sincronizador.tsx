"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { contarPendientes, sincronizar } from "@/lib/pendientes";

/**
 * Barra de estado de conexión. Solo aparece cuando hay algo sin subir
 * o cuando el dispositivo se quedó sin señal — en campo eso importa
 * más que cualquier otra cosa en pantalla.
 */
export default function Sincronizador() {
  const router = useRouter();
  const [pendientes, setPendientes] = useState(0);
  const [enLinea, setEnLinea] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    setPendientes(contarPendientes());
    setEnLinea(navigator.onLine);

    const refrescar = () => setPendientes(contarPendientes());
    window.addEventListener("pbi:pendientes", refrescar);

    const alConectar = async () => {
      setEnLinea(true);
      if (contarPendientes() === 0) return;
      setSubiendo(true);
      const subidos = await sincronizar();
      setSubiendo(false);
      setPendientes(contarPendientes());
      if (subidos > 0) router.refresh();
    };
    const alDesconectar = () => setEnLinea(false);

    window.addEventListener("online", alConectar);
    window.addEventListener("offline", alDesconectar);
    if (navigator.onLine) void alConectar();

    return () => {
      window.removeEventListener("pbi:pendientes", refrescar);
      window.removeEventListener("online", alConectar);
      window.removeEventListener("offline", alDesconectar);
    };
  }, [router]);

  if (enLinea && pendientes === 0) return null;

  const sinSenal = !enLinea;

  return (
    <div className="no-imprimir fixed bottom-0 inset-x-0 z-50">
      <div
        className="max-w-[640px] mx-auto m-3 rounded border px-4 py-3 flex items-center gap-3"
        style={
          sinSenal
            ? {
                background: "var(--color-consola)",
                borderColor: "var(--color-consola-borde)",
                color: "var(--color-consola-tinta)",
              }
            : {
                background: "var(--color-panel)",
                borderColor: "var(--color-pendiente)",
                color: "var(--color-tinta)",
              }
        }
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            background: sinSenal
              ? "var(--color-critico)"
              : "var(--color-pendiente)",
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wide opacity-70">
            {sinSenal ? "Sin conexión" : "Pendiente de subir"}
          </div>
          <div className="text-[12.5px] mt-0.5">
            {sinSenal
              ? "Puedes seguir registrando: todo queda guardado en este equipo."
              : subiendo
                ? "Subiendo registros guardados…"
                : `${pendientes} registro${pendientes === 1 ? "" : "s"} esperando señal.`}
          </div>
        </div>
        {!sinSenal && !subiendo && pendientes > 0 ? (
          <button
            onClick={async () => {
              setSubiendo(true);
              await sincronizar();
              setSubiendo(false);
              setPendientes(contarPendientes());
              router.refresh();
            }}
            className="shrink-0 rounded px-3 py-1.5 font-[family-name:var(--font-mono)] text-[11px]"
            style={{ background: "var(--color-accion)", color: "#151109" }}
          >
            SUBIR
          </button>
        ) : null}
      </div>
    </div>
  );
}
